<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\SMSService;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SendPaymentReminders extends Command
{
    protected $signature = 'payment:send-reminders';
    protected $description = 'Send SMS reminders for pending payments on the 1st and 15th of each month';

    protected $smsService;

    public function __construct(SMSService $smsService)
    {
        parent::__construct();
        $this->smsService = $smsService;
    }

    public function handle()
    {
        $today = Carbon::now();
        $currentYear = $today->year;
        $currentMonth = $today->month;
        $currentDay = $today->day;

        // Only run on 1st or 15th of the month
        if (!in_array($currentDay, [1, 15])) {
            $this->info("Today is not a reminder day. Skipping...");
            return;
        }

        $this->info("Running payment reminders for {$today->format('Y-m-d')}");

        // Get all students with approved registrations for current year
        $students = DB::table('registration')
            ->join('student', 'registration.studentId', '=', 'student.studentId')
            ->leftJoin('payment', function($join) use ($currentYear, $currentMonth) {
                $join->on('registration.registrationId', '=', 'payment.registrationId')
                    ->whereRaw('JSON_EXTRACT(payment.remark, "$.year") = ?', [$currentYear])
                    ->whereRaw('JSON_EXTRACT(payment.remark, "$.month") = ?', [$currentMonth]);
            })
            ->where('registration.status', 'Approved')
            ->where('registration.enrollmentYear', $currentYear)
            ->select(
                'student.studentId',
                'student.name as studentName',
                'student.phone',
                'registration.registrationId',
                'registration.monthlyFee',
                'payment.paymentStatus'
            )
            ->get();

        $remindersSent = 0;
        $errors = 0;
        $skipped = 0;

        foreach ($students as $student) {
            // Skip if already paid
            if ($student->paymentStatus === 'Paid') {
                $skipped++;
                continue;
            }

            // Skip if no phone number
            if (!$student->phone) {
                $this->warn("No phone number for student: {$student->studentName}");
                $skipped++;
                continue;
            }

            // Create message based on day of month
            $monthName = date('F', mktime(0, 0, 0, $currentMonth, 1));
            
            if ($currentDay == 1) {
                $message = "REMINDER: Your tuition fee for {$monthName} {$currentYear} of RM" . 
                           number_format($student->monthlyFee, 2) . 
                           " is now due. Please login to make payment. Thank you.";
            } else {
                $message = "URGENT REMINDER: Your tuition fee for {$monthName} {$currentYear} of RM" . 
                           number_format($student->monthlyFee, 2) . 
                           " is 15 days overdue. Please settle immediately to avoid interruption.";
            }

            // Send SMS
            if ($this->smsService->sendSms($student->phone, $message)) {
                $remindersSent++;
                $this->info("✓ Reminder sent to: {$student->studentName} ({$student->phone})");
                
                // Log the reminder
                DB::table('payment_reminder_logs')->insert([
                    'studentId' => $student->studentId,
                    'registrationId' => $student->registrationId,
                    'phone' => $student->phone,
                    'message' => $message,
                    'reminder_date' => $today,
                    'reminder_type' => $currentDay == 1 ? 'first_day' : 'fifteenth_day',
                    'created_at' => now()
                ]);
            } else {
                $errors++;
                $this->error("✗ Failed to send to: {$student->studentName}");
            }
        }

        $this->info("\n=== Summary ===");
        $this->info("Reminders sent: {$remindersSent}");
        $this->info("Skipped (already paid or no phone): {$skipped}");
        $this->info("Errors: {$errors}");
        $this->info("Total students processed: {$students->count()}");
    }
}
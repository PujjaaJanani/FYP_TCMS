<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Services\SMSService;
use App\Mail\PaymentReminderMail;
use Carbon\Carbon;

class SendParentPaymentReminders extends Command
{
    protected $signature = 'payment:send-parent-reminders
                            {--type= : Reminder type (first_day or fifteenth_day)}
                            {--dry-run : Test mode - don\'t actually send messages}';

    protected $description = 'Send payment reminders to parents via SMS (Twilio) and Email on 1st and 15th of each month';

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
        $isDryRun = $this->option('dry-run');
        $reminderType = $this->option('type') ?? ($today->day == 1 ? 'first_day' : 'fifteenth_day');

        $this->info("==========================================");
        $this->info("Sending {$reminderType} payment reminders");
        $this->info("Date: " . $today->format('F j, Y'));
        $this->info("==========================================");

        // Get all unique parents with children enrolled for current year
        $parents = DB::table('student')
            ->whereNotNull('parentEmail')
            ->where('parentEmail', '!=', '')
            ->select('parentEmail', 'phone')
            ->distinct()
            ->get();

        if ($parents->isEmpty()) {
            $this->warn("No parents found with email addresses.");
            return;
        }

        $this->info("Found " . $parents->count() . " parents to check.");

        $sentCount = 0;
        $errorCount = 0;
        $skippedCount = 0;

        foreach ($parents as $parent) {
            // Get all children for this parent with approved registration for current year
            $children = DB::table('student')
                ->join('registration', 'student.studentId', '=', 'registration.studentId')
                ->where('student.parentEmail', $parent->parentEmail)
                ->where('registration.status', 'Approved')
                ->where('registration.enrollmentYear', $currentYear)
                ->select(
                    'student.studentId',
                    'student.name as studentName',
                    'student.phone',
                    'registration.registrationId',
                    'registration.monthlyFee'
                )
                ->get();

            if ($children->isEmpty()) {
                continue;
            }

            // Check which children haven't paid for current month
            $pendingChildren = [];
            $totalFee = 0;

            foreach ($children as $child) {
                $isPaid = DB::table('payment')
                    ->where('registrationId', $child->registrationId)
                    ->where('academicYear', $currentYear)
                    ->where('paymentStatus', 'Paid')
                    ->whereRaw('JSON_EXTRACT(remark, "$.month") = ?', [$currentMonth])
                    ->exists();

                if (!$isPaid) {
                    $pendingChildren[] = $child;
                    $totalFee += $child->monthlyFee;
                }
            }

            if (empty($pendingChildren)) {
                $this->line("✓ All payments paid for parent: {$parent->parentEmail}");
                $skippedCount++;
                continue;
            }

            // Check if reminder already sent for this period
            $reminderSent = DB::table('payment_reminder_logs')
                ->where('reminder_type', $reminderType)
                ->where('parent_email', $parent->parentEmail)
                ->whereYear('reminder_date', $today->year)
                ->whereMonth('reminder_date', $today->month)
                ->exists();

            if ($reminderSent) {
                $this->line("⚠ Reminder already sent to: {$parent->parentEmail}");
                $skippedCount++;
                continue;
            }

            // Prepare due date message
            $monthName = $today->format('F'); // e.g., "May"
            $dueMonth = $monthName . ' ' . $currentYear; // e.g., "May 2026"

            // Convert array to collection for pluck() method
            $pendingChildrenCollection = collect($pendingChildren);


            // Build children names string
            $childrenNames = $pendingChildrenCollection->pluck('studentName')->implode(', ');
            $childCount = $pendingChildrenCollection->count();

            $childText = $childCount > 1 ? 'children' : 'child';

            // SMS message (shorter for SMS)
            $smsMessage = "Dear Parent, tuition fee for {$childrenNames} (RM{$totalFee}) is due for {$dueMonth}. Please login to pay. - Hari's Tuition Center";

            // Send SMS
            $smsSent = false;
            $parentPhone = $pendingChildrenCollection->first()->phone ?? $parent->phone ?? null;

            if ($parentPhone && !$isDryRun) {
                $smsSent = $this->smsService->sendSms($parentPhone, $smsMessage);
                if ($smsSent) {
                    $this->info("✓ SMS sent to: {$parentPhone}");
                } else {
                    $this->error("✗ SMS failed for: {$parentPhone}");
                }
            } elseif (!$parentPhone) {
                $this->warn("⚠ No phone number for parent: {$parent->parentEmail}");
            }

            // Send Email
            $emailSent = false;
            if (!$isDryRun) {
                try {
                    Mail::to($parent->parentEmail)->send(new PaymentReminderMail(
                        $childrenNames,
                        $totalFee,
                        $dueMonth,
                        $childCount
                    ));
                    $emailSent = true;
                    $this->info("✓ Email sent to: {$parent->parentEmail}");
                } catch (\Exception $e) {
                    Log::error('Email sending failed', [
                        'email' => $parent->parentEmail,
                        'error' => $e->getMessage()
                    ]);
                    $this->error("✗ Email failed for: {$parent->parentEmail} - " . $e->getMessage());
                }
            } else {
                $this->line("[DRY RUN] Would send email to: {$parent->parentEmail}");
                $this->line("[DRY RUN] Would send SMS to: {$parentPhone}");
                $emailSent = true;
                $smsSent = true;
            }

            // Log the reminder
            if (!$isDryRun) {
                DB::table('payment_reminder_logs')->insert([
                    'studentId' => $pendingChildrenCollection->first()->studentId,
                    'registrationId' => $pendingChildrenCollection->first()->registrationId,
                    'parent_email' => $parent->parentEmail,
                    'phone' => $parentPhone ?? '',
                    'message' => $smsMessage,
                    'reminder_date' => now(),
                    'reminder_type' => $reminderType,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }

            if ($smsSent || $emailSent) {
                $sentCount++;
            } else {
                $errorCount++;
            }
        }

        $this->info("==========================================");
        $this->info("Summary:");
        $this->info("  - Reminders sent: {$sentCount}");
        $this->info("  - Skipped (already paid/no reminder): {$skippedCount}");
        $this->info("  - Failed: {$errorCount}");
        $this->info("==========================================");

        Log::info("Parent payment reminders sent", [
            'type' => $reminderType,
            'sent' => $sentCount,
            'skipped' => $skippedCount,
            'failed' => $errorCount
        ]);
    }
}
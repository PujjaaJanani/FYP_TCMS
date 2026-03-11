<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class PaymentController extends Controller
{
    /**
     * Get payment history for a student (current year)
     */
    public function getStudentPayments(Request $request)
    {
        try {
            $user = $request->user();
            $studentId = $user->getKey();
            
            $year = $request->query('year', date('Y'));
            
            $registration = DB::table('registration')
                ->where('studentId', $studentId)
                ->where('status', 'Approved')
                ->first();
            
            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'No approved registration found'
                ], 404);
            }
            
            $monthlyFee = $registration->monthlyFee ?? 200.00;
            
            // Get all PAID payments
            $payments = Payment::where('registrationId', $registration->registrationId)
                ->where('paymentStatus', 'Paid')
                ->get();
            
            $paidMonths = [];
            foreach ($payments as $payment) {
                $remark = json_decode($payment->remark, true);
                $paymentMonth = $remark['month'] ?? null;
                $paymentYear = $remark['year'] ?? null;
                
                if ($paymentYear == $year && $paymentMonth) {
                    $paidMonths[$paymentMonth] = $payment;
                }
            }
            
            $monthsData = [];
            for ($month = 1; $month <= 12; $month++) {
                $payment = isset($paidMonths[$month]) ? $paidMonths[$month] : null;
                
                $monthsData[] = [
                    'month' => $month,
                    'monthName' => date('F', mktime(0, 0, 0, $month, 1)),
                    'year' => (int)$year,
                    'amount' => $monthlyFee,
                    'status' => $payment ? 'Paid' : 'Pending',
                    'paymentId' => $payment ? $payment->paymentId : null,
                    'datePaid' => $payment ? date('Y-m-d', strtotime($payment->datePaid)) : null,
                    'method' => $payment ? $payment->method : null,
                    'transactionId' => $payment ? $payment->transactionId : null
                ];
            }
            
            return response()->json([
                'success' => true,
                'data' => [
                    'year' => (int)$year,
                    'monthlyFee' => $monthlyFee,
                    'payments' => $monthsData
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('getStudentPayments failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payments'
            ], 500);
        }
    }

    /**
     * Create Toyyibpay Bill
     */
    public function createPaymentIntent(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'month' => 'required|integer|min:1|max:12',
            'year' => 'required|integer|min:2024',
            'amount' => 'required|numeric|min:0'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $user = $request->user();
            $studentId = $user->getKey();

            $student = DB::table('student')->where('studentId', $studentId)->first();
            
            if (!$student) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student not found'
                ], 404);
            }
            
            $registration = DB::table('registration')
                ->where('studentId', $studentId)
                ->where('status', 'Approved')
                ->first();

            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'No approved registration found'
                ], 400);
            }

            $monthName = date('F', mktime(0, 0, 0, $request->month, 1));
            $paymentRecord = null;

            // Check for existing payment (BOTH Paid AND Pending)
            $existingPayments = Payment::where('registrationId', $registration->registrationId)
                ->get();
                
            foreach ($existingPayments as $payment) {
                $remark = json_decode($payment->remark, true);
                if (isset($remark['month']) && isset($remark['year']) && 
                    $remark['month'] == $request->month && $remark['year'] == $request->year) {
                    
                    // If payment is already Paid, prevent new payment
                    if ($payment->paymentStatus === 'Paid') {
                        return response()->json([
                            'success' => false,
                            'message' => 'Payment for this month already exists and is paid'
                        ], 400);
                    }
                    
                    // If payment is Pending, use the existing record
                    Log::info('Using existing pending payment record', [
                        'payment_id' => $payment->paymentId,
                        'month' => $request->month,
                        'year' => $request->year
                    ]);
                    
                    $paymentRecord = $payment;
                    break;
                }
            }

            // If no existing payment found, create new one
            if (!$paymentRecord) {
                $paymentRecord = Payment::create([
                    'registrationId' => $registration->registrationId,
                    'amount' => $request->amount,
                    'datePaid' => now(),
                    'paymentStatus' => 'Pending',
                    'method' => 'Pending Payment',
                    'remark' => json_encode([
                        'month' => $request->month,
                        'year' => $request->year,
                        'monthName' => $monthName
                    ])
                ]);
            }

            $secretKey = env('TOYYIBPAY_SECRET_KEY');
            $categoryCode = env('TOYYIBPAY_CATEGORY_CODE');

            if (!$secretKey || !$categoryCode) {
                // Only delete if we created a new payment
                if ($paymentRecord->wasRecentlyCreated) {
                    $paymentRecord->delete();
                }
                return response()->json([
                    'success' => false,
                    'message' => 'Payment gateway not configured'
                ], 500);
            }

            // Update the payment record with new transaction info
            $paymentRecord->transactionId = null; // Will be updated after bill creation
            $paymentRecord->method = 'Pending Payment';
            $paymentRecord->remark = json_encode([
                'month' => $request->month,
                'year' => $request->year,
                'monthName' => $monthName
            ]);
            $paymentRecord->save();

            // Use return URL that goes back to React with payment ID
            $billData = [
                'userSecretKey' => $secretKey,
                'categoryCode' => $categoryCode,
                'billName' => "Tuition {$monthName} {$request->year}",
                'billDescription' => "Monthly tuition fee",
                'billPriceSetting' => 1,
                'billPayorInfo' => 1,
                'billAmount' => number_format($request->amount, 2, '.', '') * 100,
                'billReturnUrl' => "http://localhost:3000/student/payment?payment_id={$paymentRecord->paymentId}",
                'billCallbackUrl' => 'http://localhost:8000/api/payments/toyyibpay/callback',
                'billExternalReferenceNo' => 'PAY' . $paymentRecord->paymentId,
                'billTo' => $student->name,
                'billEmail' => $student->email,
                'billPhone' => $student->phone ?? '0123456789',
                'billSplitPayment' => 0,
                'billSplitPaymentArgs' => '',
                'billPaymentChannel' => '2', // Both FPX and Card
                'billContentEmail' => "Thank you for your payment",
                'billChargeToCustomer' => 1
            ];

            $response = Http::asForm()->post(
                'https://dev.toyyibpay.com/index.php/api/createBill',
                $billData
            );

            if ($response->successful()) {
                $responseData = $response->json();
                
                if (is_array($responseData) && isset($responseData[0]['BillCode'])) {
                    $billCode = $responseData[0]['BillCode'];

                    $paymentRecord->transactionId = $billCode;
                    $paymentRecord->save();

                    $paymentUrl = "https://dev.toyyibpay.com/{$billCode}";

                    return response()->json([
                        'success' => true,
                        'data' => [
                            'paymentId' => $paymentRecord->paymentId,
                            'billCode' => $billCode,
                            'checkoutUrl' => $paymentUrl,
                            'amount' => $request->amount,
                            'month' => $request->month,
                            'year' => $request->year
                        ]
                    ]);
                }
            }

            // If bill creation failed, only delete if it was a new payment
            if ($paymentRecord->wasRecentlyCreated) {
                $paymentRecord->delete();
            }
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to create payment bill'
            ], 500);

        } catch (\Exception $e) {
            Log::error('createPaymentIntent failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Payment creation failed'
            ], 500);
        }
    }

    /**
     * Verify payment status manually (called from frontend after redirect)
     */
    public function verifyPaymentStatus(Request $request, $paymentId)
    {
        try {
            $payment = Payment::find($paymentId);

            if (!$payment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment not found'
                ], 404);
            }

            // If already paid, return success
            if ($payment->paymentStatus === 'Paid') {
                return response()->json([
                    'success' => true,
                    'status' => 'Paid',
                    'payment' => $payment
                ]);
            }

            // Check payment status with Toyyibpay API
            $billCode = $payment->transactionId;
            
            if (!$billCode) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid payment transaction'
                ], 400);
            }

            // Get bill transactions from Toyyibpay
            $response = Http::asForm()->post(
                'https://dev.toyyibpay.com/index.php/api/getBillTransactions',
                [
                    'billCode' => $billCode
                ]
            );

            if ($response->successful()) {
                $transactions = $response->json();
                
                // Check if there's a successful transaction
                foreach ($transactions as $transaction) {
                    if ($transaction['billpaymentStatus'] == '1') { // Status 1 = Paid
                        // Update payment
                        $remark = json_decode($payment->remark, true);
                        
                        $payment->paymentStatus = 'Paid';
                        $payment->datePaid = now();
                        $payment->setAttribute('method', $transaction['billpaymentChannel'] ?? 'Online Payment');
                        $payment->remark = json_encode([
                            'month' => $remark['month'] ?? null,
                            'year' => $remark['year'] ?? null,
                            'monthName' => $remark['monthName'] ?? null,
                            'paid_at' => now()->toDateTimeString(),
                            'transaction_id' => $transaction['billpaymentInvoiceNo'] ?? null
                        ]);
                        $payment->save();

                        Log::info('Payment verified and updated', [
                            'payment_id' => $paymentId,
                            'bill_code' => $billCode
                        ]);

                        return response()->json([
                            'success' => true,
                            'status' => 'Paid',
                            'payment' => $payment
                        ]);
                    }
                }
            }

            // Payment not completed yet
            return response()->json([
                'success' => true,
                'status' => 'Pending',
                'message' => 'Payment not completed'
            ]);

        } catch (\Exception $e) {
            Log::error('verifyPaymentStatus failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Verification failed'
            ], 500);
        }
    }

    /**
     * Toyyibpay Callback (if reachable)
     */
    public function toyyibpayCallback(Request $request)
    {
        try {
            Log::info('Toyyibpay callback received', $request->all());

            $statusId = $request->input('status_id');
            $billCode = $request->input('billcode');
            
            $payment = Payment::where('transactionId', $billCode)->first();

            if ($payment && $statusId == 1) {
                $remark = json_decode($payment->remark, true);
                
                $payment->paymentStatus = 'Paid';
                $payment->datePaid = now();
                $payment->setAttribute('method', 'FPX Online Banking');
                $payment->remark = json_encode([
                    'month' => $remark['month'] ?? null,
                    'year' => $remark['year'] ?? null,
                    'monthName' => $remark['monthName'] ?? null,
                    'paid_at' => now()->toDateTimeString()
                ]);
                $payment->save();

                Log::info('Payment updated via callback', ['payment_id' => $payment->paymentId]);
            }

            return response('OK', 200);

        } catch (\Exception $e) {
            Log::error('Callback error: ' . $e->getMessage());
            return response('Error', 500);
        }
    }

    /**
     * Get student's monthly fee
     */
    public function getMonthlyFee(Request $request)
    {
        try {
            $user = $request->user();
            $studentId = $user->getKey();

            $registration = DB::table('registration')
                ->where('studentId', $studentId)
                ->where('status', 'Approved')
                ->first();

            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'No approved registration found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'monthlyFee' => $registration->monthlyFee ?? 200.00
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch fee'
            ], 500);
        }
    }

    
    // ========================================
    // STAFF PAYMENT MANAGEMENT METHODS
    // ========================================

    /**
     * Get all payments with student and class details (Staff)
     */
    public function getAllPayments(Request $request)
    {
        try {
            $year = $request->query('year', date('Y'));
            $month = $request->query('month', null);
            $status = $request->query('status', null);

            $query = DB::table('payment')
                ->join('registration', 'payment.registrationId', '=', 'registration.registrationId')
                ->join('student', 'registration.studentId', '=', 'student.studentId')
                ->select(
                    'payment.paymentId',
                    'payment.amount',
                    'payment.datePaid',
                    'payment.method',
                    'payment.paymentStatus',
                    'payment.remark',
                    'payment.transactionId',
                    'student.studentId',
                    'student.name as studentName',
                    'student.email',
                    'registration.registrationId',
                    'registration.classIds'
                )
                ->where('registration.status', 'Approved');

            // Filter by year
            if ($year) {
                $query->whereYear('payment.datePaid', $year);
            }

            // Filter by month
            if ($month) {
                $query->whereMonth('payment.datePaid', $month);
            }

            // Filter by status
            if ($status) {
                $query->where('payment.paymentStatus', $status);
            }

            $payments = $query->orderBy('payment.datePaid', 'desc')->get();

            // Get class names for each payment
            $paymentsWithClasses = [];
            foreach ($payments as $payment) {
                $classIds = $payment->classIds ? explode(',', $payment->classIds) : [];
                $classNames = [];

                foreach ($classIds as $classId) {
                    $class = DB::table('class')
                        ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                        ->where('class.classId', $classId)
                        ->select('subject.name as subjectName', 'subject.form')
                        ->first();

                    if ($class) {
                        $classNames[] = $class->subjectName . ' (' . $class->form . ')';
                    }
                }

                // Extract month/year from remark if JSON
                $remark = json_decode($payment->remark, true);
                $paymentMonth = $remark['monthName'] ?? null;
                $paymentYear = $remark['year'] ?? null;

                $paymentsWithClasses[] = [
                    'paymentId' => $payment->paymentId,
                    'studentId' => $payment->studentId,
                    'studentName' => $payment->studentName,
                    'email' => $payment->email,
                    'classes' => implode(', ', $classNames),
                    'amount' => $payment->amount,
                    'datePaid' => $payment->datePaid,
                    'method' => $payment->method,
                    'paymentStatus' => $payment->paymentStatus,
                    'transactionId' => $payment->transactionId,
                    'paymentMonth' => $paymentMonth,
                    'paymentYear' => $paymentYear,
                    'remark' => $payment->remark
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $paymentsWithClasses
            ]);

        } catch (\Exception $e) {
            Log::error('getAllPayments failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch payments'
            ], 500);
        }
    }

    /**
     * Update payment details (Staff)
     */
    public function updatePayment(Request $request, $paymentId)
    {
        $validator = Validator::make($request->all(), [
            'paymentStatus' => 'required|in:Paid,Pending',
            'method' => 'nullable|string|max:50',
            'datePaid' => 'nullable|date'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $payment = Payment::find($paymentId);

            if (!$payment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Payment not found'
                ], 404);
            }

            // Update fields
            $payment->paymentStatus = $request->paymentStatus;
            
            if ($request->has('method')) {
                $payment->setAttribute('method', $request->input('method'));
            }
            
            if ($request->has('datePaid')) {
                $payment->datePaid = $request->input('datePaid');
            }

            $payment->save();

            Log::info('Payment updated by staff', [
                'payment_id' => $paymentId,
                'status' => $request->paymentStatus
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Payment updated successfully',
                'data' => $payment
            ]);

        } catch (\Exception $e) {
            Log::error('updatePayment failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update payment'
            ], 500);
        }
    }

    /**
     * Get payment statistics (Staff)
     */
    public function getPaymentStats(Request $request)
    {
        try {
            $year = $request->query('year', date('Y'));
            $month = $request->query('month', date('n'));

            // Total paid this month
            $totalPaid = DB::table('payment')
                ->whereYear('datePaid', $year)
                ->whereMonth('datePaid', $month)
                ->where('paymentStatus', 'Paid')
                ->sum('amount');

            // Total pending this month
            $totalPending = DB::table('payment')
                ->whereYear('datePaid', $year)
                ->whereMonth('datePaid', $month)
                ->where('paymentStatus', 'Pending')
                ->sum('amount');

            // Count of paid payments
            $paidCount = DB::table('payment')
                ->whereYear('datePaid', $year)
                ->whereMonth('datePaid', $month)
                ->where('paymentStatus', 'Paid')
                ->count();

            // Count of pending payments
            $pendingCount = DB::table('payment')
                ->whereYear('datePaid', $year)
                ->whereMonth('datePaid', $month)
                ->where('paymentStatus', 'Pending')
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'totalPaid' => $totalPaid,
                    'totalPending' => $totalPending,
                    'paidCount' => $paidCount,
                    'pendingCount' => $pendingCount,
                    'year' => (int)$year,
                    'month' => (int)$month
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('getPaymentStats failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statistics'
            ], 500);
        }
    }

    /**
     * Get all students with their payment status for a specific month/year
     */
    public function getAllStudentsPaymentStatus(Request $request)
    {
        try {
            $year = $request->query('year', date('Y'));
            $month = $request->query('month', date('n'));

            // Get all approved registrations with student details
            $students = DB::table('registration')
                    ->join('student', 'registration.studentId', '=', 'student.studentId')
                    ->leftJoin('payment', function($join) use ($year, $month) {
                        $join->on('registration.registrationId', '=', 'payment.registrationId')
                            ->whereRaw('JSON_EXTRACT(payment.remark, "$.year") = ?', [$year])
                            ->whereRaw('JSON_EXTRACT(payment.remark, "$.month") = ?', [$month]);
                    })
                    ->select(
                        'student.studentId',
                        'student.name as studentName',
                        'student.email',
                        'student.phone',
                        'registration.registrationId',
                        'registration.classIds',
                        'registration.monthlyFee',
                        'registration.status as registrationStatus',
                        'payment.paymentId',
                        'payment.amount',
                        'payment.datePaid',
                        'payment.method',
                        'payment.paymentStatus',
                        'payment.transactionId',
                        'payment.remark'
                    )
                    ->where('registration.status', 'Approved')
                    ->orderBy('student.name')
                    ->get();

            // Get class names for each student
            $result = [];
            foreach ($students as $student) {
                $classIds = $student->classIds ? explode(',', $student->classIds) : [];
                $classNames = [];

                foreach ($classIds as $classId) {
                    $class = DB::table('class')
                            ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                            ->where('class.classId', $classId)
                            ->select('subject.name as subjectName', 'subject.form')
                            ->first();

                    if ($class) {
                        // Check if form already contains "Form" text
                        $formText = $class->form;
                        
                        // If form already has "Form" in it, use it as is, otherwise add "Form"
                        if (strpos($formText, 'Form') === false && strpos($formText, 'form') === false) {
                            $formText = 'Form ' . $formText;
                        }
                        
                        $classNames[] = $class->subjectName . ' (' . $formText . ')';
                    }
                }

                // Parse remark to get month/year info
                $remark = $student->remark ? json_decode($student->remark, true) : null;

                // If payment exists, use its data, otherwise create default pending record
                if ($student->paymentId) {
                    $result[] = [
                        'paymentId' => $student->paymentId,
                        'studentId' => $student->studentId,
                        'studentName' => $student->studentName,
                        'email' => $student->email,
                        'phone' => $student->phone,
                        'classes' => implode(', ', $classNames),
                        'monthlyFee' => (float)$student->monthlyFee,
                        'amount' => (float)$student->amount,
                        'datePaid' => $student->datePaid,
                        'method' => $student->method,
                        'paymentStatus' => $student->paymentStatus,
                        'transactionId' => $student->transactionId,
                        'paymentMonth' => $remark['monthName'] ?? null,
                        'paymentYear' => $remark['year'] ?? null,
                        'month' => (int)$month,
                        'year' => (int)$year
                    ];
                } else {
                    // No payment record exists for this month
                    $result[] = [
                        'paymentId' => null,
                        'studentId' => $student->studentId,
                        'studentName' => $student->studentName,
                        'email' => $student->email,
                        'phone' => $student->phone,
                        'classes' => implode(', ', $classNames),
                        'monthlyFee' => (float)$student->monthlyFee,
                        'amount' => (float)$student->monthlyFee, // Default amount
                        'datePaid' => null,
                        'method' => null,
                        'paymentStatus' => 'Pending',
                        'transactionId' => null,
                        'paymentMonth' => null,
                        'paymentYear' => null,
                        'month' => (int)$month,
                        'year' => (int)$year
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'year' => (int)$year,
                    'month' => (int)$month,
                    'monthName' => date('F', mktime(0, 0, 0, $month, 1)),
                    'students' => $result,
                    'totalStudents' => count($result),
                    'paidCount' => count(array_filter($result, fn($s) => $s['paymentStatus'] === 'Paid')),
                    'pendingCount' => count(array_filter($result, fn($s) => $s['paymentStatus'] === 'Pending'))
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('getAllStudentsPaymentStatus failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch students payment status'
            ], 500);
        }
    }

    /**
     * Create or update payment for a student for a specific month
     */
    public function upsertStudentPayment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'studentId' => 'required|integer',
            'month' => 'required|integer|min:1|max:12',
            'year' => 'required|integer|min:2020',
            'amount' => 'required|numeric|min:0',
            'paymentStatus' => 'required|in:Paid,Pending',
            'method' => 'nullable|string|max:50',
            'datePaid' => 'nullable|date'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Get registration for this student
            $registration = DB::table('registration')
                ->where('studentId', $request->studentId)
                ->where('status', 'Approved')
                ->first();

            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'No approved registration found for this student'
                ], 404);
            }

            // Check if payment already exists for this month/year
            $existingPayment = Payment::where('registrationId', $registration->registrationId)
                ->whereRaw('JSON_EXTRACT(remark, "$.year") = ?', [$request->year])
                ->whereRaw('JSON_EXTRACT(remark, "$.month") = ?', [$request->month])
                ->first();

            $monthName = date('F', mktime(0, 0, 0, $request->month, 1));

            if ($existingPayment) {
                // Update existing payment
                $existingPayment->amount = $request->amount;
                $existingPayment->paymentStatus = $request->paymentStatus;
                
                if ($request->has('method')) {
                    $existingPayment->setAttribute('method', $request->input('method'));
                }
                
                if ($request->has('datePaid')) {
                    $existingPayment->datePaid = $request->datePaid;
                }

                // Update remark with month/year info
                $remark = json_decode($existingPayment->remark, true);
                $remark['month'] = $request->month;
                $remark['year'] = $request->year;
                $remark['monthName'] = $monthName;
                if ($request->paymentStatus === 'Paid' && !isset($remark['paid_at'])) {
                    $remark['paid_at'] = now()->toDateTimeString();
                }
                
                $existingPayment->remark = json_encode($remark);
                $existingPayment->save();

                $payment = $existingPayment;
            } else {
                // Create new payment
                $payment = Payment::create([
                    'registrationId' => $registration->registrationId,
                    'amount' => $request->amount,
                    'datePaid' => $request->datePaid ?? ($request->paymentStatus === 'Paid' ? now() : null),
                    'paymentStatus' => $request->paymentStatus,
                    'method' => $request->input('method'),
                    'remark' => json_encode([
                        'month' => $request->month,
                        'year' => $request->year,
                        'monthName' => $monthName,
                        'paid_at' => $request->paymentStatus === 'Paid' ? now()->toDateTimeString() : null
                    ])
                ]);
            }

            Log::info('Student payment upserted by staff', [
                'student_id' => $request->studentId,
                'month' => $request->month,
                'year' => $request->year,
                'status' => $request->paymentStatus
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Payment saved successfully',
                'data' => $payment
            ]);

        } catch (\Exception $e) {
            Log::error('upsertStudentPayment failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to save payment'
            ], 500);
        }
    }
}
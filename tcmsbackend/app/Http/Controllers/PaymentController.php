<?php

namespace App\Http\Controllers;
use App\Services\SMSService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;

class PaymentController extends Controller
{
    private function getParentRegistrationsForYear($parentEmail, $year)
    {
        return DB::table('registration')
            ->join('student', 'registration.studentId', '=', 'student.studentId')
            ->where('student.parentEmail', $parentEmail)
            ->where('registration.status', 'Approved')
            ->where('registration.enrollmentYear', $year)
            ->select('registration.registrationId', 'registration.monthlyFee')
            ->get();
    }

    /**
     * Get payment history for a student (current year)
     */
    public function getStudentPayments(Request $request)
    {
        try {
            $user = $request->user();
            $year = $request->query('year', date('Y'));

            $isParent = $request->user()->tokenCan('parent');
            $monthlyFee = 0;
            $payments = collect();

            if ($isParent) {
                $parentEmail = $user->parentEmail;
                $registrations = $this->getParentRegistrationsForYear($parentEmail, $year);

                if ($registrations->isEmpty()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No linked children with approved registration found for ' . $year
                    ], 404);
                }

                $registrationIds = $registrations->pluck('registrationId')->toArray();
                $monthlyFee = (float) $registrations->sum(function ($r) {
                    return floatval($r->monthlyFee ?? 0);
                });

                // Parent payments are anchored to one linked registration and marked with parentEmail in remark
                $payments = Payment::whereIn('registrationId', $registrationIds)
                    ->where('paymentStatus', 'Paid')
                    ->get()
                    ->filter(function ($payment) use ($parentEmail) {
                        $remark = json_decode($payment->remark, true);
                        return isset($remark['parentEmail']) && $remark['parentEmail'] === $parentEmail;
                    })
                    ->values();
            } else {
                $studentId = $user->getKey();
                $registration = DB::table('registration')
                    ->where('studentId', $studentId)
                    ->where('status', 'Approved')
                    ->where('enrollmentYear', $year)
                    ->first();

                if (!$registration) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No approved registration found for ' . $year
                    ], 404);
                }

                $monthlyFee = $registration->monthlyFee ?? 200.00;
                $payments = Payment::where('registrationId', $registration->registrationId)
                    ->where('paymentStatus', 'Paid')
                    ->get();
            }
            
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
            $isParent = $request->user()->tokenCan('parent');
            $effectiveAmount = 0;
            $registration = null;
            $student = null;
            $parentEmail = null;

            if ($isParent) {
                $parentEmail = $user->parentEmail;
                $registrations = $this->getParentRegistrationsForYear($parentEmail, $request->year);

                if ($registrations->isEmpty()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No linked children with approved registration found for ' . $request->year
                    ], 400);
                }

                $effectiveAmount = (float) $registrations->sum(function ($r) {
                    return floatval($r->monthlyFee ?? 0);
                });

                // Anchor parent payment to first linked registration
                $registration = $registrations->first();
                $linkedStudent = DB::table('student')
                    ->join('registration', 'registration.studentId', '=', 'student.studentId')
                    ->where('registration.registrationId', $registration->registrationId)
                    ->select('student.name', 'student.phone')
                    ->first();

                $student = (object) [
                    'name' => $linkedStudent->name ?? 'Parent',
                    'email' => $parentEmail,
                    'phone' => $linkedStudent->phone ?? '0123456789',
                ];
            } else {
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
                    ->where('enrollmentYear', $request->year)
                    ->first();

                if (!$registration) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No approved registration found for ' . $request->year
                    ], 400);
                }

                $effectiveAmount = (float) $request->amount;
            }

            $monthName = date('F', mktime(0, 0, 0, $request->month, 1));
            $paymentRecord = null;
            $paymentRecords = collect();

            // Check for existing payment (BOTH Paid AND Pending)
            if ($isParent) {
                $parentRegistrations = $this->getParentRegistrationsForYear($parentEmail, $request->year);

                foreach ($parentRegistrations as $reg) {
                    $existingPayments = Payment::where('registrationId', $reg->registrationId)->get();
                    $matchedPending = null;

                    foreach ($existingPayments as $payment) {
                        $remark = json_decode($payment->remark, true);
                        if (
                            isset($remark['month']) && isset($remark['year']) &&
                            $remark['month'] == $request->month && $remark['year'] == $request->year &&
                            (($remark['parentEmail'] ?? null) === $parentEmail)
                        ) {
                            if ($payment->paymentStatus === 'Paid') {
                                return response()->json([
                                    'success' => false,
                                    'message' => 'Payment for this month already exists and is paid'
                                ], 400);
                            }
                            $matchedPending = $payment;
                            break;
                        }
                    }

                    if (!$matchedPending) {
                        $matchedPending = Payment::create([
                            'registrationId' => $reg->registrationId,
                            'amount' => floatval($reg->monthlyFee ?? 0),
                            'datePaid' => now(),
                            'paymentStatus' => 'Pending',
                            'method' => 'Pending Payment',
                            'remark' => json_encode([
                                'month' => $request->month,
                                'year' => $request->year,
                                'monthName' => $monthName,
                                'parentEmail' => $parentEmail
                            ]),
                            'academicYear' => $request->year
                        ]);
                    }

                    $paymentRecords->push($matchedPending);
                }

                $paymentRecord = $paymentRecords->first();
            } else {
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
                        
                        $paymentRecord = $payment;
                        break;
                    }
                }

                if (!$paymentRecord) {
                    $paymentRecord = Payment::create([
                        'registrationId' => $registration->registrationId,
                        'amount' => $effectiveAmount,
                        'datePaid' => now(),
                        'paymentStatus' => 'Pending',
                        'method' => 'Pending Payment',
                        'remark' => json_encode([
                            'month' => $request->month,
                            'year' => $request->year,
                            'monthName' => $monthName,
                            'parentEmail' => null
                        ]),
                        'academicYear' => $request->year
                    ]);
                }
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
            if ($isParent) {
                foreach ($paymentRecords as $record) {
                    $record->transactionId = null;
                    $record->method = 'Pending Payment';
                    $record->remark = json_encode([
                        'month' => $request->month,
                        'year' => $request->year,
                        'monthName' => $monthName,
                        'parentEmail' => $parentEmail
                    ]);
                    $record->save();
                }
            } else {
                $paymentRecord->transactionId = null; // Will be updated after bill creation
                $paymentRecord->method = 'Pending Payment';
                $paymentRecord->remark = json_encode([
                    'month' => $request->month,
                    'year' => $request->year,
                    'monthName' => $monthName,
                    'parentEmail' => null
                ]);
                $paymentRecord->save();
            }

            // Use return URL that goes back to React with payment ID
            $billData = [
                'userSecretKey' => $secretKey,
                'categoryCode' => $categoryCode,
                'billName' => "Tuition {$monthName} {$request->year}",
                'billDescription' => $isParent ? "Monthly tuition fee (linked children)" : "Monthly tuition fee",
                'billPriceSetting' => 1,
                'billPayorInfo' => 1,
                'billAmount' => number_format($effectiveAmount, 2, '.', '') * 100,
                'billReturnUrl' => $isParent
                    ? config('app.frontend_url') . "/parent/payment?payment_id={$paymentRecord->paymentId}"
                    : config('app.frontend_url') . "/student/payment?payment_id={$paymentRecord->paymentId}",
                'billCallbackUrl' => config('app.url') . '/api/payments/toyyibpay/callback',
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

                    if ($isParent) {
                        foreach ($paymentRecords as $record) {
                            $record->transactionId = $billCode;
                            $record->save();
                        }
                    } else {
                        $paymentRecord->transactionId = $billCode;
                        $paymentRecord->save();
                    }

                    $paymentUrl = "https://dev.toyyibpay.com/{$billCode}";

                    return response()->json([
                        'success' => true,
                        'data' => [
                            'paymentId' => $paymentRecord->paymentId,
                            'billCode' => $billCode,
                            'checkoutUrl' => $paymentUrl,
                            'amount' => $effectiveAmount,
                            'month' => $request->month,
                            'year' => $request->year
                        ]
                    ]);
                }
            }

            // If bill creation failed, only delete if it was a new payment
            if ($isParent) {
                foreach ($paymentRecords as $record) {
                    if ($record->wasRecentlyCreated) {
                        $record->delete();
                    }
                }
            } else if ($paymentRecord->wasRecentlyCreated) {
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
                $remark = json_decode($payment->remark, true);
                $parentEmail = $remark['parentEmail'] ?? null;
                
                $totalAmount = $payment->amount;
                $childNames = [];
                $isParentPayment = false;
                
                // If this is a parent payment, get ALL related payments and sum them
                if ($parentEmail) {
                    $isParentPayment = true;
                    $allParentPayments = Payment::where('transactionId', $payment->transactionId)
                        ->where('paymentStatus', 'Paid')
                        ->get();
                    
                    $totalAmount = $allParentPayments->sum('amount');
                    
                    foreach ($allParentPayments as $p) {
                        $pRemark = json_decode($p->remark, true);
                        // Get child name from registration
                        $registration = DB::table('registration')
                            ->join('student', 'registration.studentId', '=', 'student.studentId')
                            ->where('registration.registrationId', $p->registrationId)
                            ->select('student.name')
                            ->first();
                        if ($registration) {
                            $childNames[] = $registration->name;
                        }
                    }
                }
                
                return response()->json([
                    'success' => true,
                    'status' => 'Paid',
                    'payment' => $payment,
                    'payment_id' => $payment->paymentId,
                    'monthName' => $remark['monthName'] ?? null,
                    'academicYear' => $payment->academicYear,
                    'amount' => $totalAmount,
                    'method' => $payment->method,
                    'transactionId' => $payment->transactionId,
                    'datePaid' => $payment->datePaid,
                    'children' => $childNames,
                    'isParentPayment' => $isParentPayment
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
                        // Update payment (for parent payments, update all linked child records in same bill/month/year)
                        $remark = json_decode($payment->remark, true);
                        $parentEmail = $remark['parentEmail'] ?? null;
                        $targetPayments = collect([$payment]);

                        if ($parentEmail) {
                            $sameBillPayments = Payment::where('transactionId', $billCode)->get();
                            $targetPayments = $sameBillPayments->filter(function ($p) use ($remark, $parentEmail) {
                                $r = json_decode($p->remark, true);
                                return ($r['month'] ?? null) == ($remark['month'] ?? null)
                                    && ($r['year'] ?? null) == ($remark['year'] ?? null)
                                    && ($r['parentEmail'] ?? null) === $parentEmail;
                            })->values();
                        }

                        foreach ($targetPayments as $targetPayment) {
                            $targetRemark = json_decode($targetPayment->remark, true);
                            $targetPayment->paymentStatus = 'Paid';
                            $targetPayment->datePaid = now();
                            $targetPayment->setAttribute('method', $transaction['billpaymentChannel'] ?? 'Online Payment');
                            $targetPayment->remark = json_encode([
                                'month' => $targetRemark['month'] ?? null,
                                'year' => $targetRemark['year'] ?? null,
                                'monthName' => $targetRemark['monthName'] ?? null,
                                'parentEmail' => $targetRemark['parentEmail'] ?? null,
                                'paid_at' => now()->toDateTimeString(),
                                'transaction_id' => $transaction['billpaymentInvoiceNo'] ?? null
                            ]);
                            $targetPayment->save();
                        }

                        // Calculate total amount and child names for parent payment
                        $totalAmount = $payment->amount;
                        $childNames = [];
                        $isParentPayment = false;
                        
                        if ($parentEmail) {
                            $isParentPayment = true;
                            $allParentPayments = Payment::where('transactionId', $billCode)
                                ->where('paymentStatus', 'Paid')
                                ->get();
                            $totalAmount = $allParentPayments->sum('amount');
                            
                            foreach ($allParentPayments as $p) {
                                $registration = DB::table('registration')
                                    ->join('student', 'registration.studentId', '=', 'student.studentId')
                                    ->where('registration.registrationId', $p->registrationId)
                                    ->select('student.name')
                                    ->first();
                                if ($registration) {
                                    $childNames[] = $registration->name;
                                }
                            }
                        }

                        Log::info('Payment verified and updated', [
                            'payment_id' => $paymentId,
                            'bill_code' => $billCode
                        ]);

                        return response()->json([
                            'success' => true,
                            'status' => 'Paid',
                            'payment' => $payment,
                            'payment_id' => $payment->paymentId,
                            'monthName' => $remark['monthName'] ?? null,
                            'academicYear' => $payment->academicYear,
                            'amount' => $totalAmount,
                            'method' => $payment->method,
                            'transactionId' => $payment->transactionId,
                            'datePaid' => $payment->datePaid,
                            'children' => $childNames,
                            'isParentPayment' => $isParentPayment
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
                $parentEmail = $remark['parentEmail'] ?? null;
                $targetPayments = collect([$payment]);

                if ($parentEmail) {
                    $sameBillPayments = Payment::where('transactionId', $billCode)->get();
                    $targetPayments = $sameBillPayments->filter(function ($p) use ($remark, $parentEmail) {
                        $r = json_decode($p->remark, true);
                        return ($r['month'] ?? null) == ($remark['month'] ?? null)
                            && ($r['year'] ?? null) == ($remark['year'] ?? null)
                            && ($r['parentEmail'] ?? null) === $parentEmail;
                    })->values();
                }

                foreach ($targetPayments as $targetPayment) {
                    $targetRemark = json_decode($targetPayment->remark, true);
                    $targetPayment->paymentStatus = 'Paid';
                    $targetPayment->datePaid = now();
                    $targetPayment->setAttribute('method', 'FPX Online Banking');
                    $targetPayment->remark = json_encode([
                        'month' => $targetRemark['month'] ?? null,
                        'year' => $targetRemark['year'] ?? null,
                        'monthName' => $targetRemark['monthName'] ?? null,
                        'parentEmail' => $targetRemark['parentEmail'] ?? null,
                        'paid_at' => now()->toDateTimeString()
                    ]);
                    $targetPayment->save();
                }

                Log::info('Payment updated via callback', ['payment_id' => $payment->paymentId, 'updated_count' => $targetPayments->count()]);
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
            $year = date('Y');

            $registration = DB::table('registration')
                ->where('studentId', $studentId)
                ->where('status', 'Approved')
                ->where('enrollmentYear', $year)
                ->first();

            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'No approved registration found for ' . $year
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

    /**
     * Get available academic years from registrations
     */
    public function getAvailableYears()
    {
        try {
            $years = DB::table('registration')
                ->select('enrollmentYear')
                ->where('status', 'Approved')
                ->distinct()
                ->orderBy('enrollmentYear', 'desc')
                ->pluck('enrollmentYear')
                ->toArray();

            // Add current year if not present
            $currentYear = date('Y');
            if (!in_array($currentYear, $years)) {
                array_unshift($years, $currentYear);
            }

            return response()->json([
                'success' => true,
                'data' => $years,
                'current_year' => $currentYear
            ]);

        } catch (\Exception $e) {
            Log::error('getAvailableYears failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'data' => [date('Y')],
                'current_year' => date('Y')
            ]);
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
                    'registration.classIds',
                    'registration.enrollmentYear'
                )
                ->where('registration.status', 'Approved')
                ->where('registration.enrollmentYear', $year);

            // Filter by month (from remark JSON)
            if ($month) {
                $query->whereRaw('JSON_EXTRACT(payment.remark, "$.month") = ?', [$month]);
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
                    'enrollmentYear' => $payment->enrollmentYear,
                    'remark' => $payment->remark
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $paymentsWithClasses,
                'academic_year' => $year
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

            // Total paid this month for this academic year
            $totalPaid = DB::table('payment')
                ->join('registration', 'payment.registrationId', '=', 'registration.registrationId')
                ->where('registration.enrollmentYear', $year)
                ->whereRaw('JSON_EXTRACT(payment.remark, "$.year") = ?', [$year])
                ->whereRaw('JSON_EXTRACT(payment.remark, "$.month") = ?', [$month])
                ->where('payment.paymentStatus', 'Paid')
                ->sum('payment.amount');

            // Total pending this month for this academic year
            $totalPending = DB::table('payment')
                ->join('registration', 'payment.registrationId', '=', 'registration.registrationId')
                ->where('registration.enrollmentYear', $year)
                ->whereRaw('JSON_EXTRACT(payment.remark, "$.year") = ?', [$year])
                ->whereRaw('JSON_EXTRACT(payment.remark, "$.month") = ?', [$month])
                ->where('payment.paymentStatus', 'Pending')
                ->sum('payment.amount');

            // Count of paid payments
            $paidCount = DB::table('payment')
                ->join('registration', 'payment.registrationId', '=', 'registration.registrationId')
                ->where('registration.enrollmentYear', $year)
                ->whereRaw('JSON_EXTRACT(payment.remark, "$.year") = ?', [$year])
                ->whereRaw('JSON_EXTRACT(payment.remark, "$.month") = ?', [$month])
                ->where('payment.paymentStatus', 'Paid')
                ->count();

            // Count of pending payments
            $pendingCount = DB::table('payment')
                ->join('registration', 'payment.registrationId', '=', 'registration.registrationId')
                ->where('registration.enrollmentYear', $year)
                ->whereRaw('JSON_EXTRACT(payment.remark, "$.year") = ?', [$year])
                ->whereRaw('JSON_EXTRACT(payment.remark, "$.month") = ?', [$month])
                ->where('payment.paymentStatus', 'Pending')
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

            // Get all approved registrations for the specific academic year
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
                        'registration.enrollmentYear',
                        'payment.paymentId',
                        'payment.amount',
                        'payment.datePaid',
                        'payment.method',
                        'payment.paymentStatus',
                        'payment.transactionId',
                        'payment.remark'
                    )
                    ->where('registration.status', 'Approved')
                    ->where('registration.enrollmentYear', $year)
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
                        $formText = $class->form;
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
                        'enrollmentYear' => $student->enrollmentYear,
                        'month' => (int)$month,
                        'year' => (int)$year
                    ];
                } else {
                    // No payment record exists for this month/year
                    $result[] = [
                        'paymentId' => null,
                        'studentId' => $student->studentId,
                        'studentName' => $student->studentName,
                        'email' => $student->email,
                        'phone' => $student->phone,
                        'classes' => implode(', ', $classNames),
                        'monthlyFee' => (float)$student->monthlyFee,
                        'amount' => (float)$student->monthlyFee,
                        'datePaid' => null,
                        'method' => null,
                        'paymentStatus' => 'Pending',
                        'transactionId' => null,
                        'paymentMonth' => null,
                        'paymentYear' => null,
                        'enrollmentYear' => $student->enrollmentYear,
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
            // Get registration for this student for the specific academic year
            $registration = DB::table('registration')
                ->where('studentId', $request->studentId)
                ->where('status', 'Approved')
                ->where('enrollmentYear', $request->year)
                ->first();

            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'No approved registration found for this student for ' . $request->year
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
                    'academicYear' => $request->year,
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

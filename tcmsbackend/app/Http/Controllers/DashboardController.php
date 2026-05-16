<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Student;
use App\Models\Authority;
use App\Models\Registration;
use App\Models\Payment;
use App\Models\Attendance;
use App\Models\TestMark;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class DashboardController extends Controller
{
    /**
     * Get dashboard statistics based on user role
     */
    public function getDashboardStats(Request $request)
    {
        try {
            $user = $request->user();

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            // Route to appropriate dashboard based on user type
            if ($user instanceof \App\Models\Student) {
                return $this->getStudentDashboardStats($user);
            } else if ($user instanceof \App\Models\Authority) {
                return $this->getStaffAdminDashboardStats($user);
            }

            return response()->json([
                'success' => false,
                'message' => 'Invalid user type'
            ], 400);

        } catch (\Exception $e) {
            Log::error('getDashboardStats failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch dashboard statistics'
            ], 500);
        }
    }

    /**
     * Get student dashboard statistics
     */
    private function getStudentDashboardStats($user)
    {
        try {
            $studentId = $user->studentId;
            $currentYear = Carbon::now()->year;

            // Get student's approved registrations for CURRENT year only
            $registrations = Registration::where('studentId', $studentId)
                ->where('status', 'Approved')
                ->where('enrollmentYear', $currentYear)
                ->get();

            if ($registrations->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'studentName' => $user->name,
                        'totalClasses' => 0,
                        'monthlyFee' => 0,
                        'totalTests' => 0,
                        'overallAttendance' => 0,
                        'subjects' => [],
                        'attendance' => ['present' => 0, 'absent' => 0, 'total' => 0],
                        'attendanceBySubject' => [],
                        'testMarks' => [],
                        'upcomingClasses' => []
                    ]
                ]);
            }

            // Get all class IDs from registrations (these classes are already from current year)
            $allClassIds = [];
            foreach ($registrations as $reg) {
                if ($reg->classIds) {
                    $classIds = explode(',', $reg->classIds);
                    $allClassIds = array_merge($allClassIds, $classIds);
                }
            }
            $allClassIds = array_unique($allClassIds);

            // Get student's subjects
            $subjects = DB::table('class')
                ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                ->whereIn('class.classId', $allClassIds)
                ->where('class.academicYear', $currentYear)
                ->select('subject.subjectId', 'subject.name as subjectName', 'subject.form')
                ->distinct()
                ->orderBy('subject.form')
                ->orderBy('subject.name')
                ->get();

            // Get all registration IDs for this student
            $registrationIds = $registrations->pluck('registrationId')->toArray();

            // Calculate total monthly fee
            $totalMonthlyFee = $registrations->sum('monthlyFee');

            // Get attendance statistics for CURRENT YEAR only
            $attendanceStats = DB::table('attendance')
                ->whereIn('attendance.registrationId', $registrationIds)
                ->where('attendance.academicYear', $currentYear)
                ->select(
                    DB::raw('COUNT(CASE WHEN status = "Present" THEN 1 END) as presentCount'),
                    DB::raw('COUNT(CASE WHEN status = "Absent" THEN 1 END) as absentCount'),
                    DB::raw('COUNT(*) as totalCount')
                )
                ->first();

            // Get attendance by subject - include all subjects even with 0 records
            $attendanceBySubject = [];
            foreach ($subjects as $subject) {
                $subjectClassIds = DB::table('class')
                    ->where('subjectId', $subject->subjectId)
                    ->where('academicYear', $currentYear)
                    ->pluck('classId')
                    ->toArray();

                $subjectAttendance = DB::table('attendance')
                    ->whereIn('attendance.registrationId', $registrationIds)
                    ->whereIn('attendance.classId', $subjectClassIds)
                    ->where('attendance.academicYear', $currentYear)
                    ->select(
                        DB::raw('COUNT(CASE WHEN attendance.status = "Present" THEN 1 END) as present'),
                        DB::raw('COUNT(CASE WHEN attendance.status = "Absent" THEN 1 END) as absent'),
                        DB::raw('COUNT(*) as total')
                    )
                    ->first();

                $attendanceBySubject[] = [
                    'subjectId' => $subject->subjectId,
                    'subjectName' => $subject->subjectName . ' (' . $subject->form . ')',
                    'present' => $subjectAttendance->present ?? 0,
                    'absent' => $subjectAttendance->absent ?? 0,
                    'total' => $subjectAttendance->total ?? 0
                ];
            }

            // Get test marks for CURRENT YEAR only
            $testMarks = DB::table('testmark')
                ->join('class', 'testmark.classId', '=', 'class.classId')
                ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                ->whereIn('testmark.registrationId', $registrationIds)
                ->where('testmark.academicYear', $currentYear)
                ->select(
                    'testmark.mark',
                    'testmark.testName',
                    'testmark.testDate',
                    'subject.subjectId',
                    'subject.name as subjectName',
                    'subject.form'
                )
                ->orderBy('testmark.testDate', 'desc')
                ->get();

            // Get upcoming classes (next 7 days) - only from current year
            $upcomingClasses = DB::table('class')
                ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                ->join('authority', 'class.authorityId', '=', 'authority.authorityId')
                ->whereIn('class.classId', $allClassIds)
                ->where('class.academicYear', $currentYear)
                ->whereIn('class.classDay', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
                ->select(
                    'class.classId',
                    'class.classDay',
                    'class.startTime',
                    'class.finishTime',
                    'class.location',
                    'subject.name as subjectName',
                    'subject.form',
                    'authority.name as teacher'
                )
                ->orderByRaw("FIELD(classDay, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')")
                ->orderBy('class.startTime')
                ->limit(3)
                ->get();

            // Format test marks
            $formattedTestMarks = [];
            foreach ($testMarks as $test) {
                $formattedTestMarks[] = [
                    'subjectId' => $test->subjectId,
                    'subjectName' => $test->subjectName . ' (' . $test->form . ')',
                    'testName' => $test->testName,
                    'mark' => $test->mark,
                    'testDate' => $test->testDate
                ];
            }

            // Payment status up to current month (Jan..current month) for current year
            $currentMonth = Carbon::now()->month;
            $currentYear = Carbon::now()->year;

            $paidMonths = Payment::whereIn('registrationId', $registrationIds)
                ->where('academicYear', $currentYear)
                ->where('paymentStatus', 'Paid')
                ->whereRaw("CAST(JSON_EXTRACT(remark, '$.year') AS UNSIGNED) = ?", [$currentYear])
                ->whereRaw("CAST(JSON_EXTRACT(remark, '$.month') AS UNSIGNED) BETWEEN 1 AND ?", [$currentMonth])
                ->selectRaw("DISTINCT CAST(JSON_EXTRACT(remark, '$.month') AS UNSIGNED) as paid_month")
                ->pluck('paid_month')
                ->map(fn($m) => (int) $m)
                ->unique()
                ->values()
                ->toArray();

            // Count how many months have been paid (from January to current month)
            $monthsPaidCount = count($paidMonths);
            $totalMonthsRequired = $currentMonth; // January = 1, February = 2, etc.

            $hasPendingPayment = $monthsPaidCount < $totalMonthsRequired;
            $paymentStatus = $hasPendingPayment ? 'Pending' : 'Paid';
            return response()->json([
                'success' => true,
                'data' => [
                    'userRole' => 'student',
                    'studentName' => $user->name,
                    'totalClasses' => count($allClassIds),
                    'monthlyFee' => $totalMonthlyFee,
                    'paymentStatus' => $paymentStatus,
                    'hasPendingPayment' => $hasPendingPayment,
                    'totalTests' => count($testMarks),
                    'overallAttendance' => $attendanceStats->totalCount > 0
                        ? round(($attendanceStats->presentCount / $attendanceStats->totalCount) * 100, 1)
                        : 0,
                    'subjects' => $subjects->map(function ($subject) {
                        return [
                            'subjectId' => $subject->subjectId,
                            'subjectName' => $subject->subjectName . ' (' . $subject->form . ')'
                        ];
                    }),
                    'attendance' => [
                        'present' => $attendanceStats->presentCount ?? 0,
                        'absent' => $attendanceStats->absentCount ?? 0,
                        'total' => $attendanceStats->totalCount ?? 0
                    ],
                    'attendanceBySubject' => $attendanceBySubject,
                    'testMarks' => $formattedTestMarks,
                    'upcomingClasses' => $upcomingClasses
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('getStudentDashboardStats failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch student dashboard statistics'
            ], 500);
        }
    }

    /**
     * Get staff/admin dashboard statistics
     */
    private function getStaffAdminDashboardStats($user)
    {
        try {
            // Determine user role
            $isAdmin = false;
            $isStaff = false;
            $staffId = null;
            $currentYear = Carbon::now()->year;

            if ($user->role === 'Admin') {
                $isAdmin = true;
            } else {
                $isStaff = true;
                $staffId = $user->authorityId;
            }

            // Get current month and year
            $currentMonth = Carbon::now()->month;

            // Get all classes for CURRENT YEAR (filtered by user role)
            $allClasses = [];
            if ($isAdmin) {
                $allClasses = DB::table('class')
                    ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                    ->join('authority', 'class.authorityId', '=', 'authority.authorityId')
                    ->where('class.academicYear', $currentYear)
                    ->select(
                        'class.classId',
                        'subject.name as subjectName',
                        'subject.form',
                        'class.classDay',
                        'class.startTime',
                        'class.finishTime',
                        'class.academicYear',
                        'authority.name as teacherName'
                    )
                    ->orderBy('subject.form')
                    ->orderBy('subject.name')
                    ->orderBy('class.classDay')
                    ->get();
            } else if ($isStaff) {
                $allClasses = DB::table('class')
                    ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                    ->join('authority', 'class.authorityId', '=', 'authority.authorityId')
                    ->where('class.authorityId', $staffId)
                    ->where('class.academicYear', $currentYear)
                    ->select(
                        'class.classId',
                        'subject.name as subjectName',
                        'subject.form',
                        'class.classDay',
                        'class.startTime',
                        'class.finishTime',
                        'class.academicYear',
                        'authority.name as teacherName'
                    )
                    ->orderBy('subject.form')
                    ->orderBy('subject.name')
                    ->orderBy('class.classDay')
                    ->get();
            }

            // 1. Overview Statistics - For CURRENT YEAR only
            $totalStudents = Registration::where('status', 'Approved')
                ->where('enrollmentYear', $currentYear)
                ->distinct('studentId')
                ->count();
            $totalStaff = Authority::where('role', 'Staff')->count();
            $totalClasses = DB::table('class')->where('academicYear', $currentYear)->count();
            $pendingApplications = Registration::where('status', 'Pending')
                ->where('enrollmentYear', $currentYear)
                ->count();

            // For staff, only count their classes and students for CURRENT YEAR
            $staffClasses = [];
            $staffClassIds = [];
            if ($isStaff) {
                $staffClasses = DB::table('class')
                    ->where('authorityId', $staffId)
                    ->where('academicYear', $currentYear)
                    ->get();
                $totalClasses = $staffClasses->count();

                // Count students in staff's classes
                $staffClassIds = $staffClasses->pluck('classId')->toArray();

                if (!empty($staffClassIds)) {
                    $totalStudents = Registration::where('status', 'Approved')
                        ->where('enrollmentYear', $currentYear)
                        ->where(function ($query) use ($staffClassIds) {
                            foreach ($staffClassIds as $classId) {
                                $query->orWhereRaw("FIND_IN_SET(?, classIds)", [$classId]);
                            }
                        })
                        ->distinct('studentId')
                        ->count();
                }
            }

            // 2. Active Students by Month (Last 6 months) - For CURRENT YEAR only
            $activeStudentsByMonth = [];
            for ($i = 5; $i >= 0; $i--) {
                $month = Carbon::now()->subMonths($i);
                $monthName = $month->format('M Y');

                $query = Registration::where('status', 'Approved')
                    ->where('enrollmentYear', $currentYear)
                    ->whereYear('createdAt', $month->year)
                    ->whereMonth('createdAt', $month->month);

                // Filter by staff's classes if staff
                if ($isStaff && !empty($staffClassIds)) {
                    $query->where(function ($q) use ($staffClassIds) {
                        foreach ($staffClassIds as $classId) {
                            $q->orWhereRaw("FIND_IN_SET(?, classIds)", [$classId]);
                        }
                    });
                }

                $count = $query->distinct('studentId')->count();

                $activeStudentsByMonth[] = [
                    'month' => $monthName,
                    'count' => $count
                ];
            }

            // 3. Payment Status of Current Month - For CURRENT YEAR only
            // Get total active students (those with approved registrations)
            $totalActiveStudentsQuery = Registration::where('status', 'Approved')
                ->where('enrollmentYear', $currentYear);

            // Filter by staff's classes if staff
            if ($isStaff && !empty($staffClassIds)) {
                $totalActiveStudentsQuery->where(function ($q) use ($staffClassIds) {
                    foreach ($staffClassIds as $classId) {
                        $q->orWhereRaw("FIND_IN_SET(?, classIds)", [$classId]);
                    }
                });
            }

            $totalActiveStudents = $totalActiveStudentsQuery->distinct()->count('studentId');

            // Get distinct students who have PAID for current month (based on remark)
            $paidStudentIds = DB::table('payment')
                ->join('registration', 'payment.registrationId', '=', 'registration.registrationId')
                ->where('payment.paymentStatus', 'Paid')
                ->where('payment.academicYear', $currentYear)
                ->whereRaw("CAST(JSON_EXTRACT(payment.remark, '$.year') AS UNSIGNED) = ?", [$currentYear])
                ->whereRaw("CAST(JSON_EXTRACT(payment.remark, '$.month') AS UNSIGNED) = ?", [$currentMonth])
                ->when($isStaff && !empty($staffClassIds), function ($query) use ($staffClassIds) {
                    return $query->where(function ($q) use ($staffClassIds) {
                        foreach ($staffClassIds as $classId) {
                            $q->orWhereRaw("FIND_IN_SET(?, registration.classIds)", [$classId]);
                        }
                    });
                })
                ->distinct()
                ->pluck('registration.studentId');

            $paidCount = $paidStudentIds->count();

            // Pending = Total active students - Paid students
            $pendingCount = $totalActiveStudents - $paidCount;

            $paymentStatusData = [
                'paid' => $paidCount,
                'pending' => $pendingCount > 0 ? $pendingCount : 0,
                'total' => $totalActiveStudents
            ];

            // 4. Attendance by Class - For CURRENT YEAR only
            $attendanceByClass = [];
            $attendanceByClassOverall = [];

            foreach ($allClasses as $class) {
                $attendanceQuery = DB::table('attendance')
                    ->where('attendance.classId', $class->classId)
                    ->where('attendance.academicYear', $currentYear);

                $stats = $attendanceQuery
                    ->select(
                        DB::raw('COUNT(CASE WHEN attendance.status = "Present" THEN 1 END) as presentCount'),
                        DB::raw('COUNT(*) as totalCount')
                    )
                    ->first();

                $attendanceRate = 0;
                if ($stats->totalCount > 0) {
                    $attendanceRate = round(($stats->presentCount / $stats->totalCount) * 100, 1);
                }

                $attendanceByClass[] = [
                    'classId' => $class->classId,
                    'subject' => $class->subjectName . ' (' . $class->form . ')',
                    'classDay' => $class->classDay,
                    'classTime' => substr($class->startTime, 0, 5),
                    'attendanceRate' => $attendanceRate
                ];

                // Add to overall average - ALWAYS include (even with 0%)
                $attendanceByClassOverall[] = [
                    'subject' => $class->subjectName . ' (' . $class->form . ') - ' . $class->classDay,
                    'attendanceRate' => $attendanceRate
                ];
            }

            // 5. Test Marks by Class - For CURRENT YEAR only
            $testMarksByClass = [];
            $testMarksByClassOverall = [];

            foreach ($allClasses as $class) {
                $testMarksQuery = DB::table('testmark')
                    ->where('testmark.classId', $class->classId)
                    ->where('testmark.academicYear', $currentYear);

                $stats = $testMarksQuery
                    ->select(
                        DB::raw('AVG(testmark.mark) as averageMark'),
                        DB::raw('MAX(testmark.mark) as maxMark'),
                        DB::raw('MIN(testmark.mark) as minMark')
                    )
                    ->first();

                $average = round($stats->averageMark ?? 0, 1);
                $max = $stats->maxMark ?? 0;
                $min = $stats->minMark ?? 0;

                $testMarksByClass[] = [
                    'classId' => $class->classId,
                    'subject' => $class->subjectName . ' (' . $class->form . ')',
                    'classDay' => $class->classDay,
                    'classTime' => substr($class->startTime, 0, 5),
                    'average' => $average,
                    'max' => $max,
                    'min' => $min
                ];

                // Add to overall list - ALWAYS include (even with 0 average)
                $testMarksByClassOverall[] = [
                    'subject' => $class->subjectName . ' (' . $class->form . ') - ' . $class->classDay,
                    'average' => $average,
                    'max' => $max,
                    'min' => $min
                ];
            }

            // 6. Revenue Statistics - Only for Admin (for CURRENT YEAR)
            $totalRevenue = 0;
            $monthlyRevenue = 0;

            if ($isAdmin) {
                $totalRevenue = Payment::where('paymentStatus', 'Paid')
                    ->where('academicYear', $currentYear)
                    ->sum('amount');
                $monthlyRevenue = Payment::where('paymentStatus', 'Paid')
                    ->where('academicYear', $currentYear)
                    ->whereRaw("CAST(JSON_EXTRACT(remark, '$.year') AS UNSIGNED) = ?", [$currentYear])
                    ->whereRaw("CAST(JSON_EXTRACT(remark, '$.month') AS UNSIGNED) = ?", [$currentMonth])
                    ->sum('amount');
            }

            // 7. Overall Attendance Rate (for Staff) - For CURRENT YEAR only
            $overallAttendanceRate = 0;
            if ($isStaff && !empty($staffClassIds)) {
                $attendanceStats = DB::table('attendance')
                    ->whereIn('attendance.classId', $staffClassIds)
                    ->where('attendance.academicYear', $currentYear)
                    ->select(
                        DB::raw('COUNT(CASE WHEN attendance.status = "Present" THEN 1 END) as presentCount'),
                        DB::raw('COUNT(*) as totalCount')
                    )
                    ->first();

                if ($attendanceStats && $attendanceStats->totalCount > 0) {
                    $overallAttendanceRate = round(($attendanceStats->presentCount / $attendanceStats->totalCount) * 100, 1);
                }
            }

            // 8. Recent Registrations - For CURRENT YEAR only
            $recentRegistrationsQuery = Registration::with(['student:studentId,name,email'])
                ->where('enrollmentYear', $currentYear)
                ->orderBy('createdAt', 'desc')
                ->limit(5);

            // Filter by staff's classes if staff
            if ($isStaff && !empty($staffClassIds)) {
                $recentRegistrationsQuery->where(function ($q) use ($staffClassIds) {
                    foreach ($staffClassIds as $classId) {
                        $q->orWhereRaw("FIND_IN_SET(?, classIds)", [$classId]);
                    }
                });
            }

            $recentRegistrations = $recentRegistrationsQuery->get()
                ->map(function ($reg) {
                    return [
                        'id' => $reg->registrationId,
                        'studentName' => $reg->student->name ?? 'Unknown',
                        'email' => $reg->student->email ?? '',
                        'status' => $reg->status,
                        'date' => $reg->createdAt
                    ];
                });

            // 9. Students by Subject (Admin only) - For CURRENT YEAR only
            $studentsBySubject = [];
            if ($isAdmin) {
                $studentsBySubject = DB::table('registration')
                    ->join('class', function ($join) {
                        $join->on(DB::raw("FIND_IN_SET(class.classId, registration.classIds)"), '>', DB::raw('0'));
                    })
                    ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                    ->where('registration.status', 'Approved')
                    ->where('registration.enrollmentYear', $currentYear)
                    ->where('class.academicYear', $currentYear)
                    ->select(
                        'subject.subjectId',
                        'subject.name as subjectName',
                        'subject.form',
                        DB::raw('COUNT(DISTINCT registration.studentId) as studentCount')
                    )
                    ->groupBy('subject.subjectId', 'subject.name', 'subject.form')
                    ->orderBy('subject.form')
                    ->orderBy('subject.name')
                    ->get()
                    ->map(function ($item) {
                        return [
                            'subjectId' => $item->subjectId,
                            'subject' => $item->subjectName . ' (' . $item->form . ')',
                            'studentCount' => $item->studentCount
                        ];
                    });
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'userRole' => $isAdmin ? 'admin' : 'staff',
                    'staffId' => $staffId,
                    'overallAttendanceRate' => $overallAttendanceRate,
                    'classes' => $allClasses->map(function ($item) {
                        return [
                            'classId' => $item->classId,
                            'name' => $item->subjectName . ' (' . $item->form . ') - ' .
                                $item->classDay . ' ' . substr($item->startTime, 0, 5)
                        ];
                    }),
                    'overview' => [
                        'totalStudents' => $totalStudents,
                        'totalStaff' => $totalStaff,
                        'totalClasses' => $totalClasses,
                        'pendingApplications' => $pendingApplications,
                        'totalRevenue' => $totalRevenue,
                        'monthlyRevenue' => $monthlyRevenue
                    ],
                    'activeStudentsByMonth' => $activeStudentsByMonth,
                    'paymentStatus' => $paymentStatusData,
                    'attendanceByClass' => [
                        'all' => $attendanceByClass,
                        'overall' => $attendanceByClassOverall
                    ],
                    'testMarksByClass' => [
                        'all' => $testMarksByClass,
                        'overall' => $testMarksByClassOverall
                    ],
                    'studentsBySubject' => $studentsBySubject,
                    'recentRegistrations' => $recentRegistrations
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('getStaffAdminDashboardStats failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch dashboard statistics'
            ], 500);
        }
    }
}

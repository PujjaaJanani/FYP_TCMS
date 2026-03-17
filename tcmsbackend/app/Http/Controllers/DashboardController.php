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

            // Get student's approved registrations
            $registrations = Registration::where('studentId', $studentId)
                ->where('status', 'Approved')
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

            // Get all class IDs from registrations
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
                ->select('subject.subjectId', 'subject.name as subjectName', 'subject.form')
                ->distinct()
                ->orderBy('subject.form')
                ->orderBy('subject.name')
                ->get();

            // Get all registration IDs for this student
            $registrationIds = $registrations->pluck('registrationId')->toArray();

            // Calculate total monthly fee
            $totalMonthlyFee = $registrations->sum('monthlyFee');

            // Get attendance statistics
            Log::info('=== Student Attendance Debug Start ===');
            Log::info('Student ID: ' . $studentId);
            Log::info('Registration IDs: ' . json_encode($registrationIds));
            
            $attendanceStats = DB::table('attendance')
                ->whereIn('attendance.registrationId', $registrationIds)
                ->select(
                    DB::raw('COUNT(CASE WHEN status = "Present" THEN 1 END) as presentCount'),
                    DB::raw('COUNT(CASE WHEN status = "Absent" THEN 1 END) as absentCount'),
                    DB::raw('COUNT(*) as totalCount')
                )
                ->first();

            Log::info('Overall Attendance Stats: Present=' . $attendanceStats->presentCount . 
                     ', Absent=' . $attendanceStats->absentCount . 
                     ', Total=' . $attendanceStats->totalCount);

            // Get all attendance records for debugging
            $allAttendanceRecords = DB::table('attendance')
                ->whereIn('registrationId', $registrationIds)
                ->select('attendanceId', 'date', 'status', 'classId', 'registrationId')
                ->get();
            
            Log::info('All Attendance Records (' . count($allAttendanceRecords) . ' total):');
            foreach ($allAttendanceRecords as $record) {
                Log::info('  - ID=' . $record->attendanceId . 
                         ', Date=' . $record->date . 
                         ', Status=' . $record->status . 
                         ', ClassID=' . $record->classId . 
                         ', RegID=' . $record->registrationId);
            }

            // Get attendance by subject
            $attendanceBySubject = [];
            foreach ($subjects as $subject) {
                $subjectClassIds = DB::table('class')
                    ->where('subjectId', $subject->subjectId)
                    ->pluck('classId')
                    ->toArray();

                Log::info('Subject: ' . $subject->subjectName . ' (ID=' . $subject->subjectId . ')');
                Log::info('  Class IDs for this subject: ' . json_encode($subjectClassIds));

                // Direct attendance query without join to avoid duplicates
                $subjectAttendance = DB::table('attendance')
                    ->whereIn('attendance.registrationId', $registrationIds)
                    ->whereIn('attendance.classId', $subjectClassIds)
                    ->select(
                        DB::raw('COUNT(CASE WHEN attendance.status = "Present" THEN 1 END) as present'),
                        DB::raw('COUNT(CASE WHEN attendance.status = "Absent" THEN 1 END) as absent'),
                        DB::raw('COUNT(*) as total')
                    )
                    ->first();

                Log::info('  Attendance: Present=' . $subjectAttendance->present . 
                         ', Absent=' . $subjectAttendance->absent . 
                         ', Total=' . $subjectAttendance->total);

                // Get actual records for this subject
                $subjectRecords = DB::table('attendance')
                    ->whereIn('registrationId', $registrationIds)
                    ->whereIn('classId', $subjectClassIds)
                    ->select('attendanceId', 'date', 'status', 'classId')
                    ->get();
                
                Log::info('  Subject Records (' . count($subjectRecords) . '):');
                foreach ($subjectRecords as $rec) {
                    Log::info('    - ID=' . $rec->attendanceId . 
                             ', Date=' . $rec->date . 
                             ', Status=' . $rec->status . 
                             ', ClassID=' . $rec->classId);
                }

                $attendanceBySubject[] = [
                    'subjectId' => $subject->subjectId,
                    'subjectName' => $subject->subjectName . ' (' . $subject->form . ')',
                    'present' => $subjectAttendance->present ?? 0,
                    'absent' => $subjectAttendance->absent ?? 0,
                    'total' => $subjectAttendance->total ?? 0
                ];
            }
            
            Log::info('=== Student Attendance Debug End ===');

            // Get test marks
            $testMarks = DB::table('testmark')
                ->join('class', 'testmark.classId', '=', 'class.classId')
                ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                ->whereIn('testmark.registrationId', $registrationIds)
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

            // Get upcoming classes (next 7 days)
            $today = Carbon::now();
            $nextWeek = Carbon::now()->addDays(7);
            
            $upcomingClasses = DB::table('class')
                ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                ->join('authority', 'class.authorityId', '=', 'authority.authorityId')
                ->whereIn('class.classId', $allClassIds)
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

            // Get current month payment status
            $currentMonth = Carbon::now()->month;
            $currentYear = Carbon::now()->year;
            
            $currentMonthPayment = Payment::whereIn('registrationId', $registrationIds)
                ->where(function($query) use ($currentYear, $currentMonth) {
                    $query->where(function($q) use ($currentYear, $currentMonth) {
                        // Check remark JSON for current month
                        $q->whereRaw("JSON_EXTRACT(remark, '$.year') = ?", [$currentYear])
                          ->whereRaw("JSON_EXTRACT(remark, '$.month') = ?", [$currentMonth]);
                    })
                    ->orWhere(function($q) use ($currentYear, $currentMonth) {
                        // Also check datePaid for current month
                        $q->where('paymentStatus', 'Paid')
                          ->whereYear('datePaid', $currentYear)
                          ->whereMonth('datePaid', $currentMonth);
                    });
                })
                ->first();

            $paymentStatus = 'Pending';
            if ($currentMonthPayment && $currentMonthPayment->paymentStatus === 'Paid') {
                $paymentStatus = 'Paid';
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'userRole' => 'student',
                    'studentName' => $user->name,
                    'totalClasses' => count($allClassIds),
                    'monthlyFee' => $totalMonthlyFee,
                    'paymentStatus' => $paymentStatus,
                    'totalTests' => count($testMarks),
                    'overallAttendance' => $attendanceStats->totalCount > 0 
                        ? round(($attendanceStats->presentCount / $attendanceStats->totalCount) * 100, 1)
                        : 0,
                    'subjects' => $subjects->map(function($subject) {
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

            if ($user->role === 'Admin') {
                $isAdmin = true;
            } else {
                $isStaff = true;
                $staffId = $user->authorityId;
            }

            // Get current month and year
            $currentMonth = Carbon::now()->month;
            $currentYear = Carbon::now()->year;

            // Get all classes for dropdown (filtered by user role)
            $allClasses = [];
            if ($isAdmin) {
                $allClasses = DB::table('class')
                    ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                    ->join('authority', 'class.authorityId', '=', 'authority.authorityId')
                    ->select(
                        'class.classId',
                        'subject.name as subjectName',
                        'subject.form',
                        'class.classDay',
                        'class.startTime',
                        'class.finishTime',
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
                    ->select(
                        'class.classId',
                        'subject.name as subjectName',
                        'subject.form',
                        'class.classDay',
                        'class.startTime',
                        'class.finishTime',
                        'authority.name as teacherName'
                    )
                    ->orderBy('subject.form')
                    ->orderBy('subject.name')
                    ->orderBy('class.classDay')
                    ->get();
            }

            // 1. Overview Statistics
            $totalStudents = Registration::where('status', 'Approved')->distinct('studentId')->count();
            $totalStaff = Authority::where('role', 'Staff')->count();
            $totalClasses = DB::table('class')->count();
            $pendingApplications = Registration::where('status', 'Pending')->count();

            // For staff, only count their classes and students
            $staffClasses = [];
            $staffClassIds = [];
            if ($isStaff) {
                $staffClasses = DB::table('class')
                    ->where('authorityId', $staffId)
                    ->get();
                $totalClasses = $staffClasses->count();
                
                // Count students in staff's classes
                $staffClassIds = $staffClasses->pluck('classId')->toArray();
                
                if (!empty($staffClassIds)) {
                    $totalStudents = Registration::where('status', 'Approved')
                        ->where(function($query) use ($staffClassIds) {
                            foreach ($staffClassIds as $classId) {
                                $query->orWhereRaw("FIND_IN_SET(?, classIds)", [$classId]);
                            }
                        })
                        ->distinct('studentId')
                        ->count();
                }
            }

            // 2. Active Students by Month (Last 6 months) - Overall
            $activeStudentsByMonth = [];
            for ($i = 5; $i >= 0; $i--) {
                $month = Carbon::now()->subMonths($i);
                $monthName = $month->format('M Y');
                
                $query = Registration::where('status', 'Approved')
                    ->whereYear('createdAt', $month->year)
                    ->whereMonth('createdAt', $month->month);
                
                // Filter by staff's classes if staff
                if ($isStaff && !empty($staffClassIds)) {
                    $query->where(function($q) use ($staffClassIds) {
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

            // 3. Payment Status of Current Month
            // Get total active students (those with approved registrations)
            $totalActiveStudentsQuery = Registration::where('status', 'Approved');
            
            // Filter by staff's classes if staff
            if ($isStaff && !empty($staffClassIds)) {
                $totalActiveStudentsQuery->where(function($q) use ($staffClassIds) {
                    foreach ($staffClassIds as $classId) {
                        $q->orWhereRaw("FIND_IN_SET(?, classIds)", [$classId]);
                    }
                });
            }
            
            $totalActiveStudents = $totalActiveStudentsQuery->distinct()->count('studentId');
            
            // Get distinct students who have PAID for current month
            $paidStudentIds = DB::table('payment')
                ->join('registration', 'payment.registrationId', '=', 'registration.registrationId')
                ->where('payment.paymentStatus', 'Paid')
                ->whereYear('payment.datePaid', $currentYear)
                ->whereMonth('payment.datePaid', $currentMonth)
                ->when($isStaff && !empty($staffClassIds), function($query) use ($staffClassIds) {
                    return $query->where(function($q) use ($staffClassIds) {
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

            // 4. Attendance by Class - All classes for dropdown
            $attendanceByClass = [];
            $attendanceByClassOverall = [];
            
            foreach ($allClasses as $class) {
                $attendanceQuery = DB::table('attendance')
                    ->where('attendance.classId', $class->classId);
                
                $stats = $attendanceQuery
                    ->select(
                        DB::raw('COUNT(CASE WHEN attendance.status = "Present" THEN 1 END) as presentCount'),
                        DB::raw('COUNT(*) as totalCount')
                    )
                    ->first();
                
                $attendanceByClass[] = [
                    'classId' => $class->classId,
                    'subject' => $class->subjectName . ' (' . $class->form . ')',
                    'classDay' => $class->classDay,
                    'classTime' => substr($class->startTime, 0, 5),
                    'attendanceRate' => $stats->totalCount > 0 
                        ? round(($stats->presentCount / $stats->totalCount) * 100, 1) 
                        : 0
                ];
                
                // Add to overall average
                if ($stats->totalCount > 0) {
                    $attendanceByClassOverall[] = [
                        'subject' => $class->subjectName . ' (' . $class->form . ') - ' . $class->classDay,
                        'attendanceRate' => round(($stats->presentCount / $stats->totalCount) * 100, 1)
                    ];
                }
            }

            // 5. Test Marks by Class - All classes for dropdown
            $testMarksByClass = [];
            $testMarksByClassOverall = [];
            
            foreach ($allClasses as $class) {
                $testMarksQuery = DB::table('testmark')
                    ->where('testmark.classId', $class->classId);
                
                $stats = $testMarksQuery
                    ->select(
                        DB::raw('AVG(testmark.mark) as averageMark'),
                        DB::raw('MAX(testmark.mark) as maxMark'),
                        DB::raw('MIN(testmark.mark) as minMark')
                    )
                    ->first();
                
                $testMarksByClass[] = [
                    'classId' => $class->classId,
                    'subject' => $class->subjectName . ' (' . $class->form . ')',
                    'classDay' => $class->classDay,
                    'classTime' => substr($class->startTime, 0, 5),
                    'average' => round($stats->averageMark ?? 0, 1),
                    'max' => $stats->maxMark ?? 0,
                    'min' => $stats->minMark ?? 0
                ];
                
                // Add to overall list if has marks
                if ($stats->averageMark) {
                    $testMarksByClassOverall[] = [
                        'subject' => $class->subjectName . ' (' . $class->form . ') - ' . $class->classDay,
                        'average' => round($stats->averageMark, 1),
                        'max' => $stats->maxMark,
                        'min' => $stats->minMark
                    ];
                }
            }

            // 6. Revenue Statistics - Only for Admin
            $totalRevenue = 0;
            $monthlyRevenue = 0;
            
            if ($isAdmin) {
                $totalRevenue = Payment::where('paymentStatus', 'Paid')->sum('amount');
                $monthlyRevenue = Payment::where('paymentStatus', 'Paid')
                    ->whereYear('datePaid', $currentYear)
                    ->whereMonth('datePaid', $currentMonth)
                    ->sum('amount');
            }

            // 7. Overall Attendance Rate (for Staff)
            $overallAttendanceRate = 0;
            if ($isStaff && !empty($staffClassIds)) {
                $attendanceStats = DB::table('attendance')
                    ->whereIn('attendance.classId', $staffClassIds)
                    ->select(
                        DB::raw('COUNT(CASE WHEN attendance.status = "Present" THEN 1 END) as presentCount'),
                        DB::raw('COUNT(*) as totalCount')
                    )
                    ->first();
                
                if ($attendanceStats && $attendanceStats->totalCount > 0) {
                    $overallAttendanceRate = round(($attendanceStats->presentCount / $attendanceStats->totalCount) * 100, 1);
                }
            }

            // 8. Recent Registrations
            $recentRegistrationsQuery = Registration::with(['student:studentId,name,email'])
                ->orderBy('createdAt', 'desc')
                ->limit(5);
            
            // Filter by staff's classes if staff
            if ($isStaff && !empty($staffClassIds)) {
                $recentRegistrationsQuery->where(function($q) use ($staffClassIds) {
                    foreach ($staffClassIds as $classId) {
                        $q->orWhereRaw("FIND_IN_SET(?, classIds)", [$classId]);
                    }
                });
            }
            
            $recentRegistrations = $recentRegistrationsQuery->get()
                ->map(function($reg) {
                    return [
                        'id' => $reg->registrationId,
                        'studentName' => $reg->student->name ?? 'Unknown',
                        'email' => $reg->student->email ?? '',
                        'status' => $reg->status,
                        'date' => $reg->createdAt
                    ];
                });

            // 9. Students by Subject (Admin only)
            $studentsBySubject = [];
            if ($isAdmin) {
                $studentsBySubject = DB::table('registration')
                    ->join('class', function($join) {
                        $join->on(DB::raw("FIND_IN_SET(class.classId, registration.classIds)"), '>', DB::raw('0'));
                    })
                    ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                    ->where('registration.status', 'Approved')
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
                    ->map(function($item) {
                        return [
                            'subjectId' => $item->subjectId,
                            'subject' => $item->subjectName . ' (' . $item->form . ')',
                            'studentCount' => $item->studentCount
                        ];
                    });
            }

            // 10. Class list for staff (for dropdowns)
            $staffClassList = [];
            if ($isStaff) {
                $staffClassList = DB::table('class')
                    ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                    ->where('class.authorityId', $staffId)
                    ->select(
                        'class.classId',
                        'subject.name as subjectName',
                        'subject.form',
                        'class.classDay',
                        'class.startTime',
                        'class.finishTime'
                    )
                    ->orderBy('subject.form')
                    ->orderBy('subject.name')
                    ->orderBy('class.classDay')
                    ->get()
                    ->map(function($item) {
                        return [
                            'classId' => $item->classId,
                            'className' => $item->subjectName . ' (' . $item->form . ') - ' . $item->classDay . ' ' . substr($item->startTime, 0, 5),
                            'subjectName' => $item->subjectName . ' (' . $item->form . ')'
                        ];
                    });
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'userRole' => $isAdmin ? 'admin' : 'staff',
                    'staffId' => $staffId,
                    'overallAttendanceRate' => $overallAttendanceRate,
                    'classes' => $allClasses->map(function($item) {
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
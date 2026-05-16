<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Student;
use App\Models\Registration;
use App\Models\Attendance;
use App\Models\TestMark;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class ParentDashboardController extends Controller
{
    /**
     * Get all children linked to this parent account
     */
    public function getChildren(Request $request)
    {
        try {
            $user = $request->user();
            $currentYear = Carbon::now()->year;
            $currentMonth = Carbon::now()->month;
            
            if (!$user || !$user->parentEmail) {
                return response()->json([
                    'success' => false,
                    'message' => 'Parent account not found'
                ], 404);
            }

            $children = Student::where('parentEmail', $user->parentEmail)
                ->select('studentId', 'name', 'email')
                ->get()
                ->map(function ($child) use ($currentYear, $currentMonth) {
                    $registrations = Registration::where('studentId', $child->studentId)
                        ->where('status', 'Approved')
                        ->where('enrollmentYear', $currentYear)
                        ->get(['registrationId', 'monthlyFee']);

                    $registrationIds = $registrations->pluck('registrationId')->toArray();

                    $paidMonths = collect();
                    if (!empty($registrationIds)) {
                        $paidMonths = Payment::whereIn('registrationId', $registrationIds)
                            ->where('academicYear', $currentYear)
                            ->where('paymentStatus', 'Paid')
                            ->whereRaw("CAST(JSON_EXTRACT(remark, '$.year') AS UNSIGNED) = ?", [$currentYear])
                            ->whereRaw("CAST(JSON_EXTRACT(remark, '$.month') AS UNSIGNED) BETWEEN 1 AND ?", [$currentMonth])
                            ->selectRaw("DISTINCT CAST(JSON_EXTRACT(remark, '$.month') AS UNSIGNED) as paid_month")
                            ->pluck('paid_month')
                            ->map(fn($m) => (int)$m)
                            ->unique()
                            ->values();
                    }

                    $child->paymentStatus = ($paidMonths->count() < $currentMonth) ? 'Pending' : 'Paid';
                    $child->monthlyFee = (float) $registrations->sum('monthlyFee');

                    return $child;
                })
                ->values();

            return response()->json([
                'success' => true,
                'data' => $children
            ]);

        } catch (\Exception $e) {
            Log::error('getChildren failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch children'
            ], 500);
        }
    }

    /**
     * Get dashboard statistics for a specific child and year
     */
    public function getDashboardStats(Request $request)
    {
        try {
            $user = $request->user();
            $studentId = $request->query('studentId');
            $year = $request->query('year', Carbon::now()->year);

            if (!$user || !$user->parentEmail) {
                return response()->json([
                    'success' => false,
                    'message' => 'Parent account not found'
                ], 404);
            }

            // Verify the student belongs to this parent
            $student = Student::where('studentId', $studentId)
                ->where('parentEmail', $user->parentEmail)
                ->first();

            if (!$student) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student not found or not linked to this parent'
                ], 404);
            }

            // Get student's approved registrations for the selected year
            $registrations = Registration::where('studentId', $studentId)
                ->where('status', 'Approved')
                ->where('enrollmentYear', $year)
                ->get();

            if ($registrations->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'studentName' => $student->name,
                        'year' => (int)$year,
                        'hasData' => false,
                        'message' => 'No registration found for this year'
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
                ->where('class.academicYear', $year)
                ->select('subject.subjectId', 'subject.name as subjectName', 'subject.form')
                ->distinct()
                ->orderBy('subject.form')
                ->orderBy('subject.name')
                ->get();

            // Get all registration IDs for this student
            $registrationIds = $registrations->pluck('registrationId')->toArray();

            // Get attendance statistics for selected year
            $attendanceStats = DB::table('attendance')
                ->whereIn('attendance.registrationId', $registrationIds)
                ->where('attendance.academicYear', $year)
                ->select(
                    DB::raw('COUNT(CASE WHEN status = "Present" THEN 1 END) as presentCount'),
                    DB::raw('COUNT(CASE WHEN status = "Absent" THEN 1 END) as absentCount'),
                    DB::raw('COUNT(*) as totalCount')
                )
                ->first();

            // Get attendance by subject
            $attendanceBySubject = [];
            foreach ($subjects as $subject) {
                $subjectClassIds = DB::table('class')
                    ->where('subjectId', $subject->subjectId)
                    ->where('academicYear', $year)
                    ->pluck('classId')
                    ->toArray();

                $subjectAttendance = DB::table('attendance')
                    ->whereIn('attendance.registrationId', $registrationIds)
                    ->whereIn('attendance.classId', $subjectClassIds)
                    ->where('attendance.academicYear', $year)
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

            // Get test marks data for line chart (ordered by date)
            $testMarks = DB::table('testmark')
                ->join('class', 'testmark.classId', '=', 'class.classId')
                ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                ->whereIn('testmark.registrationId', $registrationIds)
                ->where('testmark.academicYear', $year)
                ->select(
                    'testmark.mark',
                    'testmark.testName',
                    'testmark.testDate',
                    'subject.subjectId',
                    'subject.name as subjectName',
                    'subject.form'
                )
                ->orderBy('testmark.testDate', 'asc')
                ->get();

            // Group test marks by subject for line chart
            $testMarksBySubject = [];
            foreach ($testMarks as $test) {
                $subjectKey = $test->subjectId;
                if (!isset($testMarksBySubject[$subjectKey])) {
                    $testMarksBySubject[$subjectKey] = [
                        'subjectId' => $test->subjectId,
                        'subjectName' => $test->subjectName . ' (' . $test->form . ')',
                        'data' => []
                    ];
                }
                $testMarksBySubject[$subjectKey]['data'][] = [
                    'testName' => $test->testName,
                    'testDate' => $test->testDate,
                    'mark' => $test->mark
                ];
            }

            // Calculate overall attendance rate
            $overallAttendance = 0;
            if ($attendanceStats->totalCount > 0) {
                $overallAttendance = round(($attendanceStats->presentCount / $attendanceStats->totalCount) * 100, 1);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'studentName' => $student->name,
                    'studentId' => $student->studentId,
                    'year' => (int)$year,
                    'hasData' => true,
                    'overallAttendance' => $overallAttendance,
                    'attendance' => [
                        'present' => $attendanceStats->presentCount ?? 0,
                        'absent' => $attendanceStats->absentCount ?? 0,
                        'total' => $attendanceStats->totalCount ?? 0
                    ],
                    'attendanceBySubject' => $attendanceBySubject,
                    'testMarksBySubject' => array_values($testMarksBySubject),
                    'subjects' => $subjects->map(function($subject) {
                        return [
                            'subjectId' => $subject->subjectId,
                            'subjectName' => $subject->subjectName . ' (' . $subject->form . ')'
                        ];
                    })
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Parent dashboard stats failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch dashboard statistics'
            ], 500);
        }
    }

    /**
     * Get available years for a specific child
     */
    public function getAvailableYears(Request $request, $studentId)
    {
        try {
            $user = $request->user();

            // Verify the student belongs to this parent
            $student = Student::where('studentId', $studentId)
                ->where('parentEmail', $user->parentEmail)
                ->first();

            if (!$student) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student not found or not linked to this parent'
                ], 404);
            }

            // Get years where student has approved registrations
            $years = DB::table('registration')
                ->where('studentId', $studentId)
                ->where('status', 'Approved')
                ->select('enrollmentYear')
                ->distinct()
                ->orderBy('enrollmentYear', 'desc')
                ->pluck('enrollmentYear')
                ->toArray();

            return response()->json([
                'success' => true,
                'data' => $years,
                'current_year' => Carbon::now()->year
            ]);

        } catch (\Exception $e) {
            Log::error('getAvailableYears failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch available years'
            ], 500);
        }
    }
}

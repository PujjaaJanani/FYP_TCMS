<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Authority;
use App\Models\Attendance;
use App\Models\Registration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class AttendanceController extends Controller
{
    private function authorityCanAccessClass(Request $request, $classId): bool
    {
        $user = $request->user();

        if ($user instanceof Authority) {
            if ($user->role === 'Admin') {
                return true;
            }

            return DB::table('class')
                ->where('classId', $classId)
                ->where('authorityId', $user->authorityId)
                ->exists();
        }

        return false;
    }

    /**
     * Get all classes for the logged-in staff member for CURRENT ACADEMIC YEAR only
     */
    public function getMyClasses(Request $request)
    {
        try {
            $user = $request->user();
            $authorityId = $user->getKey();
            $currentYear = date('Y');

            $classes = DB::table('class')
                ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                ->where('class.authorityId', $authorityId)
                ->where('class.academicYear', $currentYear)
                ->select(
                    'class.classId',
                    'class.classDay',
                    'class.startTime',
                    'class.finishTime',
                    'class.location',
                    'class.academicYear',
                    'subject.name as subjectName',
                    'subject.form'
                )
                ->orderBy('class.classDay')
                ->orderBy('class.startTime')
                ->get()
                ->map(function ($c) {
                    $c->startTime = date('H:i', strtotime($c->startTime));
                    $c->finishTime = date('H:i', strtotime($c->finishTime));
                    return $c;
                });

            return response()->json([
                'success' => true,
                'data' => $classes,
                'academic_year' => $currentYear
            ]);

        } catch (\Exception $e) {
            Log::error('getMyClasses failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch classes'
            ], 500);
        }
    }

    /**
     * Get students for a class to record attendance (only current year students)
     */
    public function getClassStudents($classId)
    {
        try {
            if (!request()->user() instanceof Authority || !$this->authorityCanAccessClass(request(), $classId)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Forbidden'
                ], 403);
            }

            $currentYear = date('Y');

            // Get all approved registrations for this class for current year only
            $registrations = Registration::where('status', 'Approved')
                ->where('enrollmentYear', $currentYear)
                ->join('student', 'registration.studentId', '=', 'student.studentId')
                ->select(
                    'registration.registrationId',
                    'registration.classId',
                    'registration.classIds',
                    'student.studentId',
                    'student.name as studentName'
                )
                ->orderBy('student.name')
                ->get();

            // Filter students registered for this specific class
            $filteredStudents = $registrations->filter(function ($reg) use ($classId) {
                // Check if main classId matches
                if ($reg->classId == $classId) {
                    return true;
                }

                // Check if classIds contains this classId
                if ($reg->classIds) {
                    $classIdsArray = array_map('trim', explode(',', $reg->classIds));
                    return in_array((string) $classId, $classIdsArray);
                }

                return false;
            });

            // Remove duplicates
            $uniqueStudents = $filteredStudents->unique('studentId')->values();

            return response()->json([
                'success' => true,
                'data' => $uniqueStudents->map(function ($student) {
                    return [
                        'registrationId' => $student->registrationId,
                        'studentId' => $student->studentId,
                        'studentName' => $student->studentName
                    ];
                }),
                'academic_year' => $currentYear
            ]);

        } catch (\Exception $e) {
            Log::error('getClassStudents failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch students'
            ], 500);
        }
    }

    /**
     * Submit attendance for a class
     */
    public function submitAttendance(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'classId' => 'required|integer|exists:class,classId',
            'authorityId' => 'required|integer|exists:authority,authorityId',
            'date' => 'required|date',
            'attendance' => 'required|array|min:1',
            'attendance.*.registrationId' => 'required|integer|exists:registration,registrationId',
            'attendance.*.status' => 'required|in:Present,Absent'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            $currentYear = date('Y');

            // Check if attendance already exists for this class and date - using raw where with DATE()
            $existingAttendance = Attendance::where('classId', $request->classId)
                ->where('academicYear', $currentYear)
                ->where(DB::raw('DATE(date)'), '=', $request->date)
                ->first();

            if ($existingAttendance) {
                // Delete existing attendance for this date - using raw where with DATE()
                Attendance::where('classId', $request->classId)
                    ->where('academicYear', $currentYear)
                    ->where(DB::raw('DATE(date)'), '=', $request->date)
                    ->delete();
            }

            // Insert new attendance records
            foreach ($request->attendance as $record) {
                Attendance::create([
                    'classId' => $request->classId,
                    'authorityId' => $request->authorityId,
                    'registrationId' => $record['registrationId'],
                    'date' => $request->date,
                    'status' => $record['status'],
                    'academicYear' => $currentYear
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Attendance recorded successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('submitAttendance failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to record attendance: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get attendance history for a class (only current year)
     */
    public function getClassAttendanceHistory($classId)
    {
        try {
            if (!request()->user() instanceof Authority || !$this->authorityCanAccessClass(request(), $classId)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Forbidden'
                ], 403);
            }

            $currentYear = date('Y');

            $attendanceRecords = DB::table('attendance')
                ->where('attendance.classId', $classId)
                ->where('attendance.academicYear', $currentYear)
                ->join('registration', 'attendance.registrationId', '=', 'registration.registrationId')
                ->join('student', 'registration.studentId', '=', 'student.studentId')
                ->select(
                    'attendance.attendanceId',
                    'attendance.date',
                    'attendance.status',
                    'student.name as studentName',
                    'student.studentId'
                )
                ->orderBy('attendance.date', 'desc')
                ->get()
                ->groupBy(function ($item) {
                    return date('Y-m-d', strtotime($item->date));
                });

            $result = [];
            foreach ($attendanceRecords as $date => $records) {
                $presentCount = $records->where('status', 'Present')->count();
                $absentCount = $records->where('status', 'Absent')->count();

                $result[] = [
                    'date' => $date,
                    'totalStudents' => $records->count(),
                    'presentCount' => $presentCount,
                    'absentCount' => $absentCount,
                    'records' => $records
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $result,
                'academic_year' => $currentYear
            ]);

        } catch (\Exception $e) {
            Log::error('getClassAttendanceHistory failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch attendance history'
            ], 500);
        }
    }

    /**
     * Get attendance for a specific date (only current year)
     */
    public function getAttendanceByDate($classId, $date)
    {
        try {
            if (!request()->user() instanceof Authority || !$this->authorityCanAccessClass(request(), $classId)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Forbidden'
                ], 403);
            }

            $currentYear = date('Y');

            $attendance = DB::table('attendance')
                ->where('attendance.classId', $classId)
                ->where('attendance.academicYear', $currentYear)
                ->where(DB::raw('DATE(attendance.date)'), '=', $date)
                ->join('registration', 'attendance.registrationId', '=', 'registration.registrationId')
                ->join('student', 'registration.studentId', '=', 'student.studentId')
                ->select(
                    'attendance.attendanceId',
                    'attendance.registrationId',
                    'attendance.status',
                    'student.name as studentName',
                    'student.studentId'
                )
                ->orderBy('student.name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $attendance,
                'academic_year' => $currentYear
            ]);

        } catch (\Exception $e) {
            Log::error('getAttendanceByDate failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch attendance'
            ], 500);
        }
    }

    /**
     * Delete attendance for a specific date (only current year)
     */
    public function deleteAttendanceByDate($classId, $date)
    {
        try {
            $currentYear = date('Y');

            $deleted = DB::table('attendance')
                ->where('classId', $classId)
                ->where('academicYear', $currentYear)
                ->where(DB::raw('DATE(date)'), '=', $date)
                ->delete();

            if ($deleted > 0) {
                Log::info('Attendance deleted', [
                    'classId' => $classId,
                    'date' => $date,
                    'recordsDeleted' => $deleted,
                    'academicYear' => $currentYear
                ]);

                return response()->json([
                    'success' => true,
                    'message' => 'Attendance record deleted successfully'
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'No attendance record found for this date'
                ], 404);
            }

        } catch (\Exception $e) {
            Log::error('deleteAttendanceByDate failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete attendance'
            ], 500);
        }
    }

    /**
     * Get attendance history for a class by academic year (archive view)
     */
public function getClassAttendanceHistoryByYear($classId, Request $request)
{
    try {
        $academicYear = $request->query('academicYear');

        if (empty($academicYear)) {
            return response()->json([
                'success' => false,
                'message' => 'Academic year is required'
            ], 422);
        }

        if (!($request->user() instanceof Authority) || !$this->authorityCanAccessClass($request, $classId)) {
            return response()->json([
                'success' => false,
                'message' => 'Forbidden'
            ], 403);
        }

        // Add debug logging
        \Log::info('Fetching attendance history', [
            'classId' => $classId,
            'academicYear' => $academicYear
        ]);

        $attendanceRecords = DB::table('attendance')
            ->where('attendance.classId', $classId)
            ->where('attendance.academicYear', $academicYear)
            ->join('registration', 'attendance.registrationId', '=', 'registration.registrationId')
            ->join('student', 'registration.studentId', '=', 'student.studentId')
            ->select(
                'attendance.attendanceId',
                'attendance.date',
                'attendance.status',
                'student.name as studentName',
                'student.studentId',
                'registration.registrationId'
            )
            ->orderBy('attendance.date', 'desc')
            ->get();

        // Add debug logging
        \Log::info('Attendance records found', [
            'count' => $attendanceRecords->count(),
            'records' => $attendanceRecords->toArray()
        ]);

        if ($attendanceRecords->isEmpty()) {
            return response()->json([
                'success' => true,
                'data' => []
            ]);
        }

        $groupedRecords = $attendanceRecords->groupBy(function($item) {
            return date('Y-m-d', strtotime($item->date));
        });

        $result = [];
        foreach ($groupedRecords as $date => $records) {
            $presentCount = $records->where('status', 'Present')->count();
            $absentCount = $records->where('status', 'Absent')->count();
            
            $result[] = [
                'date' => $date,
                'totalStudents' => $records->count(),
                'presentCount' => $presentCount,
                'absentCount' => $absentCount,
                'records' => $records
            ];
        }

        return response()->json([
            'success' => true,
            'data' => $result,
            'academic_year' => (int) $academicYear
        ]);

    } catch (\Exception $e) {
        \Log::error('getClassAttendanceHistoryByYear failed: ' . $e->getMessage());
        return response()->json([
            'success' => false,
            'message' => 'Failed to fetch attendance history: ' . $e->getMessage()
        ], 500);
    }
}

    /**
     * Get attendance for a specific date by academic year (archive view)
     */
    public function getAttendanceByDateByYear($classId, $date, Request $request)
    {
        try {
            $academicYear = $request->query('academicYear');

            if (empty($academicYear)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Academic year is required'
                ], 422);
            }

            if (!($request->user() instanceof Authority) || !$this->authorityCanAccessClass($request, $classId)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Forbidden'
                ], 403);
            }

            Log::info('Fetching attendance details archive', [
                'classId' => $classId,
                'date' => $date,
                'academicYear' => $academicYear
            ]);

            $attendance = DB::table('attendance')
                ->where('attendance.classId', $classId)
                ->where('attendance.academicYear', $academicYear)
                ->where(DB::raw('DATE(attendance.date)'), '=', $date)
                ->join('registration', 'attendance.registrationId', '=', 'registration.registrationId')
                ->join('student', 'registration.studentId', '=', 'student.studentId')
                ->select(
                    'attendance.attendanceId',
                    'attendance.registrationId',
                    'attendance.status',
                    'student.name as studentName',
                    'student.studentId'
                )
                ->orderBy('student.name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $attendance,
                'academic_year' => (int) $academicYear
            ]);

        } catch (\Exception $e) {
            Log::error('getAttendanceByDateByYear failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch attendance: ' . $e->getMessage()
            ], 500);
        }
    }
}

<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Attendance;
use App\Models\Registration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class AttendanceController extends Controller
{
    /**
     * Get all classes for the logged-in staff member
     */
    public function getMyClasses(Request $request)
    {
        try {
            $user = $request->user();
            $authorityId = $user->getKey();
            
            $classes = DB::table('class')
                ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                ->where('class.authorityId', $authorityId)
                ->select(
                    'class.classId',
                    'class.classDay',
                    'class.startTime',
                    'class.finishTime',
                    'class.location',
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
                'data' => $classes
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
     * Get students for a class to record attendance
     */
    public function getClassStudents($classId)
    {
        try {
            // Get all approved registrations for this class
            $registrations = Registration::where('status', 'Approved')
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
            $filteredStudents = $registrations->filter(function($reg) use ($classId) {
                // Check if main classId matches
                if ($reg->classId == $classId) {
                    return true;
                }
                
                // Check if classIds contains this classId
                if ($reg->classIds) {
                    $classIdsArray = array_map('trim', explode(',', $reg->classIds));
                    return in_array((string)$classId, $classIdsArray);
                }
                
                return false;
            });

            // Remove duplicates
            $uniqueStudents = $filteredStudents->unique('studentId')->values();

            return response()->json([
                'success' => true,
                'data' => $uniqueStudents->map(function($student) {
                    return [
                        'registrationId' => $student->registrationId,
                        'studentId' => $student->studentId,
                        'studentName' => $student->studentName
                    ];
                })
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

            // Check if attendance already exists for this class and date - using raw where with DATE()
            $existingAttendance = Attendance::where('classId', $request->classId)
                ->where(DB::raw('DATE(date)'), '=', $request->date)
                ->first();

            if ($existingAttendance) {
                // Delete existing attendance for this date - using raw where with DATE()
                Attendance::where('classId', $request->classId)
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
                    'status' => $record['status']
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
     * Get attendance history for a class
     */
    public function getClassAttendanceHistory($classId)
    {
        try {
            $attendanceRecords = DB::table('attendance')
                ->where('attendance.classId', $classId)
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
                ->groupBy(function($item) {
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
                'data' => $result
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
     * Get attendance for a specific date
     */
    public function getAttendanceByDate($classId, $date)
    {
        try {
            $attendance = DB::table('attendance')
                ->where('attendance.classId', $classId)
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
                'data' => $attendance
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
     * Delete attendance for a specific date
     */
    public function deleteAttendanceByDate($classId, $date)
    {
        try {
            $deleted = DB::table('attendance')
                ->where('classId', $classId)
                ->where(DB::raw('DATE(date)'), '=', $date)
                ->delete();

            if ($deleted > 0) {
                Log::info('Attendance deleted', [
                    'classId' => $classId,
                    'date' => $date,
                    'recordsDeleted' => $deleted
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
}
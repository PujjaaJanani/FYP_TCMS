<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\TestMark;
use App\Models\Registration;
use App\Models\Student;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class TestMarkController extends Controller
{
    /**
     * Get all tests for a specific class
     */
    public function getClassTests($classId)
    {
        try {
            // Get all unique tests for this class
            $tests = TestMark::select('testName', 'testDate')
                ->where('classId', $classId)
                ->distinct()
                ->orderBy('testDate', 'desc')
                ->get();

            $result = [];
            
            foreach ($tests as $test) {
                // Get all marks for this specific test
                $marks = TestMark::where('testmark.classId', $classId)
                    ->where('testName', $test->testName)
                    ->where('testDate', $test->testDate)
                    ->join('registration', function($join) use ($classId) {
                        $join->on('testmark.registrationId', '=', 'registration.registrationId')
                            ->where(function($query) use ($classId) {
                                $query->where('registration.classId', $classId)
                                    ->orWhere('registration.classIds', 'LIKE', "%{$classId}%");
                            });
                    })
                    ->join('student', 'registration.studentId', '=', 'student.studentId')
                    ->select(
                        'testmark.*',
                        'student.name as studentName',
                        'student.studentId'
                    )
                    ->get();

                $result[] = [
                    'testName' => $test->testName,
                    'testDate' => date('Y-m-d', strtotime($test->testDate)),
                    'marks' => $marks->map(function($mark) {
                        return [
                            'markId' => $mark->markId,
                            'mark' => $mark->mark,
                            'registrationId' => $mark->registrationId,
                            'studentId' => $mark->studentId,
                            'studentName' => $mark->studentName
                        ];
                    })
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $result
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch tests: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all approved students for a class
     * FIXED: Properly filters by exact classId match in comma-separated classIds
     */
    public function getClassStudents($classId)
    {
        try {
            // First get all approved registrations
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

            // Filter to only include students registered for this specific class
            $filteredStudents = $registrations->filter(function($reg) use ($classId) {
                // Check if main classId matches
                if ($reg->classId == $classId) {
                    return true;
                }
                
                // Check if classIds contains this classId
                if ($reg->classIds) {
                    // Split by comma and trim spaces
                    $classIdsArray = array_map('trim', explode(',', $reg->classIds));
                    // Check for exact match
                    return in_array((string)$classId, $classIdsArray);
                }
                
                return false;
            });

            // Remove duplicates and format response
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
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch students: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a new test with marks
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'testName' => 'required|string|max:100',
            'testDate' => 'required|date',
            'classId' => 'required|integer|exists:class,classId',
            'marks' => 'required|array|min:1',
            'marks.*.registrationId' => 'required|integer|exists:registration,registrationId',
            'marks.*.mark' => 'required|numeric|min:0|max:100'
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

            foreach ($request->marks as $markData) {
                TestMark::create([
                    'testName' => $request->testName,
                    'testDate' => $request->testDate,
                    'classId' => $request->classId,
                    'registrationId' => $markData['registrationId'],
                    'mark' => $markData['mark']
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Test marks saved successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to save test marks: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update an existing test
     */
    public function update(Request $request, $classId, $testName, $testDate)
    {
        $validator = Validator::make($request->all(), [
            'testName' => 'required|string|max:100',
            'testDate' => 'required|date',
            'classId' => 'required|integer|exists:class,classId',
            'marks' => 'required|array|min:1',
            'marks.*.registrationId' => 'required|integer|exists:registration,registrationId',
            'marks.*.mark' => 'required|numeric|min:0|max:100'
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

            // Decode URL parameters
            $originalTestName = urldecode($testName);
            $originalTestDate = urldecode($testDate);

            // Delete all existing marks for this test
            $deleted = TestMark::where('classId', $classId)
                ->where('testName', $originalTestName)
                ->where('testDate', $originalTestDate)
                ->delete();

            if ($deleted === 0 && empty($request->marks)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Test not found'
                ], 404);
            }

            // Insert new marks
            foreach ($request->marks as $markData) {
                TestMark::create([
                    'testName' => $request->testName,
                    'testDate' => $request->testDate,
                    'classId' => $request->classId,
                    'registrationId' => $markData['registrationId'],
                    'mark' => $markData['mark']
                ]);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Test updated successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Failed to update test: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete an entire test
     */
    public function destroy($classId, $testName, $testDate)
    {
        try {
            $deleted = TestMark::where('classId', $classId)
                ->where('testName', $testName)
                ->where('testDate', $testDate)
                ->delete();

            if ($deleted > 0) {
                return response()->json([
                    'success' => true,
                    'message' => 'Test deleted successfully'
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Test not found'
                ], 404);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete test: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get a single test's details
     */
    public function show($markId)
    {
        try {
            $mark = TestMark::where('markId', $markId)
                ->join('registration', 'testmark.registrationId', '=', 'registration.registrationId')
                ->join('student', 'registration.studentId', '=', 'student.studentId')
                ->select(
                    'testmark.*',
                    'student.name as studentName',
                    'student.studentId'
                )
                ->first();

            if (!$mark) {
                return response()->json([
                    'success' => false,
                    'message' => 'Test mark not found'
                ], 404);
            }

            // Get all marks for the same test
            $allMarks = TestMark::where('classId', $mark->classId)
                ->where('testName', $mark->testName)
                ->where('testDate', $mark->testDate)
                ->join('registration', 'testmark.registrationId', '=', 'registration.registrationId')
                ->join('student', 'registration.studentId', '=', 'student.studentId')
                ->select(
                    'testmark.*',
                    'student.name as studentName',
                    'student.studentId'
                )
                ->get();

            return response()->json([
                'success' => true,
                'data' => [
                    'testName' => $mark->testName,
                    'testDate' => $mark->testDate,
                    'classId' => $mark->classId,
                    'marks' => $allMarks
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch test: ' . $e->getMessage()
            ], 500);
        }
    }
}
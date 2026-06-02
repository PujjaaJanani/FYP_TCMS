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
     * Get all tests for a specific class (optionally filter by academic year)
     */
    public function getClassTests($classId, Request $request)
    {
        try {
            $query = TestMark::select('testName', 'testDate', 'academicYear')
                ->where('classId', $classId);
            
            // Optional academic year filter
            if ($request->has('academicYear') && !empty($request->academicYear)) {
                $query->where('academicYear', $request->academicYear);
            }
            
            $tests = $query->distinct()
                ->orderBy('testDate', 'desc')
                ->get();

            $result = [];
            
            foreach ($tests as $test) {
                // Get all marks for this specific test
                $marksQuery = TestMark::where('testmark.classId', $classId)
                    ->where('testName', $test->testName)
                    ->where('testDate', $test->testDate);
                
                // Apply academic year filter to marks as well
                if ($request->has('academicYear') && !empty($request->academicYear)) {
                    $marksQuery->where('testmark.academicYear', $request->academicYear);
                }
                
                $marks = $marksQuery->join('registration', function($join) use ($classId) {
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
                    'academicYear' => $test->academicYear,
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
            $currentYear = date('Y');

            // First get all approved registrations
            $registrations = Registration::where('status', 'Approved')
                ->where('enrollmentYear', $currentYear)
                ->join('student', 'registration.studentId', '=', 'student.studentId')
                ->select(
                    'registration.registrationId',
                    'registration.classId',
                    'registration.classIds',
                    'registration.enrollmentYear',
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

            // Set academic year to current year automatically
            $currentYear = date('Y');

            foreach ($request->marks as $markData) {
                TestMark::create([
                    'testName' => $request->testName,
                    'testDate' => $request->testDate,
                    'classId' => $request->classId,
                    'registrationId' => $markData['registrationId'],
                    'mark' => $markData['mark'],
                    'academicYear' => $currentYear // Automatically set to current year
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

            // Get the existing test to preserve academic year
            $existingTest = TestMark::where('classId', $classId)
                ->where('testName', $originalTestName)
                ->where('testDate', $originalTestDate)
                ->first();

            if (!$existingTest && !empty($request->marks)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Test not found'
                ], 404);
            }

            // Keep the original academic year
            $academicYear = $existingTest ? $existingTest->academicYear : date('Y');

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

            // Insert new marks with preserved academic year
            foreach ($request->marks as $markData) {
                TestMark::create([
                    'testName' => $request->testName,
                    'testDate' => $request->testDate,
                    'classId' => $request->classId,
                    'registrationId' => $markData['registrationId'],
                    'mark' => $markData['mark'],
                    'academicYear' => $academicYear // Preserve original academic year
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
     * Get a student's yearly average test mark history for the subject of a given class.
     * Dynamically finds all years the student was enrolled in a class for the same subject.
     */
    public function getStudentHistory($classId, $studentId)
    {
        try {
            // Find the subjectId for the current class
            $subjectId = DB::table('class')
                ->where('classId', $classId)
                ->value('subjectId');

            if (!$subjectId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Class not found'
                ], 404);
            }

            // Find all classes that teach the same subject
            $sameSubjectClassIds = DB::table('class')
                ->where('subjectId', $subjectId)
                ->pluck('classId')
                ->toArray();

            // Find all approved registrations for this student across all years
            // that include any of the same-subject class IDs
            $allRegistrations = DB::table('registration')
                ->where('studentId', $studentId)
                ->where('status', 'Approved')
                ->select('registrationId', 'classId', 'classIds', 'enrollmentYear')
                ->get();

            // Filter registrations that include at least one same-subject class
            $matchingRegistrations = $allRegistrations->filter(function ($reg) use ($sameSubjectClassIds) {
                // Check main classId
                if (in_array($reg->classId, $sameSubjectClassIds)) return true;
                // Check comma-separated classIds
                if ($reg->classIds) {
                    $ids = array_map('trim', explode(',', $reg->classIds));
                    foreach ($ids as $id) {
                        if (in_array((int)$id, $sameSubjectClassIds)) return true;
                    }
                }
                return false;
            });

            if ($matchingRegistrations->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'hasHistory' => false,
                    'message' => 'This student has not registered for this subject in any year.'
                ]);
            }

            // For each matching registration, calculate the average mark for the same subject
            $history = [];

            foreach ($matchingRegistrations as $reg) {
                // Find which of the same-subject class IDs this registration covers
                $coveredClassIds = [];
                if (in_array($reg->classId, $sameSubjectClassIds)) {
                    $coveredClassIds[] = $reg->classId;
                }
                if ($reg->classIds) {
                    $ids = array_map('trim', explode(',', $reg->classIds));
                    foreach ($ids as $id) {
                        if (in_array((int)$id, $sameSubjectClassIds)) {
                            $coveredClassIds[] = (int)$id;
                        }
                    }
                }
                $coveredClassIds = array_unique($coveredClassIds);

                // Get all test marks for this registration + these class IDs
                $marks = DB::table('testmark')
                    ->where('registrationId', $reg->registrationId)
                    ->whereIn('classId', $coveredClassIds)
                    ->pluck('mark')
                    ->toArray();

                if (empty($marks)) continue;

                $average = round(array_sum($marks) / count($marks), 1);

                $history[] = [
                    'year'    => (int)$reg->enrollmentYear,
                    'average' => $average,
                    'total'   => count($marks),
                ];
            }

            // Sort by year ascending
            usort($history, fn($a, $b) => $a['year'] - $b['year']);

            if (empty($history)) {
                return response()->json([
                    'success'    => true,
                    'hasHistory' => false,
                    'message'    => 'This student has not sat any tests for this subject yet.'
                ]);
            }

            // Get subject name for display
            $subjectName = DB::table('subject')
                ->where('subjectId', $subjectId)
                ->value('name');

            return response()->json([
                'success'     => true,
                'hasHistory'  => true,
                'subjectName' => $subjectName,
                'data'        => $history,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch student history: ' . $e->getMessage()
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
                    'academicYear' => $mark->academicYear,
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
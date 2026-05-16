<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class EnrollmentController extends Controller
{
    /**
     * Check if student exists and get their info for enrollment
     */
    public function checkStudent(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation error',
                'errors' => $validator->errors()
            ], 422);
        }

        $student = DB::table('student')
            ->where('email', $request->email)
            ->first();

        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'Student not found. Please register first.',
                'redirect_to' => '/register'
            ], 404);
        }

        // Check if already enrolled for current year
        $alreadyEnrolled = DB::table('registration')
            ->where('studentId', $student->studentId)
            ->where('enrollmentYear', date('Y'))
            ->where('status', 'Approved')
            ->exists();

        if ($alreadyEnrolled) {
            return response()->json([
                'success' => false,
                'message' => 'You are already enrolled for ' . date('Y') . '. Please login.',
                'redirect_to' => '/login'
            ], 400);
        }

        // Get previous year's classes (if any) for reference
        $previousRegistration = DB::table('registration')
            ->where('studentId', $student->studentId)
            ->where('enrollmentYear', '<', date('Y'))
            ->where('status', 'Approved')
            ->orderBy('enrollmentYear', 'desc')
            ->first();

        $previousClasses = [];
        if ($previousRegistration) {
            $classIds = explode(',', $previousRegistration->classIds);
            $previousClasses = DB::table('class')
                ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                ->whereIn('class.classId', $classIds)
                ->select('subject.name as subjectName', 'subject.form', 'class.classDay')
                ->get();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'studentId' => $student->studentId,
                'name' => $student->name,
                'email' => $student->email,
                'phone' => $student->phone,
                'address' => $student->address,
                'previousClasses' => $previousClasses
            ]
        ]);
    }

    /**
     * Submit enrollment for new academic year
     */
    public function submitEnrollment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'studentId' => 'required|integer|exists:student,studentId',
            'classes' => 'required|array|min:1',
            'classes.*' => 'required|integer|exists:class,classId',
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

            // Check if already enrolled for current year
            $existingEnrollment = DB::table('registration')
                ->where('studentId', $request->studentId)
                ->where('enrollmentYear', date('Y'))
                ->first();

            if ($existingEnrollment) {
                return response()->json([
                    'success' => false,
                    'message' => 'You are already enrolled for ' . date('Y')
                ], 400);
            }

            // Get student details
            $student = DB::table('student')
                ->where('studentId', $request->studentId)
                ->first();

            if (!$student) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student not found'
                ], 404);
            }

            // Store multiple class IDs
            $classIds = implode(',', $request->classes);
            $firstClassId = $request->classes[0];

            // Calculate total monthly fee
            $totalMonthlyFee = $this->calculateTotalMonthlyFee($request->classes);

            // Create new registration for current year
            $registrationId = DB::table('registration')->insertGetId([
                'createdAt' => now(),
                'status' => 'Approved', // Auto-approve for returning students
                'studentId' => $request->studentId,
                'classId' => $firstClassId,
                'classIds' => $classIds,
                'enrollmentYear' => date('Y'),
                'monthlyFee' => $totalMonthlyFee,
            ]);

            Log::info('New year enrollment created', [
                'studentId' => $request->studentId,
                'studentName' => $student->name,
                'registrationId' => $registrationId,
                'enrollmentYear' => date('Y'),
                'classIds' => $classIds,
                'monthlyFee' => $totalMonthlyFee
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Successfully enrolled for ' . date('Y') . '! You can now login.',
                'data' => [
                    'registrationId' => $registrationId,
                    'enrollmentYear' => date('Y'),
                    'classes' => $request->classes,
                    'monthlyFee' => $totalMonthlyFee
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Enrollment failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Enrollment failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate total monthly fee based on subject fees
     */
    private function calculateTotalMonthlyFee($classIds)
    {
        try {
            $classes = DB::table('class')
                ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                ->whereIn('class.classId', $classIds)
                ->select('subject.subjectFee')
                ->get();

            $totalFee = 0;
            foreach ($classes as $class) {
                $totalFee += floatval($class->subjectFee);
            }

            return $totalFee;
        } catch (\Exception $e) {
            Log::error('Failed to calculate monthly fee', [
                'error' => $e->getMessage(),
                'classIds' => $classIds
            ]);
            return 0;
        }
    }

    /**
     * Get all available classes for current academic year
     */
    public function getCurrentYearClasses()
    {
        try {
            $currentYear = date('Y');
            
            $classes = DB::table('class')
                ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                ->leftJoin('authority', 'class.authorityId', '=', 'authority.authorityId')
                ->where('class.academicYear', $currentYear)
                ->select(
                    'class.classId',
                    'class.classDay',
                    'class.startTime',
                    'class.finishTime',
                    'class.location',
                    'class.availability',
                    'subject.name as subjectName',
                    'subject.form',
                    'subject.subjectFee',
                    'authority.name as teacher'
                )
                ->get();

            // Calculate enrolled students and available spaces
            $classes = $classes->map(function ($class) use ($currentYear) {
                $class->startTime = date('H:i', strtotime($class->startTime));
                $class->finishTime = date('H:i', strtotime($class->finishTime));

                // Count approved enrolled students for current year only
                $enrolledCount = DB::table('registration')
                    ->where('status', 'Approved')
                    ->where('enrollmentYear', $currentYear)
                    ->where(function ($query) use ($class) {
                        $query->where('classId', $class->classId)
                              ->orWhereRaw('FIND_IN_SET(?, classIds)', [$class->classId]);
                    })
                    ->distinct()
                    ->count('studentId');

                $class->enrolledStudents = $enrolledCount;
                $class->availableSpaces = max(0, $class->availability - $enrolledCount);

                return $class;
            });

            return response()->json([
                'success' => true,
                'data' => $classes,
                'academic_year' => $currentYear
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch current year classes', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch classes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get classes by subject ID for current academic year only
     */
    public function getClassesBySubjectForCurrentYear($subjectId)
    {
        try {
            $currentYear = date('Y');
            
            $classes = DB::table('class')
                ->leftJoin('authority', 'class.authorityId', '=', 'authority.authorityId')
                ->where('class.subjectId', $subjectId)
                ->where('class.academicYear', $currentYear)
                ->select(
                    'class.classId',
                    'class.classDay',
                    'class.startTime',
                    'class.finishTime',
                    'class.location',
                    'class.availability',
                    'authority.name as teacher'
                )
                ->get();

            $classes = $classes->map(function ($class) use ($currentYear) {
                $class->startTime = date('H:i', strtotime($class->startTime));
                $class->finishTime = date('H:i', strtotime($class->finishTime));

                // Count approved enrolled students for current year only
                $enrolledCount = DB::table('registration')
                    ->where('status', 'Approved')
                    ->where('enrollmentYear', $currentYear)
                    ->where(function ($query) use ($class) {
                        $query->where('classId', $class->classId)
                            ->orWhereRaw('FIND_IN_SET(?, classIds)', [$class->classId]);
                    })
                    ->distinct()
                    ->count('studentId');

                $class->enrolledStudents = $enrolledCount;
                $class->availableSpaces = max(0, $class->availability - $enrolledCount);

                return $class;
            });

            return response()->json([
                'success' => true,
                'data' => $classes,
                'academic_year' => $currentYear
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch classes by subject', [
                'error' => $e->getMessage(),
                'subjectId' => $subjectId
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch classes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get subjects that have available classes for current year
     */
    public function getAvailableSubjectsForCurrentYear()
    {
        try {
            $currentYear = date('Y');
            
            $subjects = DB::table('subject')
                ->whereExists(function ($query) use ($currentYear) {
                    $query->select(DB::raw(1))
                        ->from('class')
                        ->whereColumn('class.subjectId', 'subject.subjectId')
                        ->where('class.academicYear', $currentYear);
                })
                ->select('subjectId', 'name', 'form', 'subjectFee')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $subjects,
                'academic_year' => $currentYear
            ]);

        } catch (\Exception $e) {
            Log::error('Failed to fetch available subjects', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch subjects: ' . $e->getMessage()
            ], 500);
        }
    }
}
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;

class RegistrationController extends Controller
{
    /**
     * Register a new student and create ONE registration with multiple classes
     * Uses classIds column for storing multiple class IDs
     */
    /**
     * Register a new student and create ONE registration with multiple classes
     * Uses classIds column for storing multiple class IDs
     */
    public function register(Request $request)
    {
        Log::info('Registration request received', $request->all());

        // Check for existing student with the same email
        $existingStudent = DB::table('student')
            ->where('email', trim($request->email))
            ->first();

        if ($existingStudent) {
            // Check if student has any approved or pending registrations
            $activeRegistration = DB::table('registration')
                ->where('studentId', $existingStudent->studentId)
                ->whereIn('status', ['Approved', 'Pending'])
                ->exists();

            if ($activeRegistration) {
                // Email is already in use with an active or pending registration
                return response()->json([
                    'success' => false,
                    'message' => 'Validation error',
                    'errors' => [
                        'email' => ['This email is already registered with an active or pending application. Please use a different email address.']
                    ]
                ], 422);
            }

            // If only rejected registrations exist, delete the old student record and allow re-registration
            // Delete associated registrations first (due to foreign key constraints)
            DB::table('registration')
                ->where('studentId', $existingStudent->studentId)
                ->delete();

            // Delete the student record
            DB::table('student')
                ->where('studentId', $existingStudent->studentId)
                ->delete();

            Log::info('Deleted rejected student record to allow re-registration', ['studentId' => $existingStudent->studentId, 'email' => $existingStudent->email]);
        }

        // Validate the request
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:100|unique:student,email',
            'parentEmail' => 'required|email|max:100',
            'parentPassword' => ['required', 'string', 'min:6', 'regex:/[0-9]/', 'regex:/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?`~]/'],
            'password' => ['required', 'string', 'min:6', 'regex:/[0-9]/', 'regex:/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?`~]/'],
            'phone' => 'required|string|max:20',
            'address' => 'required|string|max:255',
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

            // Get current academic year
            $currentYear = date('Y');

            // Get the default authority (admin)
            $defaultAuthority = DB::table('authority')
                ->where('role', 'Admin')
                ->first();

            if (!$defaultAuthority) {
                Log::error('No admin found in system');
                return response()->json([
                    'success' => false,
                    'message' => 'System error: No admin found'
                ], 500);
            }

            // Create student record
            $studentId = DB::table('student')->insertGetId([
                'name' => trim($request->name),
                'email' => trim($request->email),
                'parentEmail' => trim($request->parentEmail),
                'parentPassword' => Hash::make($request->parentPassword),
                'password' => Hash::make($request->password),
                'phone' => trim($request->phone),
                'address' => trim($request->address)
            ]);

            Log::info('Student created', ['studentId' => $studentId]);

            // Store multiple class IDs
            $classIds = implode(',', $request->classes);
            $firstClassId = $request->classes[0]; // Keep first class as FK

            // Calculate total monthly fee based on subject fees
            $totalMonthlyFee = $this->calculateTotalMonthlyFee($request->classes);

            $registrationId = DB::table('registration')->insertGetId([
                'createdAt' => now(),
                'status' => 'Pending',
                'studentId' => (int) $studentId,
                'classId' => (int) $firstClassId,     // Foreign key - first class
                'classIds' => $classIds,              // All classes as "1,2,3"
                'enrollmentYear' => $currentYear,    // ADD THIS LINE - Current academic year
                'monthlyFee' => $totalMonthlyFee,     // Calculated total fee
            ]);

            Log::info('Registration created', [
                'studentId' => $studentId,
                'registrationId' => $registrationId,
                'classIds' => $classIds,
                'classCount' => count($request->classes),
                'enrollmentYear' => $currentYear,
                'monthlyFee' => $totalMonthlyFee
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Registration successful! Please wait for admin approval.',
                'data' => [
                    'studentId' => $studentId,
                    'registrationId' => $registrationId,
                    'classIds' => $request->classes,
                    'classCount' => count($request->classes),
                    'enrollmentYear' => $currentYear,
                    'monthlyFee' => $totalMonthlyFee,
                    'status' => 'Pending'
                ]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Registration failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Registration failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Calculate total monthly fee based on subject fees of selected classes
     */
    private function calculateTotalMonthlyFee($classIds)
    {
        try {
            // Get all classes with their subject fees
            $classes = DB::table('class')
                ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                ->whereIn('class.classId', $classIds)
                ->select('subject.subjectFee')
                ->get();

            $totalFee = 0;
            foreach ($classes as $class) {
                $totalFee += floatval($class->subjectFee);
            }

            Log::info('Monthly fee calculated', [
                'classIds' => $classIds,
                'totalFee' => $totalFee
            ]);

            return $totalFee;

        } catch (\Exception $e) {
            Log::error('Failed to calculate monthly fee', [
                'error' => $e->getMessage(),
                'classIds' => $classIds
            ]);
            return 0; // Return 0 if calculation fails
        }
    }

    /**
     * Get all subjects (that have classes for current year)
     */
    public function getSubjects()
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
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch subjects: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get classes by subject ID
     */
    public function getClassesBySubject($subjectId)
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
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch classes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all available classes with subject details
     */
    public function getAllClasses()
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
                    'subject.name as subjectName',
                    'subject.form',
                    'subject.subjectFee',
                    'authority.name as teacher'
                )
                ->get();

            $classes = $classes->map(function ($class) use ($currentYear) {
                $class->startTime = date('H:i', strtotime($class->startTime));
                $class->finishTime = date('H:i', strtotime($class->finishTime));
                return $class;
            });

            return response()->json([
                'success' => true,
                'data' => $classes,
                'academic_year' => $currentYear
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch classes: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check registration status - uses classIds column
     */
    public function checkRegistrationStatus($email)
    {
        try {
            $student = DB::table('student')
                ->where('email', $email)
                ->first();

            if (!$student) {
                return response()->json([
                    'success' => false,
                    'message' => 'Student not found'
                ], 404);
            }

            $registrations = DB::table('registration')
                ->where('registration.studentId', $student->studentId)
                ->select(
                    'registration.registrationId',
                    'registration.status',
                    'registration.createdAt',
                    'registration.classIds',
                    'registration.monthlyFee'
                )
                ->get();

            // Parse each registration and get class details
            $parsedRegistrations = [];
            foreach ($registrations as $registration) {
                $classIdArray = explode(',', $registration->classIds);

                // Get details for all classes in this registration
                $classes = DB::table('class')
                    ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                    ->leftJoin('authority', 'class.authorityId', '=', 'authority.authorityId')
                    ->whereIn('class.classId', $classIdArray)
                    ->select(
                        'class.classId',
                        'class.classDay',
                        'class.startTime',
                        'class.finishTime',
                        'class.location',
                        'subject.name as subjectName',
                        'subject.form',
                        'subject.subjectFee',
                        'authority.name as teacher'
                    )
                    ->get();

                $parsedRegistrations[] = [
                    'registrationId' => $registration->registrationId,
                    'status' => $registration->status,
                    'createdAt' => $registration->createdAt,
                    'monthlyFee' => $registration->monthlyFee,
                    'classCount' => count($classIdArray),
                    'classes' => $classes
                ];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'student' => $student,
                    'registrations' => $parsedRegistrations,
                    'totalRegistrations' => count($parsedRegistrations),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to check status: ' . $e->getMessage()
            ], 500);
        }
    }
}

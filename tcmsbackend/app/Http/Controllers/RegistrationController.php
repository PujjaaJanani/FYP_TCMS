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
    public function register(Request $request)
    {
        Log::info('Registration request received', $request->all());

        // Validate the request
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:100|unique:student,email',
            'password' => 'required|string|min:6',
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
                'password' => Hash::make($request->password),
                'phone' => trim($request->phone),
                'address' => trim($request->address)
            ]);

            Log::info('Student created', ['studentId' => $studentId]);

            // Store multiple class IDs
            $classIds = implode(',', $request->classes);
            $firstClassId = $request->classes[0]; // Keep first class as FK
            
            $registrationId = DB::table('registration')->insertGetId([
                'createdAt' => now(),
                'status' => 'Pending',
                'studentId' => (int)$studentId,
                'classId' => (int)$firstClassId,  // Foreign key - first class
                'classIds' => $classIds,          // All classes as "1,2,3"
            ]);

            Log::info('Registration created', [
                'studentId' => $studentId,
                'registrationId' => $registrationId,
                'classIds' => $classIds,
                'classCount' => count($request->classes)
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Registration successful. Please wait for admin approval.',
                'data' => [
                    'studentId' => $studentId,
                    'registrationId' => $registrationId,
                    'classIds' => $request->classes,
                    'classCount' => count($request->classes),
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
     * Get all subjects
     */
    public function getSubjects()
    {
        try {
            $subjects = DB::table('subject')
                ->select('subjectId', 'name', 'form')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $subjects
            ], 200);

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
            $classes = DB::table('class')
                ->leftJoin('authority', 'class.authorityId', '=', 'authority.authorityId')
                ->where('class.subjectId', $subjectId)
                ->select(
                    'class.classId',
                    'class.classDay',
                    'class.startTime',
                    'class.finishTime',
                    'class.location',
                    'authority.name as teacher'
                )
                ->get();

            $classes = $classes->map(function ($class) {
                $class->startTime = date('H:i', strtotime($class->startTime));
                $class->finishTime = date('H:i', strtotime($class->finishTime));
                return $class;
            });

            return response()->json([
                'success' => true,
                'data' => $classes
            ], 200);

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
            $classes = DB::table('class')
                ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                ->leftJoin('authority', 'class.authorityId', '=', 'authority.authorityId')
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
                ->get();

            $classes = $classes->map(function ($class) {
                $class->startTime = date('H:i', strtotime($class->startTime));
                $class->finishTime = date('H:i', strtotime($class->finishTime));
                return $class;
            });

            return response()->json([
                'success' => true,
                'data' => $classes
            ], 200);

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
                    'registration.classIds'
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
                        'authority.name as teacher'
                    )
                    ->get();

                $parsedRegistrations[] = [
                    'registrationId' => $registration->registrationId,
                    'status' => $registration->status,
                    'createdAt' => $registration->createdAt,
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
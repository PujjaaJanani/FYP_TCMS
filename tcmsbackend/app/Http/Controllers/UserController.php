<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Authority;
use App\Models\Student;
use App\Models\Registration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    /**
     * Get all users (Authorities + Approved Students) with optional year filter
     */
    public function getAllUsers(Request $request)
    {
        try {
            $userType = $request->query('type', 'all'); // all, authorities, students
            $year = $request->query('year', date('Y')); // Filter by year, default current year

            $users = [];

            // Get all authorities (always show, independent of year)
            if ($userType === 'all' || $userType === 'authorities') {
                $authorities = Authority::select(
                    'authorityId as id',
                    'name',
                    'email',
                    'phone as contactNumber',
                    DB::raw("'' as address"),
                    'role',
                    DB::raw("'authority' as userType"),
                    DB::raw("NULL as enrollmentYear")
                )->get();

                $users = array_merge($users, $authorities->toArray());
            }

            // Get approved students for specific year
            if ($userType === 'all' || $userType === 'students') {
                $students = DB::table('student')
                    ->join('registration', 'student.studentId', '=', 'registration.studentId')
                    ->where('registration.status', 'Approved')
                    ->where('registration.enrollmentYear', $year)
                    ->select(
                        'student.studentId as id',
                        'student.name',
                        'student.email',
                        'student.phone as contactNumber',
                        'student.address',
                        DB::raw("'Student' as role"),
                        DB::raw("'student' as userType"),
                        'registration.enrollmentYear'
                    )
                    ->distinct()
                    ->get();

                $users = array_merge($users, $students->toArray());
            }

            return response()->json([
                'success' => true,
                'data' => $users,
                'current_year' => date('Y'),
                'available_years' => $this->getAvailableYears()
            ]);

        } catch (\Exception $e) {
            Log::error('getAllUsers failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch users'
            ], 500);
        }
    }

    /**
     * Get available years from registration table
     */
    public function getAvailableYears()
    {
        try {
            $years = DB::table('registration')
                ->select('enrollmentYear')
                ->where('status', 'Approved')
                ->distinct()
                ->orderBy('enrollmentYear', 'desc')
                ->pluck('enrollmentYear')
                ->toArray();

            // Add current year if not present
            $currentYear = date('Y');
            if (!in_array($currentYear, $years)) {
                array_unshift($years, $currentYear);
            }

            return response()->json([
                'success' => true,
                'data' => $years,
                'current_year' => $currentYear
            ]);

        } catch (\Exception $e) {
            Log::error('getAvailableYears failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'data' => [date('Y')],
                'current_year' => date('Y')
            ]);
        }
    }

    /**
     * Get single user (Authority or Student)
     * Students can only be viewed if they have registration for current year
     */
    public function getUser($userType, $id)
    {
        try {
            $currentYear = date('Y');
            
            if ($userType === 'authority') {
                $user = Authority::find($id);
                if ($user) {
                    $user->userType = 'authority';
                    $user->contactNumber = $user->phone;
                }
            } else {
                $user = Student::find($id);
                if ($user) {
                    // Check if student has registration for current year
                    $hasCurrentYearRegistration = Registration::where('studentId', $id)
                        ->where('enrollmentYear', $currentYear)
                        ->where('status', 'Approved')
                        ->exists();
                    
                    if (!$hasCurrentYearRegistration) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Student not enrolled for current year'
                        ], 403);
                    }
                    
                    $user->userType = 'student';
                    $user->contactNumber = $user->phone;
                }
            }

            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $user
            ]);

        } catch (\Exception $e) {
            Log::error('getUser failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch user'
            ], 500);
        }
    }

    /**
     * Create new user (Authority or Student)
     * Only for current year
     */
    public function createUser(Request $request)
    {
        $currentYear = date('Y');
        
        $validator = Validator::make($request->all(), [
            'userType' => 'required|in:authority,student',
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:100',
            'password' => 'required|string|min:6',
            'phone' => 'required|string|max:20',
            'parentEmail' => 'required_if:userType,student|email|max:100',
            'parentPassword' => ['required_if:userType,student', 'string', 'min:6', 'regex:/[0-9]/', 'regex:/[!@#$%^&*()_+\-=\[\]{};\'":\\|,.<>\/?`~]/'],
            'address' => 'required_if:userType,student|string|max:255',
            'role' => 'required_if:userType,authority|in:Admin,Staff',
            'classIds' => 'required_if:userType,student|array|min:1',
            'monthlyFee' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            if ($request->userType === 'authority') {
                // Check if email exists
                if (Authority::where('email', $request->email)->exists()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Email already exists'
                    ], 400);
                }

                $user = Authority::create([
                    'name' => $request->name,
                    'email' => $request->email,
                    'password' => Hash::make($request->password),
                    'phone' => $request->phone,
                    'role' => $request->role,
                    'createdAt' => now()
                ]);

            } else {
                // Check if email exists
                if (Student::where('email', $request->email)->exists()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Email already exists'
                    ], 400);
                }

                $student = Student::create([
                    'name' => $request->name,
                    'email' => $request->email,
                    'parentEmail' => $request->parentEmail,
                    'parentPassword' => Hash::make($request->parentPassword),
                    'password' => Hash::make($request->password),
                    'phone' => $request->phone,
                    'address' => $request->address
                ]);

                // Create approved registration for CURRENT YEAR only
                $classIds = $request->classIds;
                $classIdsString = implode(',', $classIds);
                $firstClassId = $classIds[0];

                Registration::create([
                    'studentId' => $student->studentId,
                    'classId' => $firstClassId,
                    'classIds' => $classIdsString,
                    'status' => 'Approved',
                    'createdAt' => now(),
                    'enrollmentYear' => $currentYear,
                    'monthlyFee' => $request->monthlyFee ?? 200.00
                ]);

                $user = $student;
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'User created successfully',
                'data' => $user
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('createUser failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
                'trace' => $e->getFile() . ':' . $e->getLine()
            ], 500);
        }
    }

    /**
     * Update user
     * Students can only be updated for current year
     */
    public function updateUser(Request $request, $userType, $id)
    {
        $currentYear = date('Y');
        
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:100',
            'phone' => 'required|string|max:20',
            'parentEmail' => 'required_if:' . $userType . ',student|email|max:100',
            'parentPassword' => ['nullable', 'string', 'min:6', 'regex:/[0-9]/', 'regex:/[!@#$%^&*()_+\-=\[\]{};\'":\\|,.<>\/?`~]/'],
            'address' => 'required_if:' . $userType . ',student|string|max:255',
            'role' => 'required_if:' . $userType . ',authority|in:Admin,Staff',
            'password' => 'nullable|string|min:6',
            'classIds' => 'required_if:' . $userType . ',student|array|min:1',
            'monthlyFee' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            if ($userType === 'authority') {
                $user = Authority::find($id);
                if (!$user) {
                    return response()->json([
                        'success' => false,
                        'message' => 'User not found'
                    ], 404);
                }

                // Check email uniqueness
                if (Authority::where('email', $request->email)->where('authorityId', '!=', $id)->exists()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Email already exists'
                    ], 400);
                }

                $user->name = $request->name;
                $user->email = $request->email;
                $user->phone = $request->phone;
                $user->role = $request->role;
                
                if ($request->filled('password')) {
                    $user->password = Hash::make($request->password);
                }

            } else {
                $user = Student::find($id);
                if (!$user) {
                    return response()->json([
                        'success' => false,
                        'message' => 'User not found'
                    ], 404);
                }

                // Check if student has registration for current year
                $hasCurrentYearRegistration = Registration::where('studentId', $id)
                    ->where('enrollmentYear', $currentYear)
                    ->where('status', 'Approved')
                    ->exists();
                
                if (!$hasCurrentYearRegistration) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Cannot edit: Student not enrolled for current year'
                    ], 403);
                }

                // Check email uniqueness
                if (Student::where('email', $request->email)->where('studentId', '!=', $id)->exists()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Email already exists'
                    ], 400);
                }

                $user->name = $request->name;
                $user->email = $request->email;
                $user->phone = $request->phone;
                $user->parentEmail = $request->parentEmail;
                $user->address = $request->address;
                
                if ($request->filled('password')) {
                    $user->password = Hash::make($request->password);
                }

                if ($request->filled('parentPassword')) {
                    $user->parentPassword = Hash::make($request->parentPassword);
                }

                // Update registration for current year
                $registration = Registration::where('studentId', $id)
                    ->where('enrollmentYear', $currentYear)
                    ->where('status', 'Approved')
                    ->first();

                if ($registration) {
                    $classIds = $request->classIds;
                    $classIdsString = implode(',', $classIds);
                    $firstClassId = $classIds[0];

                    $registration->classId = $firstClassId;
                    $registration->classIds = $classIdsString;
                    $registration->monthlyFee = $request->monthlyFee ?? 200.00;
                    $registration->save();
                }
            }

            $user->save();
            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'User updated successfully',
                'data' => $user
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('updateUser failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update user'
            ], 500);
        }
    }

    /**
     * Delete user
     * Students can only be deleted for current year
     */
    public function deleteUser($userType, $id)
    {
        $currentYear = date('Y');
        
        try {
            DB::beginTransaction();

            if ($userType === 'authority') {
                $user = Authority::find($id);
                if (!$user) {
                    return response()->json([
                        'success' => false,
                        'message' => 'User not found'
                    ], 404);
                }

                // Check if it's the last admin
                if ($user->role === 'Admin' && Authority::where('role', 'Admin')->count() === 1) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Cannot delete the last admin'
                    ], 400);
                }

                $user->delete();

            } else {
                $user = Student::find($id);
                if (!$user) {
                    return response()->json([
                        'success' => false,
                        'message' => 'User not found'
                    ], 404);
                }

                // Only allow deletion of current year students
                $hasCurrentYearRegistration = Registration::where('studentId', $id)
                    ->where('enrollmentYear', $currentYear)
                    ->where('status', 'Approved')
                    ->exists();
                
                if (!$hasCurrentYearRegistration) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Cannot delete past year records'
                    ], 403);
                }

                // Get registration IDs for current year only
                $registrationIds = DB::table('registration')
                    ->where('studentId', $id)
                    ->where('enrollmentYear', $currentYear)
                    ->pluck('registrationId');

                // 1. Delete attendance records
                DB::table('attendance')
                    ->whereIn('registrationId', $registrationIds)
                    ->delete();

                // 2. Delete test marks
                DB::table('testmark')
                    ->whereIn('registrationId', $registrationIds)
                    ->delete();

                // 3. Delete payments
                DB::table('payment')
                    ->whereIn('registrationId', $registrationIds)
                    ->delete();

                // 4. Delete registration
                DB::table('registration')
                    ->where('studentId', $id)
                    ->where('enrollmentYear', $currentYear)
                    ->delete();

                // 5. Delete personal access tokens
                DB::table('personal_access_tokens')
                    ->where('tokenable_type', 'App\\Models\\Student')
                    ->where('tokenable_id', $id)
                    ->delete();

                // 6. Delete the student
                $user->delete();
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'User deleted successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('deleteUser failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete user'
            ], 500);
        }
    }

    /**
     * Get student registration details
     */
    public function getStudentRegistration($studentId)
    {
        try {
            $currentYear = date('Y');
            
            $registration = Registration::where('studentId', $studentId)
                ->where('enrollmentYear', $currentYear)
                ->where('status', 'Approved')
                ->first();

            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Registration not found for current year'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $registration
            ]);

        } catch (\Exception $e) {
            Log::error('getStudentRegistration failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch registration'
            ], 500);
        }
    }
    
}

<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\Authority;
use App\Models\Student;

class AuthController extends Controller
{
    /**
     * Handle login request
     */
    public function login(Request $request)
    {
        // Validate the request
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required|string',
        ]);

        $email    = $request->email;
        $password = $request->password;
        $currentYear = date('Y');

        // ── 1. Check authority table (Admin / Staff) ──────────────────────
        $authority = Authority::where('email', $email)->first();

        if ($authority && Hash::check($password, $authority->password)) {
            $token = $authority->createToken('auth-token', ['authority'])->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'Login successful',
                'data'    => [
                    'token' => $token,
                    'user'  => [
                        'id'       => $authority->authorityId,
                        'name'     => $authority->name,
                        'email'    => $authority->email,
                        'phone'    => $authority->phone,
                        'role'     => $authority->role,
                        'userType' => 'authority',
                    ],
                ],
            ], 200);
        }

        // ── 2. Check student table ─────────────────────────────────────────
        $student = Student::where('email', $email)->first();

        if ($student && Hash::check($password, $student->password)) {
            // Check if student has an approved registration for CURRENT YEAR
            $currentYearRegistration = DB::table('registration')
                ->where('studentId', $student->studentId)
                ->where('enrollmentYear', $currentYear)
                ->where('status', 'Approved')
                ->first();

            // Check if student has ANY registration (for message purposes)
            $anyRegistration = DB::table('registration')
                ->where('studentId', $student->studentId)
                ->exists();

            if (!$currentYearRegistration) {
                if ($anyRegistration) {
                    // Student exists but not enrolled for current year
                    return response()->json([
                        'success' => false,
                        'message' => 'Please enroll for ' . $currentYear . ' before logging in.',
                        'requires_enrollment' => true,
                        'student_id' => $student->studentId,
                        'student_name' => $student->name,
                        'student_email' => $student->email
                    ], 403);
                } else {
                    // No registration at all (should not happen as they registered before)
                    return response()->json([
                        'success' => false,
                        'message' => 'No registration found. Please contact administration.',
                    ], 403);
                }
            }

            // Create token using Sanctum
            $token = $student->createToken('auth-token', ['student'])->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'Login successful',
                'data'    => [
                    'token' => $token,
                    'user'  => [
                        'id'       => $student->studentId,
                        'name'     => $student->name,
                        'email'    => $student->email,
                        'phone'    => $student->phone,
                        'address'  => $student->address,
                        'userType' => 'student',
                    ],
                ],
            ], 200);
        }

        // 3. Check parent login using student.parentEmail / student.parentPassword
        $linkedStudents = Student::where('parentEmail', $email)->get();

        if ($linkedStudents->count() > 0) {
            $parentAuthStudent = $linkedStudents->first(function ($linkedStudent) use ($password) {
                return !empty($linkedStudent->parentPassword) && Hash::check($password, $linkedStudent->parentPassword);
            });

            if (!$parentAuthStudent) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid email or password',
                ], 401);
            }

            $linkedStudentIds = $linkedStudents->pluck('studentId')->toArray();

            $hasCurrentYearEnrollment = DB::table('registration')
                ->whereIn('studentId', $linkedStudentIds)
                ->where('enrollmentYear', $currentYear)
                ->where('status', 'Approved')
                ->exists();

            if (!$hasCurrentYearEnrollment) {
                return response()->json([
                    'success' => false,
                    'message' => 'Parent login is not allowed. No linked child is enrolled for ' . $currentYear . '.',
                    'requires_enrollment' => true,
                    'login_type' => 'parent',   // ← add this
                ], 403);
            }

            $token = $parentAuthStudent->createToken('auth-token', ['parent'])->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'Parent login successful',
                'data'    => [
                    'token' => $token,
                    'user'  => [
                        'id'       => $parentAuthStudent->studentId,
                        'name'     => $parentAuthStudent->name,
                        'email'    => $parentAuthStudent->parentEmail,
                        'userType' => 'parent',
                        'linkedChildrenCount' => count($linkedStudentIds),
                        'enrollmentYear' => $currentYear,
                    ],
                ],
            ], 200);
        }

        return response()->json([
            'success' => false,
            'message' => 'Invalid email or password',
        ], 401);
    }

    /**
     * Handle logout request
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logout successful',
        ], 200);
    }

    /**
     * Get authenticated user
     */
    public function me(Request $request)
    {
        $user = $request->user();
        
        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized',
            ], 401);
        }

        if ($user instanceof Authority) {
            return response()->json([
                'success' => true,
                'data'    => [
                    'id'       => $user->authorityId,
                    'name'     => $user->name,
                    'email'    => $user->email,
                    'phone'    => $user->phone,
                    'role'     => $user->role,
                    'userType' => 'authority',
                ],
            ], 200);
        } else {
            // Parent session (token ability: parent)
            if ($request->user()->tokenCan('parent')) {
                $linkedStudents = Student::where('parentEmail', $user->parentEmail)->get();
                $linkedStudentIds = $linkedStudents->pluck('studentId')->toArray();
                $currentYear = date('Y');

                $hasCurrentYearEnrollment = DB::table('registration')
                    ->whereIn('studentId', $linkedStudentIds)
                    ->where('enrollmentYear', $currentYear)
                    ->where('status', 'Approved')
                    ->exists();

                return response()->json([
                    'success' => true,
                    'data'    => [
                        'id'       => $user->studentId,
                        'name'     => $user->name,
                        'email'    => $user->parentEmail,
                        'userType' => 'parent',
                        'linkedChildrenCount' => count($linkedStudentIds),
                        'enrolled_for_current_year' => $hasCurrentYearEnrollment,
                    ],
                ], 200);
            }

            // Student session
            $currentYearRegistration = DB::table('registration')
                ->where('studentId', $user->studentId)
                ->where('enrollmentYear', date('Y'))
                ->where('status', 'Approved')
                ->exists();

            return response()->json([
                'success' => true,
                'data'    => [
                    'id'       => $user->studentId,
                    'name'     => $user->name,
                    'email'    => $user->email,
                    'phone'    => $user->phone,
                    'address'  => $user->address,
                    'userType' => 'student',
                    'enrolled_for_current_year' => $currentYearRegistration,
                ],
            ], 200);
        }
    }
}

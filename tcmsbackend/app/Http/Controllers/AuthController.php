<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Carbon\Carbon;
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
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $email = $request->email;
        $password = $request->password;
        $currentYear = date('Y');

        // ── 1. Check authority table (Admin / Staff) ──────────────────────
        $authority = Authority::where('email', $email)->first();

        if ($authority && Hash::check($password, $authority->password)) {
            $token = $authority->createToken('auth-token', ['authority'])->plainTextToken;

            return response()->json([
                'success' => true,
                'message' => 'Login successful',
                'data' => [
                    'token' => $token,
                    'user' => [
                        'id' => $authority->authorityId,
                        'name' => $authority->name,
                        'email' => $authority->email,
                        'phone' => $authority->phone,
                        'role' => $authority->role,
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
                'data' => [
                    'token' => $token,
                    'user' => [
                        'id' => $student->studentId,
                        'name' => $student->name,
                        'email' => $student->email,
                        'phone' => $student->phone,
                        'address' => $student->address,
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
                'data' => [
                    'token' => $token,
                    'user' => [
                        'id' => $parentAuthStudent->studentId,
                        'name' => $parentAuthStudent->name,
                        'email' => $parentAuthStudent->parentEmail,
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
                'data' => [
                    'id' => $user->authorityId,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'role' => $user->role,
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
                    'data' => [
                        'id' => $user->studentId,
                        'name' => $user->name,
                        'email' => $user->parentEmail,
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
                'data' => [
                    'id' => $user->studentId,
                    'name' => $user->name,
                    'email' => $user->email,
                    'phone' => $user->phone,
                    'address' => $user->address,
                    'userType' => 'student',
                    'enrolled_for_current_year' => $currentYearRegistration,
                ],
            ], 200);
        }
    }

    /**
     * Send password reset link
     * POST /api/auth/forgot-password
     */
    public function forgotPassword(Request $request)
    {
        $validator = validator($request->all(), [
            'email' => 'required|email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $email = $request->email;
        $user = null;
        $userType = null;

        // Check if email belongs to authority (admin/staff)
        $authority = Authority::where('email', $email)->first();
        if ($authority) {
            $user = $authority;
            $userType = 'authority';
            $userTable = 'authority';
            $userIdField = 'authorityId';
            $userName = $authority->name;
        }

        // Check if email belongs to student
        if (!$user) {
            $student = Student::where('email', $email)->first();
            if ($student) {
                $user = $student;
                $userType = 'student';
                $userTable = 'student';
                $userIdField = 'studentId';
                $userName = $student->name;
            }
        }

        // Check if email belongs to parent (via parentEmail in student table)
        if (!$user) {
            $parent = Student::where('parentEmail', $email)->first();
            if ($parent) {
                $user = $parent;
                $userType = 'parent';
                $userTable = 'student';
                $userIdField = 'studentId';
                $userName = 'Parent';
            }
        }

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Email address not found in our records.',
            ], 404);
        }

        // Generate secure token
        $plainToken = Str::random(64);
        $hashedToken = Hash::make($plainToken);

        // Store token in password_reset_tokens table
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $email],
            [
                'token' => $hashedToken,
                'created_at' => Carbon::now(),
                'user_type' => $userType  // Store user type for reference
            ]
        );

        // Build reset link for frontend
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:3000');
        $resetLink = $frontendUrl . '/reset-password?token=' . $plainToken . '&email=' . urlencode($email);

        // Send email
try {
    \Log::info('=== EMAIL SENDING DEBUG ===');
    \Log::info('Email to: ' . $email);
    \Log::info('User name: ' . $userName);
    \Log::info('User type: ' . $userType);
    \Log::info('Reset link: ' . $resetLink);
    
    // Check if view exists
    $viewPath = resource_path('views/emails/password-reset.blade.php');
    \Log::info('View file exists: ' . (file_exists($viewPath) ? 'YES' : 'NO'));
    
    Mail::send('emails.password-reset', [
        'name' => $userName,
        'resetLink' => $resetLink,
        'userType' => $userType
    ], function ($message) use ($email, $userName) {
        $message->to($email, $userName)
            ->subject('Reset Your Password - TCMS');
    });

    return response()->json([
        'success' => true,
        'message' => 'Password reset link has been sent to your email.',
    ]);
} catch (\Exception $e) {
    \Log::error('Email failed: ' . $e->getMessage());
    \Log::error('Error trace: ' . $e->getTraceAsString());
    
    return response()->json([
        'success' => false,
        'message' => 'Failed to send reset email: ' . $e->getMessage(),
    ], 500);
}
    }

    /**
     * Reset password using token
     * POST /api/auth/reset-password
     */
    public function resetPassword(Request $request)
    {
        $validator = validator($request->all(), [
            'email' => 'required|email',
            'token' => 'required|string',
            'password' => 'required|string|min:6|confirmed',
            'password_confirmation' => 'required|string',
            'user_type' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        // Find token record
        $record = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->first();

        if (!$record) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid or expired reset link.',
            ], 400);
        }

        // Check if token is expired (60 minutes)
        if (Carbon::parse($record->created_at)->addMinutes(60)->isPast()) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json([
                'success' => false,
                'message' => 'Reset link has expired. Please request a new one.',
            ], 400);
        }

        // Verify token
        if (!Hash::check($request->token, $record->token)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid reset token.',
            ], 400);
        }

        // Determine user type from stored record or by checking tables
        $userType = $record->user_type ?? null;

        if (!$userType) {
            // Fallback: check which table has this email
            if (Authority::where('email', $request->email)->exists()) {
                $userType = 'authority';
            } elseif (Student::where('email', $request->email)->exists()) {
                $userType = 'student';
            } elseif (Student::where('parentEmail', $request->email)->exists()) {
                $userType = 'parent';
            }
        }

        // Update password based on user type
        $passwordUpdated = false;

        if ($userType === 'authority') {
            $passwordUpdated = Authority::where('email', $request->email)
                ->update(['password' => Hash::make($request->password)]);
        } elseif ($userType === 'student') {
            $passwordUpdated = Student::where('email', $request->email)
                ->update(['password' => Hash::make($request->password)]);
        } elseif ($userType === 'parent') {
            $passwordUpdated = Student::where('parentEmail', $request->email)
                ->update(['parentPassword' => Hash::make($request->password)]);
        }

        if (!$passwordUpdated) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update password. User not found.',
            ], 404);
        }

        // Delete the used token
        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json([
            'success' => true,
            'message' => 'Password has been reset successfully. Please login with your new password.',
        ]);
    }
}

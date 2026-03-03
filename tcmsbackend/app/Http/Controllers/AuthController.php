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

        // ── 1. Check authority table (Admin / Staff) ──────────────────────
        $authority = Authority::where('email', $email)->first();

        // Direct string comparison since passwords are stored as plain text
        if ($authority && $authority->password === $password) {
            // Create token using Sanctum
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

        // Direct string comparison since passwords are stored as plain text
        if ($student && Hash::check($password, $student->password)) {
            // Check registration status
            $registration = DB::table('registration')
                ->where('studentId', $student->studentId)
                ->orderBy('createdAt', 'desc')
                ->first();

            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid email or password',
                ], 401);
            }

            if ($registration->status === 'Pending' || $registration->status === 'Rejected') {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid email or password',
                ], 401);
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
        // Revoke the current user's token
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

        // Check if user is authority or student
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
            return response()->json([
                'success' => true,
                'data'    => [
                    'id'       => $user->studentId,
                    'name'     => $user->name,
                    'email'    => $user->email,
                    'phone'    => $user->phone,
                    'address'  => $user->address,
                    'userType' => 'student',
                ],
            ], 200);
        }
    }
}
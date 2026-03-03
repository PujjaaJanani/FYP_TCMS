<?php

namespace App\Http\Middleware; // This must match exactly

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log; // Add this for logging

class AuthMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        // Log the request for debugging
        Log::info('AuthMiddleware called', [
            'path' => $request->path(),
            'method' => $request->method(),
            'headers' => $request->headers->all()
        ]);

        $token = $request->header('Authorization');

        if (!$token) {
            Log::warning('No token provided');
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized - Token not provided'
            ], 401);
        }

        // Remove 'Bearer ' prefix if present
        $token = str_replace('Bearer ', '', $token);
        Log::info('Token received', ['token' => substr($token, 0, 20) . '...']);

        // Check if token exists in sessions table
        try {
            $session = DB::table('sessions')->where('token', $token)->first();

            if (!$session) {
                Log::warning('Invalid token', ['token' => substr($token, 0, 20) . '...']);
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized - Invalid token'
                ], 401);
            }

            Log::info('Token valid', [
                'user_id' => $session->user_id,
                'user_type' => $session->user_type
            ]);

            // Attach user info to request
            $request->merge([
                'auth_user_id' => $session->user_id,
                'auth_user_type' => $session->user_type
            ]);

            return $next($request);
            
        } catch (\Exception $e) {
            Log::error('Database error in AuthMiddleware', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Authentication service unavailable'
            ], 500);
        }
    }
}
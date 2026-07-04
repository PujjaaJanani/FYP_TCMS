<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureTokenAbility
{
    public function handle(Request $request, Closure $next, ...$abilities)
    {
        $token = $request->user()?->currentAccessToken();

        if (!$token) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 401);
        }

        // OR-match: user needs at least one of the listed abilities
        foreach ($abilities as $ability) {
            if ($token->can($ability)) {
                return $next($request);
            }
        }

        return response()->json(['success' => false, 'message' => 'Forbidden: insufficient permissions'], 403);
    }
}
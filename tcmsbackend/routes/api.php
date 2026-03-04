<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\RegistrationController;
use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\ClassScheduleController;
use App\Http\Controllers\StudyMaterialController;
use App\Http\Controllers\TestMarkController;
/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Test route
Route::get('/test', function() {
    return response()->json([
        'message' => 'API is working!',
        'timestamp' => now(),
        'routes' => [
            // Auth routes
            'POST /api/login' => 'AuthController@login',
            'POST /api/logout' => 'AuthController@logout (protected)',
            'GET /api/me' => 'AuthController@me (protected)',
            
            // Registration routes (public)
            'POST /api/register' => 'RegistrationController@register',
            'GET /api/subjects' => 'RegistrationController@getSubjects (public)',
            'GET /api/classes' => 'RegistrationController@getAllClasses (public)',
            'GET /api/classes/by-subject/{id}' => 'RegistrationController@getClassesBySubject (public)',
            'GET /api/registration-status/{email}' => 'RegistrationController@checkRegistrationStatus (public)',
            
            // Application routes (protected)
            'GET /api/registrations' => 'ApplicationController@getAllRegistrations (protected)',
            'PATCH /api/registrations/{id}/status' => 'ApplicationController@updateStatus (protected)',
            'GET /api/registrations/check/{email}' => 'ApplicationController@checkRegistrationStatus (protected)',
            
            // Class Schedule routes (protected)
            'GET /api/classes/schedule' => 'ClassScheduleController@getAllClasses (protected)',
            'POST /api/classes/schedule' => 'ClassScheduleController@createClass (protected)',
            'PUT /api/classes/schedule/{id}' => 'ClassScheduleController@updateClass (protected)',
            'DELETE /api/classes/schedule/{id}' => 'ClassScheduleController@deleteClass (protected)',
            'GET /api/teachers' => 'ClassScheduleController@getTeachers (protected)',
            'POST /api/teachers' => 'ClassScheduleController@createTeacher (protected)',
            'PUT /api/teachers/{id}' => 'ClassScheduleController@updateTeacher (protected)',
            'DELETE /api/teachers/{id}' => 'ClassScheduleController@deleteTeacher (protected)',
            'GET /api/subjects/manage' => 'ClassScheduleController@getAllSubjects (protected)',
            'POST /api/subjects' => 'ClassScheduleController@createSubject (protected)',
        ]
    ]);
});

    // Public routes (no authentication required)
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [RegistrationController::class, 'register']);
    Route::get('/subjects', [RegistrationController::class, 'getSubjects']); // Public for student registration
    Route::get('/classes/by-subject/{subjectId}', [RegistrationController::class, 'getClassesBySubject']); // Public
    Route::get('/classes', [RegistrationController::class, 'getAllClasses']); // Public
    Route::get('/registration-status/{email}', [RegistrationController::class, 'checkRegistrationStatus']); // Public

    // Protected routes - using Sanctum
    Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    
    // Application management routes
    Route::get('/registrations', [ApplicationController::class, 'getAllRegistrations']);
    Route::patch('/registrations/{id}/status', [ApplicationController::class, 'updateStatus']);
    Route::get('/registrations/check/{email}', [ApplicationController::class, 'checkRegistrationStatus']);

    // Class Schedule Management 
    Route::get('/classes/schedule', [ClassScheduleController::class, 'getAllClasses']);
    Route::post('/classes/schedule', [ClassScheduleController::class, 'createClass']);
    Route::put('/classes/schedule/{id}', [ClassScheduleController::class, 'updateClass']);
    Route::delete('/classes/schedule/{id}', [ClassScheduleController::class, 'deleteClass']);
    Route::get('/teachers', [ClassScheduleController::class, 'getTeachers']);
    Route::post('/teachers', [ClassScheduleController::class, 'createTeacher']);
    Route::put('/teachers/{id}', [ClassScheduleController::class, 'updateTeacher']);
    Route::delete('/teachers/{id}', [ClassScheduleController::class, 'deleteTeacher']);
    Route::get('/subjects/manage', [ClassScheduleController::class, 'getAllSubjects']);
    Route::post('/subjects', [ClassScheduleController::class, 'createSubject']);

    // Study Materials Management
    Route::get('/study-materials/my-classes', [StudyMaterialController::class, 'getMyClasses']);
    Route::get('/study-materials/class/{classId}', [StudyMaterialController::class, 'getClassMaterials']);
    Route::get('/study-materials', [StudyMaterialController::class, 'getAllMaterials']);
    Route::get('/study-materials/{id}', [StudyMaterialController::class, 'getMaterial']);
    Route::post('/study-materials', [StudyMaterialController::class, 'createMaterial']);
    Route::put('/study-materials/{id}', [StudyMaterialController::class, 'updateMaterial']);
    Route::delete('/study-materials/{id}', [StudyMaterialController::class, 'deleteMaterial']);
    Route::get('/student/study-materials/my-classes', [StudyMaterialController::class, 'getStudentClasses']);
    
    // Test Marks Management
    Route::prefix('testmarks')->group(function () {
        Route::get('/class/{classId}', [TestMarkController::class, 'getClassTests']);
        Route::get('/class/{classId}/students', [TestMarkController::class, 'getClassStudents']);
        Route::get('/{markId}', [TestMarkController::class, 'show']);
        Route::post('/', [TestMarkController::class, 'store']);
        Route::put('/{classId}/{testName}/{testDate}', [TestMarkController::class, 'update']);
        Route::delete('/{classId}/{testName}/{testDate}', [TestMarkController::class, 'destroy']);
        
        // Debug routes
        Route::get('/debug', [TestMarkController::class, 'debugStudent']);
    });

});

// Preflight OPTIONS requests - Simplified CORS handling
Route::options('/{any}', function () {
    return response('', 204)
        ->header('Access-Control-Allow-Origin', 'http://localhost:3000')
        ->header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
        ->header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN')
        ->header('Access-Control-Allow-Credentials', 'true')
        ->header('Access-Control-Max-Age', '86400');
})->where('any', '.*');
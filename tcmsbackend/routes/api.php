<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\RegistrationController;
use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\ClassScheduleController;
use App\Http\Controllers\StudyMaterialController;
use App\Http\Controllers\TestMarkController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ProfileController;

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
    Route::get('/payments/toyyibpay/callback', [PaymentController::class, 'toyyibpayCallback']);
    Route::post('/payments/toyyibpay/callback', [PaymentController::class, 'toyyibpayCallback']);

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
    Route::put('/subjects/{id}', [ClassScheduleController::class, 'updateSubject']); 

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

    // Attendance Management
    Route::prefix('attendance')->group(function () {
        Route::get('/my-classes', [AttendanceController::class, 'getMyClasses']);
        Route::get('/class/{classId}/students', [AttendanceController::class, 'getClassStudents']);
        Route::post('/submit', [AttendanceController::class, 'submitAttendance']);
        Route::get('/class/{classId}/history', [AttendanceController::class, 'getClassAttendanceHistory']);
        Route::get('/class/{classId}/date/{date}', [AttendanceController::class, 'getAttendanceByDate']);
        Route::delete('/class/{classId}/date/{date}', [AttendanceController::class, 'deleteAttendanceByDate']); 
    });

    Route::prefix('payments')->group(function () {
        Route::get('/student', [PaymentController::class, 'getStudentPayments']);
        Route::get('/monthly-fee', [PaymentController::class, 'getMonthlyFee']);
        Route::post('/create-intent', [PaymentController::class, 'createPaymentIntent']);
        // In routes/api.php payments section, add:
        Route::get('/verify/{paymentId}', [PaymentController::class, 'verifyPaymentStatus']);
    });

    Route::prefix('staff/payments')->group(function () {
        Route::get('/', [PaymentController::class, 'getAllPayments']);
        Route::get('/stats', [PaymentController::class, 'getPaymentStats']);
        Route::put('/{paymentId}', [PaymentController::class, 'updatePayment']);
        Route::get('/students-month', [PaymentController::class, 'getAllStudentsPaymentStatus']);
        Route::post('/student-payment', [PaymentController::class, 'upsertStudentPayment']);
    });

    Route::prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'getAllUsers']);
        Route::get('/{userType}/{id}', [UserController::class, 'getUser']);
        Route::post('/', [UserController::class, 'createUser']);
        Route::put('/{userType}/{id}', [UserController::class, 'updateUser']);
        Route::delete('/{userType}/{id}', [UserController::class, 'deleteUser']);
        Route::get('/student/{studentId}/registration', [UserController::class, 'getStudentRegistration']);
    });

    // Profile Management
    Route::get('/profile', [ProfileController::class, 'getProfile']);
    Route::put('/profile', [ProfileController::class, 'updateProfile']);
    Route::post('/profile/upload-picture', [ProfileController::class, 'uploadProfilePicture']);
    Route::delete('/profile/delete-picture', [ProfileController::class, 'deleteProfilePicture']);

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
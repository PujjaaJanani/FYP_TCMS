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
use Illuminate\Support\Facades\Storage;

class ProfileController extends Controller
{
    /**
     * Get current user profile
     */
    public function getProfile(Request $request)
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            // Parent profile (token created with 'parent' ability)
            if ($request->user()->tokenCan('parent')) {
                $currentYear = date('Y');
                $parentEmail = $user->parentEmail;

                $linkedStudents = Student::where('parentEmail', $parentEmail)->get();
                $children = [];
                $grandTotalMonthlyFee = 0;

                foreach ($linkedStudents as $child) {
                    $registrations = Registration::where('studentId', $child->studentId)
                        ->where('status', 'Approved')
                        ->where('enrollmentYear', $currentYear)
                        ->get();

                    $childClasses = [];
                    $childTotalMonthlyFee = 0;

                    foreach ($registrations as $registration) {
                        if (empty($registration->classIds)) {
                            continue;
                        }

                        $classIds = array_map('trim', explode(',', $registration->classIds));

                        $classes = DB::table('class')
                            ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                            ->leftJoin('authority', 'class.authorityId', '=', 'authority.authorityId')
                            ->whereIn('class.classId', $classIds)
                            ->where('class.academicYear', $currentYear)
                            ->select(
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

                        foreach ($classes as $class) {
                            $childClasses[] = [
                                'subjectName' => $class->subjectName,
                                'form' => $class->form,
                                'classDay' => $class->classDay,
                                'startTime' => date('H:i', strtotime($class->startTime)),
                                'finishTime' => date('H:i', strtotime($class->finishTime)),
                                'location' => $class->location,
                                'teacher' => $class->teacher,
                                'subjectFee' => floatval($class->subjectFee),
                            ];
                            $childTotalMonthlyFee += floatval($class->subjectFee);
                        }
                    }

                    if (!empty($childClasses)) {
                        $children[] = [
                            'studentId' => $child->studentId,
                            'name' => $child->name,
                            'email' => $child->email,
                            'phone' => $child->phone,
                            'address' => $child->address,
                            'classes' => $childClasses,
                            'totalMonthlyFee' => $childTotalMonthlyFee,
                        ];
                        $grandTotalMonthlyFee += $childTotalMonthlyFee;
                    }
                }

                return response()->json([
                    'success' => true,
                    'data' => [
                        'id' => $user->studentId,
                        'userType' => 'parent',
                        'parentEmail' => $parentEmail,
                        'children' => $children,
                        'linkedChildrenCount' => count($children),
                        'totalMonthlyFee' => $grandTotalMonthlyFee,
                        'currentAcademicYear' => $currentYear,
                    ]
                ]);
            }

            // Determine if user is Authority or Student
            $profile = null;
            $userType = null;

            // Check if Authority
            if ($user instanceof Authority) {
                $profile = Authority::find($user->authorityId);
                $userType = 'authority';
                
                $profileData = [
                    'id' => $profile->authorityId,
                    'userType' => 'authority',
                    'name' => $profile->name,
                    'email' => $profile->email,
                    'phone' => $profile->phone,
                    'role' => $profile->role,
                    'profilePicture' => $profile->profilePicture ? config('filesystems.disks.spaces.url') . '/' . $profile->profilePicture : null,
                    'createdAt' => $profile->createdAt
                ];
            }
            // Check if Student
            else if ($user instanceof Student) {
                $profile = Student::find($user->studentId);
                $userType = 'student';
                
                // Get current academic year
                $currentYear = date('Y');
                
                Log::info('Fetching profile for student: ' . $profile->studentId . ', Current Year: ' . $currentYear);
                
                // Get all approved registrations for this student where enrollmentYear matches current year
                $registrations = Registration::where('studentId', $profile->studentId)
                    ->where('status', 'Approved')
                    ->where('enrollmentYear', $currentYear) // Only get registrations for current year
                    ->get();
                
                Log::info('Found ' . $registrations->count() . ' registrations for current year ' . $currentYear);
                
                $allClasses = [];
                $totalMonthlyFee = 0;
                
                foreach ($registrations as $registration) {
                    Log::info('Processing registration ID: ' . $registration->registrationId . 
                             ', Enrollment Year: ' . $registration->enrollmentYear . 
                             ', ClassIds: ' . $registration->classIds);
                    
                    if ($registration->classIds) {
                        $classIds = explode(',', $registration->classIds);
                        $classIds = array_map('trim', $classIds);
                        
                        Log::info('Class IDs for registration ' . $registration->registrationId . ': ' . json_encode($classIds));
                        
                        // Get details for all classes in this registration
                        // Also filter by class academic year
                        $classes = DB::table('class')
                            ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                            ->leftJoin('authority', 'class.authorityId', '=', 'authority.authorityId')
                            ->whereIn('class.classId', $classIds)
                            ->where('class.academicYear', $currentYear) // Filter by current academic year
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
                        
                        Log::info('Found ' . $classes->count() . ' classes for registration ' . $registration->registrationId);
                        
                        foreach ($classes as $class) {
                            // Format time
                            $class->startTime = date('H:i', strtotime($class->startTime));
                            $class->finishTime = date('H:i', strtotime($class->finishTime));
                            
                            // Add to all classes array
                            $allClasses[] = [
                                'registrationId' => $registration->registrationId,
                                'subjectName' => $class->subjectName,
                                'form' => $class->form,
                                'classDay' => $class->classDay,
                                'startTime' => $class->startTime,
                                'finishTime' => $class->finishTime,
                                'location' => $class->location,
                                'teacher' => $class->teacher,
                                'subjectFee' => $class->subjectFee
                            ];
                            
                            $totalMonthlyFee += floatval($class->subjectFee);
                        }
                    }
                }
                
                // Group classes by form for better organization
                $groupedSubjects = [];
                foreach ($allClasses as $class) {
                    $form = $class['form'];
                    if (!isset($groupedSubjects[$form])) {
                        $groupedSubjects[$form] = [];
                    }
                    $groupedSubjects[$form][] = $class;
                }
                
                // Sort forms
                ksort($groupedSubjects);
                
                Log::info('Total classes for current year for student ' . $profile->studentId . ': ' . count($allClasses));
                
                $profileData = [
                    'id' => $profile->studentId,
                    'userType' => 'student',
                    'name' => $profile->name,
                    'email' => $profile->email,
                    'phone' => $profile->phone,
                    'address' => $profile->address,
                    'profilePicture' => $profile->profilePicture ? config('filesystems.disks.spaces.url') . '/' . $profile->profilePicture : null,
                    'registeredClasses' => $allClasses,
                    'groupedSubjects' => $groupedSubjects,
                    'totalMonthlyFee' => $totalMonthlyFee,
                    'totalClasses' => count($allClasses),
                    'currentAcademicYear' => $currentYear
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $profileData
            ]);

        } catch (\Exception $e) {
            Log::error('getProfile failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch profile: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update profile
     */
    public function updateProfile(Request $request)
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            DB::beginTransaction();

            // Parent can only edit parentEmail
            if ($request->user()->tokenCan('parent')) {
                $validator = Validator::make($request->all(), [
                    'parentEmail' => 'required|email|max:100',
                    'parentPassword' => ['nullable', 'string', 'min:6', 'regex:/[0-9]/', 'regex:/[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?`~]/'],
                ]);

                if ($validator->fails()) {
                    return response()->json([
                        'success' => false,
                        'errors' => $validator->errors()
                    ], 422);
                }

                $oldParentEmail = $user->parentEmail;
                $newParentEmail = trim($request->parentEmail);

                $updateData = ['parentEmail' => $newParentEmail];
                if ($request->filled('parentPassword')) {
                    $updateData['parentPassword'] = Hash::make($request->parentPassword);
                }

                DB::table('student')
                    ->where('parentEmail', $oldParentEmail)
                    ->update($updateData);

                DB::commit();

                return response()->json([
                    'success' => true,
                    'message' => 'Parent email updated successfully'
                ]);
            }

            // Check if Authority or Student
            if ($user instanceof Authority) {
                $validator = Validator::make($request->all(), [
                    'name' => 'required|string|max:100',
                    'email' => 'required|email|max:100',
                    'phone' => 'required|string|max:20',
                    'password' => 'nullable|string|min:6',
                ]);

                if ($validator->fails()) {
                    return response()->json([
                        'success' => false,
                        'errors' => $validator->errors()
                    ], 422);
                }

                $profile = Authority::find($user->authorityId);

                // Check email uniqueness
                if (Authority::where('email', $request->email)
                    ->where('authorityId', '!=', $user->authorityId)
                    ->exists()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Email already exists'
                    ], 400);
                }

                $profile->name = $request->name;
                $profile->email = $request->email;
                $profile->phone = $request->phone;

                if ($request->filled('password')) {
                    $profile->password = Hash::make($request->password);
                }

                $profile->save();

            } else if ($user instanceof Student) {
                $validator = Validator::make($request->all(), [
                    'name' => 'required|string|max:100',
                    'email' => 'required|email|max:100',
                    'phone' => 'required|string|max:20',
                    'address' => 'required|string|max:255',
                    'password' => 'nullable|string|min:6',
                ]);

                if ($validator->fails()) {
                    return response()->json([
                        'success' => false,
                        'errors' => $validator->errors()
                    ], 422);
                }

                $profile = Student::find($user->studentId);

                // Check email uniqueness
                if (Student::where('email', $request->email)
                    ->where('studentId', '!=', $user->studentId)
                    ->exists()) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Email already exists'
                    ], 400);
                }

                $profile->name = $request->name;
                $profile->email = $request->email;
                $profile->phone = $request->phone;
                $profile->address = $request->address;

                if ($request->filled('password')) {
                    $profile->password = Hash::make($request->password);
                }

                $profile->save();
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Profile updated successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('updateProfile failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update profile'
            ], 500);
        }
    }

    /**
     * Upload profile picture
     */
    public function uploadProfilePicture(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'profilePicture' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048'
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'success' => false,
                    'errors' => $validator->errors()
                ], 422);
            }

            $user = $request->user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            $file = $request->file('profilePicture');
            
            // Generate unique filename
            $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            
            $path = Storage::disk('spaces')->putFileAs(
                'profile',
                $file,
                $filename,
                'public'
            );

            // Update database
            if ($user instanceof Authority) {
                $profile = Authority::find($user->authorityId);
                
                // Delete old profile picture if exists
                if ($profile->profilePicture) {
                    Storage::disk('spaces')->delete($profile->profilePicture);
                }

                $profile->profilePicture = $path;
                $profile->save();

            } else if ($user instanceof Student) {
                $profile = Student::find($user->studentId);
                
                // Delete old profile picture if exists
                if ($profile->profilePicture) {
                    Storage::disk('spaces')->delete($profile->profilePicture);
                }
                
                $profile->profilePicture = $path;
                $profile->save();
            }

            return response()->json([
                'success' => true,
                'message' => 'Profile picture updated successfully',
                'data' => [
                    'profilePicture' => config('filesystems.disks.spaces.url') . '/' . $path
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('uploadProfilePicture failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload profile picture'
            ], 500);
        }
    }

    /**
     * Delete profile picture
     */
    public function deleteProfilePicture(Request $request)
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'message' => 'User not authenticated'
                ], 401);
            }

            if ($user instanceof Authority) {
                $profile = Authority::find($user->authorityId);
                
                if ($profile->profilePicture) {
                    Storage::disk('spaces')->delete($profile->profilePicture);
                }

                $profile->profilePicture = null;
                $profile->save();

            } else if ($user instanceof Student) {
                $profile = Student::find($user->studentId);
                
                if ($profile->profilePicture) {
                    Storage::disk('spaces')->delete($profile->profilePicture);
                }

                $profile->profilePicture = null;
                $profile->save();
            }

            return response()->json([
                'success' => true,
                'message' => 'Profile picture deleted successfully'
            ]);

        } catch (\Exception $e) {
            Log::error('deleteProfilePicture failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete profile picture'
            ], 500);
        }
    }
}
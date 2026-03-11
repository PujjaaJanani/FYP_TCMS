<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Hash;

class ClassScheduleController extends Controller
{
    /**
     * GET /api/classes/schedule
     * Get all classes with subject and teacher details
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
                    'class.authorityId',
                    'class.subjectId',
                    'subject.name as subjectName',
                    'subject.form',
                    'subject.subjectFee',
                    'authority.name as teacherName'
                )
                ->orderBy('class.classDay')
                ->orderBy('class.startTime')
                ->get()
                ->map(function ($c) {
                    $c->startTime = date('H:i', strtotime($c->startTime));
                    $c->finishTime = date('H:i', strtotime($c->finishTime));
                    return $c;
                });

            return response()->json([
                'success' => true,
                'data' => $classes
            ], 200);

        } catch (\Exception $e) {
            Log::error('getAllClasses failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch classes'
            ], 500);
        }
    }

    /**
     * GET /api/subjects/manage
     * Get all subjects for management
     */
    public function getAllSubjects()
    {
        try {
            $subjects = DB::table('subject')
                ->orderBy('form')
                ->orderBy('name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $subjects
            ], 200);

        } catch (\Exception $e) {
            Log::error('getAllSubjects failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch subjects'
            ], 500);
        }
    }

    /**
     * POST /api/subjects
     * Create a new subject
     */
    public function createSubject(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'form' => 'required|string|max:100',
            'subjectFee' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Check if subject already exists
            $existing = DB::table('subject')
                ->where('name', $request->name)
                ->where('form', $request->form)
                ->first();

            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Subject already exists for this form'
                ], 400);
            }

            $subjectId = DB::table('subject')->insertGetId([
                'name' => $request->name,
                'form' => $request->form,
                'subjectFee' => $request->subjectFee,
            ]);

            Log::info('Subject created', ['subjectId' => $subjectId]);

            return response()->json([
                'success' => true,
                'message' => 'Subject created successfully',
                'data' => [
                    'subjectId' => $subjectId, 
                    'name' => $request->name, 
                    'form' => $request->form,
                    'subjectFee' => $request->subjectFee
                ]
            ], 201);

        } catch (\Exception $e) {
            Log::error('createSubject failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create subject'
            ], 500);
        }
    }

    /**
     * PUT /api/subjects/{id}
     * Update an existing subject
     */
    public function updateSubject(Request $request, $subjectId)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'form' => 'required|string|max:100',
            'subjectFee' => 'required|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            // Check if another subject with same name and form already exists (excluding current)
            $existing = DB::table('subject')
                ->where('name', $request->name)
                ->where('form', $request->form)
                ->where('subjectId', '!=', $subjectId)
                ->first();

            if ($existing) {
                return response()->json([
                    'success' => false,
                    'message' => 'Another subject with this name and form already exists'
                ], 400);
            }

            $affected = DB::table('subject')
                ->where('subjectId', $subjectId)
                ->update([
                    'name' => $request->name,
                    'form' => $request->form,
                    'subjectFee' => $request->subjectFee,
                ]);

            if ($affected === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Subject not found'
                ], 404);
            }

            Log::info('Subject updated', ['subjectId' => $subjectId]);

            return response()->json([
                'success' => true,
                'message' => 'Subject updated successfully',
                'data' => [
                    'subjectId' => (int)$subjectId,
                    'name' => $request->name,
                    'form' => $request->form,
                    'subjectFee' => $request->subjectFee
                ]
            ], 200);

        } catch (\Exception $e) {
            Log::error('updateSubject failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update subject'
            ], 500);
        }
    }

    /**
     * GET /api/teachers
     * Get all teachers (authority with Staff role)
     */
    public function getTeachers()
    {
        try {
            $teachers = DB::table('authority')
                ->where('role', 'Staff')
                ->select('authorityId', 'name', 'email', 'phone', 'role', 'createdAt')
                ->orderBy('name')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $teachers
            ], 200);

        } catch (\Exception $e) {
            Log::error('getTeachers failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch teachers'
            ], 500);
        }
    }

    /**
     * POST /api/teachers
     * Create a new teacher (Staff)
     */
    public function createTeacher(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:100|unique:authority,email',
            'phone' => 'nullable|string|max:20',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $authorityId = DB::table('authority')->insertGetId([
                'name' => $request->name,
                'email' => $request->email,
                'phone' => $request->phone,
                'password' => Hash::make($request->password),
                'role' => 'Staff',
                'createdAt' => now(),
            ]);

            Log::info('Teacher created', ['authorityId' => $authorityId]);

            return response()->json([
                'success' => true,
                'message' => 'Teacher created successfully',
                'data' => [
                    'authorityId' => $authorityId,
                    'name' => $request->name,
                    'email' => $request->email,
                    'phone' => $request->phone,
                    'role' => 'Staff'
                ]
            ], 201);

        } catch (\Exception $e) {
            Log::error('createTeacher failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create teacher'
            ], 500);
        }
    }

    /**
     * PUT /api/teachers/{id}
     * Update an existing teacher
     */
    public function updateTeacher(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:authority,email,' . $id . ',authorityId',
            'phone' => 'nullable|string|max:255',
            'password' => 'nullable|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $updateData = [
                'name' => $request->name,
                'email' => $request->email,
                'phone' => $request->phone,
            ];

            // Only update password if provided
            if ($request->filled('password')) {
                $updateData['password'] = Hash::make($request->password);
            }

            $affected = DB::table('authority')
                ->where('authorityId', $id)
                ->where('role', 'Staff')
                ->update($updateData);

            if ($affected === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Teacher not found'
                ], 404);
            }

            Log::info('Teacher updated', ['authorityId' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Teacher updated successfully'
            ], 200);

        } catch (\Exception $e) {
            Log::error('updateTeacher failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update teacher'
            ], 500);
        }
    }

    /**
     * DELETE /api/teachers/{id}
     * Delete a teacher
     */
    public function deleteTeacher($id)
    {
        try {
            // Check if teacher has any classes
            $hasClasses = DB::table('class')
                ->where('authorityId', $id)
                ->exists();

            if ($hasClasses) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete teacher with assigned classes'
                ], 400);
            }

            $deleted = DB::table('authority')
                ->where('authorityId', $id)
                ->where('role', 'Staff')
                ->delete();

            if ($deleted === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Teacher not found'
                ], 404);
            }

            Log::info('Teacher deleted', ['authorityId' => $id]);

            return response()->json([
                'success' => true,
                'message' => 'Teacher deleted successfully'
            ], 200);

        } catch (\Exception $e) {
            Log::error('deleteTeacher failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete teacher'
            ], 500);
        }
    }

    /**
     * POST /api/classes/schedule
     * Create a new class (with optional subject creation)
     */
    public function createClass(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'classDay' => 'required|string',
            'startTime' => 'required',
            'finishTime' => 'required',
            'location' => 'nullable|string|max:100',
            'authorityId' => 'required|integer|exists:authority,authorityId',
            'subjectId' => 'nullable|integer|exists:subject,subjectId',
            'newSubject' => 'nullable|array',
            'newSubject.name' => 'required_with:newSubject|string|max:100',
            'newSubject.form' => 'required_with:newSubject|string|max:100',
            'newSubject.subjectFee' => 'required_with:newSubject|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        DB::beginTransaction();
        try {
            $subjectId = $request->subjectId;

            // If new subject data is provided, create the subject first
            if ($request->has('newSubject') && !empty($request->newSubject['name'])) {
                // Check if subject already exists
                $existing = DB::table('subject')
                    ->where('name', $request->newSubject['name'])
                    ->where('form', $request->newSubject['form'])
                    ->first();

                if ($existing) {
                    $subjectId = $existing->subjectId;
                } else {
                    $subjectId = DB::table('subject')->insertGetId([
                        'name' => $request->newSubject['name'],
                        'form' => $request->newSubject['form'],
                        'subjectFee' => $request->newSubject['subjectFee'],
                    ]);
                    Log::info('Subject created during class creation', ['subjectId' => $subjectId]);
                }
            }

            // Ensure we have a subjectId
            if (!$subjectId) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Either select an existing subject or provide new subject details'
                ], 422);
            }

            $classId = DB::table('class')->insertGetId([
                'classDay' => $request->classDay,
                'startTime' => $request->startTime,
                'finishTime' => $request->finishTime,
                'location' => $request->location,
                'authorityId' => $request->authorityId,
                'subjectId' => $subjectId,
            ]);

            DB::commit();

            Log::info('Class created', ['classId' => $classId]);

            return response()->json([
                'success' => true,
                'message' => 'Class created successfully',
                'data' => ['classId' => $classId]
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('createClass failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to create class'
            ], 500);
        }
    }

    /**
     * PUT /api/classes/schedule/{id}
     * Update an existing class
     */
    public function updateClass(Request $request, $classId)
    {
        $validator = Validator::make($request->all(), [
            'classDay' => 'required|string',
            'startTime' => 'required',
            'finishTime' => 'required',
            'location' => 'nullable|string|max:100',
            'authorityId' => 'required|integer|exists:authority,authorityId',
            'subjectId' => 'required|integer|exists:subject,subjectId',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $affected = DB::table('class')
                ->where('classId', $classId)
                ->update([
                    'classDay' => $request->classDay,
                    'startTime' => $request->startTime,
                    'finishTime' => $request->finishTime,
                    'location' => $request->location,
                    'authorityId' => $request->authorityId,
                    'subjectId' => $request->subjectId,
                ]);

            if ($affected === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Class not found'
                ], 404);
            }

            Log::info('Class updated', ['classId' => $classId]);

            return response()->json([
                'success' => true,
                'message' => 'Class updated successfully'
            ], 200);

        } catch (\Exception $e) {
            Log::error('updateClass failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update class'
            ], 500);
        }
    }

    /**
     * DELETE /api/classes/schedule/{id}
     * Delete a class
     */
    public function deleteClass($classId)
    {
        try {
            // Check if class has registrations
            $hasRegistrations = DB::table('registration')
                ->where('classId', $classId)
                ->orWhereRaw('FIND_IN_SET(?, classIds)', [$classId])
                ->exists();

            if ($hasRegistrations) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot delete class with existing registrations'
                ], 400);
            }

            $deleted = DB::table('class')
                ->where('classId', $classId)
                ->delete();

            if ($deleted === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Class not found'
                ], 404);
            }

            Log::info('Class deleted', ['classId' => $classId]);

            return response()->json([
                'success' => true,
                'message' => 'Class deleted successfully'
            ], 200);

        } catch (\Exception $e) {
            Log::error('deleteClass failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete class'
            ], 500);
        }
    }
}
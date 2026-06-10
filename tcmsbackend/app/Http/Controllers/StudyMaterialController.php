<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class StudyMaterialController extends Controller
{
    /**
     * GET /api/student/study-materials/my-classes
     * Get classes that the student is registered for
     */
    public function getStudentClasses(Request $request)
    {
        try {
            $user = $request->user();
            $studentId = $user->getKey();
            $currentYear = date('Y');

            Log::info('Fetching classes for student: ' . $studentId);

            // Get all approved registrations for this student in current year
            $registrations = DB::table('registration')
                ->where('studentId', $studentId)
                ->where('status', 'Approved')
                ->where('enrollmentYear', $currentYear)
                ->get();

            if ($registrations->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'data' => []
                ], 200);
            }

            // Extract all class IDs from registrations
            $classIds = [];
            foreach ($registrations as $reg) {
                // Add classId if exists
                if (!empty($reg->classId)) {
                    $classIds[] = (int) $reg->classId;
                }
                // Add classIds if exists (comma-separated)
                if (!empty($reg->classIds)) {
                    $ids = array_filter(array_map('intval', explode(',', trim($reg->classIds))));
                    $classIds = array_merge($classIds, $ids);
                }
            }

            $classIds = array_unique($classIds);

            if (empty($classIds)) {
                return response()->json([
                    'success' => true,
                    'data' => []
                ], 200);
            }

            // Get class details
            $classes = DB::table('class')
                ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                ->leftJoin('authority', 'class.authorityId', '=', 'authority.authorityId')
                ->whereIn('class.classId', $classIds)
                ->where('class.academicYear', $currentYear)
                ->select(
                    'class.classId',
                    'class.classDay',
                    'class.startTime',
                    'class.finishTime',
                    'class.location',
                    'subject.name as subjectName',
                    'subject.form',
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

            Log::info('Student classes found: ' . $classes->count());

            return response()->json([
                'success' => true,
                'data' => $classes
            ], 200);

        } catch (\Exception $e) {
            Log::error('getStudentClasses failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch your classes'
            ], 500);
        }
    }

    /**
     * GET /api/study-materials/my-classes
     * Get classes taught by the logged-in staff member
     */
    public function getMyClasses(Request $request)
    {
        try {
            $user = $request->user(); // Get authenticated user
            $authorityId = $user->getKey(); // Get user ID
            $currentYear = date('Y');

            Log::info('Fetching classes for authority: ' . $authorityId);

            $classes = DB::table('class')
                ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                ->leftJoin('authority', 'class.authorityId', '=', 'authority.authorityId')
                ->where('class.authorityId', $authorityId)
                ->where('class.academicYear', $currentYear)
                ->select(
                    'class.classId',
                    'class.classDay',
                    'class.startTime',
                    'class.finishTime',
                    'class.location',
                    'subject.name as subjectName',
                    'subject.form',
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

            Log::info('Classes found: ' . $classes->count());

            return response()->json([
                'success' => true,
                'data' => $classes
            ], 200);

        } catch (\Exception $e) {
            Log::error('getMyClasses failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch your classes'
            ], 500);
        }
    }

    /**
     * GET /api/study-materials/class/{classId}
     * Get all materials for a specific class (optionally filter by academic year)
     */
    public function getClassMaterials($classId, Request $request)
    {
        try {
            $query = DB::table('studymaterial')
                ->leftJoin('authority', 'studymaterial.authorityId', '=', 'authority.authorityId')
                ->where('studymaterial.classId', $classId);

            // Optional academic year filter
            if ($request->has('academicYear') && !empty($request->academicYear)) {
                $query->where('studymaterial.academicYear', $request->academicYear);
            }

            $materials = $query->select(
                'studymaterial.*',
                'authority.name as uploadedBy'
            )
                ->orderBy('studymaterial.uploadedAt', 'desc')
                ->get()
                ->groupBy(function ($item) {
                    return date('n/j/Y', strtotime($item->uploadedAt));
                });

            // Transform to array format grouped by date
            $result = [];
            foreach ($materials as $date => $items) {
                $result[] = [
                    'date' => $date,
                    'items' => $items
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $result
            ], 200);

        } catch (\Exception $e) {
            Log::error('getClassMaterials failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch materials'
            ], 500);
        }
    }

    /**
     * GET /api/study-materials
     * Get all study materials grouped by subject/date (optionally filter by academic year)
     */
    public function getAllMaterials(Request $request)
    {
        try {
            $query = DB::table('studymaterial')
                ->join('class', 'studymaterial.classId', '=', 'class.classId')
                ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                ->leftJoin('authority', 'studymaterial.authorityId', '=', 'authority.authorityId')
                ->select(
                    'studymaterial.*',
                    'subject.name as subjectName',
                    'subject.form',
                    'authority.name as uploadedBy'
                );

            // Optional academic year filter
            if ($request->has('academicYear') && !empty($request->academicYear)) {
                $query->where('studymaterial.academicYear', $request->academicYear);
            }

            $materials = $query->orderBy('studymaterial.uploadedAt', 'desc')
                ->get()
                ->groupBy(function ($item) {
                    return $item->subjectName; // Group by subject
                });

            // Transform to array format
            $result = [];
            foreach ($materials as $subject => $items) {
                $result[] = [
                    'subject' => $subject,
                    'materials' => $items->groupBy(function ($item) {
                        return date('n/j/Y', strtotime($item->uploadedAt)); // Group by date
                    })->map(function ($dateGroup, $date) {
                        return [
                            'date' => $date,
                            'items' => $dateGroup
                        ];
                    })->values()
                ];
            }

            return response()->json([
                'success' => true,
                'data' => $result
            ], 200);

        } catch (\Exception $e) {
            Log::error('getAllMaterials failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch materials'
            ], 500);
        }
    }

    /**
     * GET /api/study-materials/{id}
     * Get single material details
     */
    public function getMaterial($materialId)
    {
        try {
            $material = DB::table('studymaterial')
                ->join('class', 'studymaterial.classId', '=', 'class.classId')
                ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                ->leftJoin('authority', 'studymaterial.authorityId', '=', 'authority.authorityId')
                ->where('studymaterial.materialId', $materialId)
                ->select(
                    'studymaterial.*',
                    'subject.name as subjectName',
                    'subject.form',
                    'authority.name as uploadedBy'
                )
                ->first();

            if (!$material) {
                return response()->json([
                    'success' => false,
                    'message' => 'Material not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => $material
            ], 200);

        } catch (\Exception $e) {
            Log::error('getMaterial failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch material'
            ], 500);
        }
    }

    /**
     * POST /api/study-materials
     * Create new study material
     */
    public function createMaterial(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:100',
            'description' => 'nullable|string',
            'fileType' => 'required|in:pdf,image,video,link,zip',
            'classId' => 'required|integer|exists:class,classId',
            'authorityId' => 'required|integer|exists:authority,authorityId',
            // REMOVED academicYear from validation
            'file' => 'required_unless:fileType,link|file|max:51200', // Max 50MB
            'fileUrl' => 'required_if:fileType,link|url'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $fileUrl = null;
            $fileName = null;

            // Handle file upload
            if ($request->fileType !== 'link' && $request->hasFile('file')) {
                $file = $request->file('file');
                $fileName = time() . '_' . $file->getClientOriginalName();

                // Upload to DigitalOcean Spaces
                $path = Storage::disk('spaces')->putFileAs(
                    'materials',
                    $file,
                    $fileName,
                    'public'
                );

                // Set the URL to the full URL
                $fileUrl = config('filesystems.disks.spaces.url') . '/' . $path;

                Log::info('File uploaded to DigitalOcean Spaces', [
                    'original_name' => $file->getClientOriginalName(),
                    'saved_as' => $fileName,
                    'path' => $path,
                    'url' => $fileUrl
                ]);
            } else if ($request->fileType === 'link') {
                $fileUrl = $request->fileUrl;
                $fileName = null;
            }

            // Set academic year to current year automatically
            $currentYear = date('Y');
            
            $materialId = DB::table('studymaterial')->insertGetId([
                'title' => $request->title,
                'description' => $request->description,
                'fileUrl' => $fileUrl,
                'fileType' => $request->fileType,
                'fileName' => $fileName,
                'authorityId' => $request->authorityId,
                'classId' => $request->classId,
                'academicYear' => $currentYear, // Automatically set to current year
                'uploadedAt' => now()
            ]);

            Log::info('Material created', [
                'materialId' => $materialId,
                'fileUrl' => $fileUrl,
                'academicYear' => $currentYear
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Material uploaded successfully',
                'data' => ['materialId' => $materialId]
            ], 201);

        } catch (\Exception $e) {
            Log::error('createMaterial failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to upload material: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * PUT /api/study-materials/{id}
     * Update study material
     */
    public function updateMaterial(Request $request, $materialId)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:100',
            'description' => 'nullable|string',
            'fileType' => 'required|in:pdf,image,video,link,zip',
            'classId' => 'required|integer|exists:class,classId',
            'file' => 'nullable|file|max:51200',
            'fileUrl' => 'required_if:fileType,link|url'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $material = DB::table('studymaterial')->where('materialId', $materialId)->first();

            if (!$material) {
                return response()->json([
                    'success' => false,
                    'message' => 'Material not found'
                ], 404);
            }

            $updateData = [
                'title' => $request->title,
                'description' => $request->description,
                'fileType' => $request->fileType,
                'classId' => $request->classId,
                'academicYear' => $material->academicYear
            ];

            // Handle new file upload
            if ($request->hasFile('file')) {
                // Delete old file from DigitalOcean Spaces if exists
                if ($material->fileName) {
                    // Extract the path from the URL if stored as full URL
                    if (strpos($material->fileUrl, config('filesystems.disks.spaces.url')) === 0) {
                        $oldPath = str_replace(config('filesystems.disks.spaces.url') . '/', '', $material->fileUrl);
                        Storage::disk('spaces')->delete($oldPath);
                        Log::info('Deleted old file from Spaces: ' . $oldPath);
                    } else {
                        // Fallback: try to delete by fileName
                        Storage::disk('spaces')->delete('materials/' . $material->fileName);
                        Log::info('Deleted old file from Spaces by fileName: ' . $material->fileName);
                    }
                }

                $file = $request->file('file');
                $fileName = time() . '_' . $file->getClientOriginalName();

                // Upload to DigitalOcean Spaces
                $path = Storage::disk('spaces')->putFileAs(
                    'materials',
                    $file,
                    $fileName,
                    'public'
                );

                // Set the URL to the full URL
                $updateData['fileUrl'] = config('filesystems.disks.spaces.url') . '/' . $path;
                $updateData['fileName'] = $fileName;

                Log::info('New file uploaded to DigitalOcean Spaces', [
                    'saved_as' => $fileName,
                    'path' => $path,
                    'url' => $updateData['fileUrl']
                ]);
            } else if ($request->fileType === 'link') {
                $updateData['fileUrl'] = $request->fileUrl;
                $updateData['fileName'] = null;
            }
            // If no new file and not a link, keep existing file data (don't change fileUrl/fileName)

            DB::table('studymaterial')
                ->where('materialId', $materialId)
                ->update($updateData);

            Log::info('Material updated', [
                'materialId' => $materialId,
                'academicYear' => $material->academicYear
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Material updated successfully'
            ], 200);

        } catch (\Exception $e) {
            Log::error('updateMaterial failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to update material: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * DELETE /api/study-materials/{id}
     * Delete study material
     */
    public function deleteMaterial($materialId)
    {
        try {
            $material = DB::table('studymaterial')->where('materialId', $materialId)->first();

            if (!$material) {
                return response()->json([
                    'success' => false,
                    'message' => 'Material not found'
                ], 404);
            }

            // Delete file from DigitalOcean Spaces if exists
            if ($material->fileName) {
                // Extract the path from the URL if stored as full URL
                if ($material->fileUrl && strpos($material->fileUrl, config('filesystems.disks.spaces.url')) === 0) {
                    $filePath = str_replace(config('filesystems.disks.spaces.url') . '/', '', $material->fileUrl);
                    Storage::disk('spaces')->delete($filePath);
                    Log::info('Deleted file from Spaces: ' . $filePath);
                } else {
                    // Fallback: try to delete by fileName
                    Storage::disk('spaces')->delete('materials/' . $material->fileName);
                    Log::info('Deleted file from Spaces by fileName: ' . $material->fileName);
                }
            }

            DB::table('studymaterial')->where('materialId', $materialId)->delete();

            Log::info('Material deleted', ['materialId' => $materialId]);

            return response()->json([
                'success' => true,
                'message' => 'Material deleted successfully'
            ], 200);

        } catch (\Exception $e) {
            Log::error('deleteMaterial failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete material'
            ], 500);
        }
    }
}
<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\RegistrationApproved;
use App\Mail\RegistrationRejected;

class ApplicationController extends Controller
{
    /**
     * GET /api/registrations
     * Returns all registrations with full student info and class details.
     */
    public function getAllRegistrations()
    {
        try {
            Log::info('Fetching all registrations');
            
            $registrations = DB::table('registration')
                ->join('student', 'registration.studentId', '=', 'student.studentId')
                ->select(
                    'registration.registrationId',
                    'registration.createdAt',
                    'registration.status',
                    'registration.studentId',
                    'registration.classId',
                    'registration.classIds',
                    'student.name as studentName',
                    'student.email as studentEmail',
                    'student.parentEmail as parentEmail',
                    'student.phone as studentPhone',
                    'student.address as studentAddress'
                )
                ->orderBy('registration.createdAt', 'desc')
                ->get();
            
            Log::info('Registrations found: ' . $registrations->count());

            $result = [];
            foreach ($registrations as $reg) {
                $ids = [];
                
                if (!empty($reg->classIds)) {
                    $cleanIds = trim($reg->classIds);
                    if (!empty($cleanIds)) {
                        $ids = array_filter(array_map('intval', explode(',', $cleanIds)));
                    }
                } elseif (!empty($reg->classId)) {
                    $ids = [(int)$reg->classId];
                }

                $classes = [];
                if (!empty($ids)) {
                    $classes = DB::table('class')
                        ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                        ->leftJoin('authority', 'class.authorityId', '=', 'authority.authorityId')
                        ->whereIn('class.classId', $ids)
                        ->select(
                            'class.classId',
                            'class.classDay',
                            'class.startTime',
                            'class.finishTime',
                            'subject.name as subjectName',
                            'subject.form',
                            'authority.name as teacher'
                        )
                        ->get()
                        ->map(function ($c) {
                            $c->startTime = date('H:i', strtotime($c->startTime));
                            $c->finishTime = date('H:i', strtotime($c->finishTime));
                            return $c;
                        })
                        ->toArray();
                }

                $result[] = [
                    'registrationId' => $reg->registrationId,
                    'createdAt'      => $reg->createdAt,
                    'status'         => $reg->status,
                    'studentId'      => $reg->studentId,
                    'studentName'    => $reg->studentName,
                    'studentEmail'   => $reg->studentEmail,
                    'parentEmail'    => $reg->parentEmail,
                    'studentPhone'   => $reg->studentPhone,
                    'studentAddress' => $reg->studentAddress,
                    'classes'        => $classes,
                ];
            }

            return response()->json([
                'success' => true,
                'data'    => $result,
            ], 200);

        } catch (\Exception $e) {
            Log::error('getAllRegistrations failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch registrations: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PATCH /api/registrations/{id}/status
     * Updates status and sends email notification
     */
    public function updateStatus(Request $request, $registrationId)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:Approved,Rejected',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid status value',
                'errors'  => $validator->errors(),
            ], 422);
        }

        try {
            Log::info('Updating registration status', [
                'registrationId' => $registrationId,
                'status' => $request->status
            ]);
            
            // Get registration details before updating
            $registration = DB::table('registration')
                ->join('student', 'registration.studentId', '=', 'student.studentId')
                ->where('registration.registrationId', $registrationId)
                ->select(
                    'registration.*',
                    'student.name as studentName',
                    'student.email as studentEmail'
                )
                ->first();

            if (!$registration) {
                return response()->json([
                    'success' => false,
                    'message' => 'Registration not found',
                ], 404);
            }

            // Get class details for email
            $ids = [];
            if (!empty($registration->classIds)) {
                $ids = array_filter(array_map('intval', explode(',', trim($registration->classIds))));
            } elseif (!empty($registration->classId)) {
                $ids = [(int)$registration->classId];
            }

            $classes = [];
            if (!empty($ids)) {
                $classes = DB::table('class')
                    ->join('subject', 'class.subjectId', '=', 'subject.subjectId')
                    ->leftJoin('authority', 'class.authorityId', '=', 'authority.authorityId')
                    ->whereIn('class.classId', $ids)
                    ->select(
                        'class.classDay',
                        'class.startTime',
                        'class.finishTime',
                        'subject.name as subjectName',
                        'subject.form',
                        'authority.name as teacher'
                    )
                    ->get()
                    ->map(function ($c) {
                        $c->startTime = date('H:i', strtotime($c->startTime));
                        $c->finishTime = date('H:i', strtotime($c->finishTime));
                        return $c;
                    });
            }

            // Update status
            DB::table('registration')
                ->where('registrationId', $registrationId)
                ->update(['status' => $request->status]);

            // Send email notification
            try {
                if ($request->status === 'Approved') {
                    Mail::to($registration->studentEmail)
                        ->send(new RegistrationApproved(
                            $registration->studentName,
                            $classes
                        ));
                    Log::info('Approval email sent to: ' . $registration->studentEmail);
                } 
                elseif ($request->status === 'Rejected') {
                    Mail::to($registration->studentEmail)
                        ->send(new RegistrationRejected(
                            $registration->studentName,
                            $classes
                        ));
                    Log::info('Rejection email sent to: ' . $registration->studentEmail);
                }
            } catch (\Exception $emailError) {
                // Log email error but don't fail the request
                Log::error('Email sending failed', [
                    'error' => $emailError->getMessage(),
                    'email' => $registration->studentEmail
                ]);
                // Continue - status was updated successfully
            }

            return response()->json([
                'success' => true,
                'message' => 'Registration ' . strtolower($request->status) . ' successfully. Email notification sent.',
                'data'    => [
                    'registrationId' => (int)$registrationId,
                    'status'         => $request->status,
                ],
            ], 200);

        } catch (\Exception $e) {
            Log::error('updateStatus failed', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to update status: ' . $e->getMessage(),
            ], 500);
        }
    }
}

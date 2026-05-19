<?php

namespace App\Services;

use Illuminate\Support\Facades\Log;
use Twilio\Rest\Client;

class SMSService
{
    protected $twilio;
    protected $fromNumber;

    public function __construct()
    {
        // Initialize Twilio
        $sid = env('TWILIO_SID');
        $token = env('TWILIO_AUTH_TOKEN');
        $this->fromNumber = env('TWILIO_FROM_NUMBER');

        if ($sid && $token) {
            $this->twilio = new Client($sid, $token);
        } else {
            Log::warning('Twilio credentials not configured');
        }
    }

    /**
     * Send SMS to a single recipient
     */
    public function sendSms($phoneNumber, $message)
    {
        // Clean phone number
        $phoneNumber = $this->formatPhoneNumber($phoneNumber);

        if (!$phoneNumber) {
            Log::warning('Invalid phone number for SMS', ['phone' => $phoneNumber]);
            return false;
        }

        if (!$this->twilio) {
            Log::error('Twilio not initialized. Check your credentials.');
            return false;
        }

        try {
            $this->twilio->messages->create($phoneNumber, [
                'from' => $this->fromNumber,
                'body' => $message
            ]);

            Log::info('SMS sent via Twilio successfully', [
                'to' => $phoneNumber,
                'message' => substr($message, 0, 50) . '...'
            ]);
            return true;
        } catch (\Exception $e) {
            Log::error('Twilio SMS failed', [
                'error' => $e->getMessage(),
                'to' => $phoneNumber
            ]);
            return false;
        }
    }

    /**
     * Send SMS to multiple recipients
     */
    public function sendBulkSms($recipients, $message)
    {
        $successCount = 0;
        foreach ($recipients as $recipient) {
            if ($this->sendSms($recipient, $message)) {
                $successCount++;
            }
            // Small delay to avoid rate limiting
            usleep(100000); // 0.1 second delay
        }
        return $successCount;
    }

    /**
     * Format Malaysian phone number for international format
     */
    private function formatPhoneNumber($phone)
    {
        // Remove any non-numeric characters except +
        $phone = preg_replace('/[^0-9+]/', '', $phone);

        // If it has +, remove it for processing
        $hasPlus = strpos($phone, '+') === 0;
        $phone = preg_replace('/[^0-9]/', '', $phone);

        // Case 1: Already has 60 prefix (10-11 digits starting with 60)
        if (preg_match('/^60[0-9]{9,10}$/', $phone)) {
            return '+' . $phone;
        }

        // Case 2: Starts with 0 (Malaysian format: 0183917890)
        if (preg_match('/^0[0-9]{9,10}$/', $phone)) {
            return '+60' . substr($phone, 1);
        }

        // Case 3: Starts with 1 (e.g., 183917890)
        if (preg_match('/^1[0-9]{8,9}$/', $phone)) {
            return '+60' . $phone;
        }

        // Case 4: Already has +60 prefix
        if ($hasPlus && preg_match('/^60[0-9]{9,10}$/', $phone)) {
            return '+' . $phone;
        }

        Log::warning('Invalid phone number format', ['original' => $phone]);
        return null;
    }

    /**
     * Test SMS connection
     */
    public function testConnection($testPhoneNumber)
    {
        $testMessage = "Test SMS from Hari's Tuition Center. If you receive this, your Twilio integration is working!";
        return $this->sendSms($testPhoneNumber, $testMessage);
    }
}
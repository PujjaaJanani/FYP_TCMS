<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class RegistrationApproved extends Mailable
{
    use Queueable, SerializesModels;

    public $studentName;
    public $classes;

    /**
     * Create a new message instance.
     */
    public function __construct($studentName, $classes)
    {
        $this->studentName = $studentName;
        $this->classes = $classes;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        return $this->subject('Registration Approved - Hari\'s Tuition Center')
                    ->view('emails.registration-approved');
    }
}
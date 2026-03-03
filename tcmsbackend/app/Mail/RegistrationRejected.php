<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class RegistrationRejected extends Mailable
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
        return $this->subject('Registration Update - Hari\'s Tuition Center')
                    ->view('emails.registration-rejected');
    }
}
<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PaymentReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public $childrenNames;
    public $totalFee;
    public $dueMonth;
    public $pendingCount;

    /**
     * Create a new message instance.
     */
    public function __construct($childrenNames, $totalFee, $dueMonth, $pendingCount)
    {
        $this->childrenNames = $childrenNames;
        $this->totalFee = $totalFee;
        $this->dueMonth = $dueMonth;
        $this->pendingCount = $pendingCount;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Payment Reminder - Tuition Fee Due',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.payment-reminder',
        );
    }
}
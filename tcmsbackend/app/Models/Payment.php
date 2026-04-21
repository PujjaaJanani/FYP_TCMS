<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    protected $table = 'payment';
    protected $primaryKey = 'paymentId';
    public $timestamps = false;

    // Allow mass assignment
    protected $fillable = [
        'amount',
        'datePaid',
        'method',
        'paymentStatus',
        'receiptUrl',
        'remark',
        'registrationId',
        'transactionId',
        'academicYear'
    ];

    // Make ALL attributes accessible (no restrictions)
    protected $guarded = [];
    
    // Cast types
    protected $casts = [
        'datePaid' => 'datetime',
        'amount' => 'float',
        'paymentId' => 'integer',
        'registrationId' => 'integer'
    ];

    // Make sure all attributes are visible
    protected $hidden = [];

    // Accessor methods to ensure properties are accessible
    public function getPaymentIdAttribute($value)
    {
        return $value;
    }

    public function getAmountAttribute($value)
    {
        return (float)$value;
    }

    public function getDatePaidAttribute($value)
    {
        return $value;
    }

    public function getMethodAttribute($value)
    {
        return $value;
    }

    public function getPaymentStatusAttribute($value)
    {
        return $value;
    }

    public function getReceiptUrlAttribute($value)
    {
        return $value;
    }

    public function getRemarkAttribute($value)
    {
        return $value;
    }

    public function getRegistrationIdAttribute($value)
    {
        return $value;
    }

    public function getTransactionIdAttribute($value)
    {
        return $value;
    }

    // Relationships
    public function registration()
    {
        return $this->belongsTo(Registration::class, 'registrationId', 'registrationId');
    }
}
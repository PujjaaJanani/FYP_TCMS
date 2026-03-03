<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'payment';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'paymentId';

    /**
     * Indicates if the model should be timestamped.
     *
     * @var bool
     */
    public $timestamps = false;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'amount',
        'method',
        'paymentStatus',
        'receiptUrl',
        'remark',
        'registrationId',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected $casts = [
        'datePaid' => 'datetime',
        'amount' => 'float',
    ];

    /**
     * Get the registration for this payment.
     */
    public function registration()
    {
        return $this->belongsTo(Registration::class, 'registrationId', 'registrationId');
    }

    /**
     * Check if the payment is paid.
     *
     * @return bool
     */
    public function isPaid()
    {
        return $this->paymentStatus === 'Paid';
    }

    /**
     * Check if the payment is pending.
     *
     * @return bool
     */
    public function isPending()
    {
        return $this->paymentStatus === 'Pending';
    }
}
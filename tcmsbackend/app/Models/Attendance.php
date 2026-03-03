<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'attendance';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'attendanceId';

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
        'date',
        'status',
        'authorityId',
        'registrationId',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected $casts = [
        'date' => 'datetime',
    ];

    /**
     * Get the authority who marked this attendance.
     */
    public function authority()
    {
        return $this->belongsTo(Authority::class, 'authorityId', 'authorityId');
    }

    /**
     * Get the registration for this attendance.
     */
    public function registration()
    {
        return $this->belongsTo(Registration::class, 'registrationId', 'registrationId');
    }

    /**
     * Check if the student was present.
     *
     * @return bool
     */
    public function isPresent()
    {
        return $this->status === 'Present';
    }

    /**
     * Check if the student was absent.
     *
     * @return bool
     */
    public function isAbsent()
    {
        return $this->status === 'Absent';
    }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendance extends Model
{
    protected $table = 'attendance';
    protected $primaryKey = 'attendanceId';
    public $timestamps = false;

    protected $fillable = [
        'date',
        'status',
        'classId',
        'authorityId',
        'registrationId'
    ];

    protected $casts = [
        'date' => 'datetime',
        'status' => 'string'
    ];

    // Relationships
    public function registration()
    {
        return $this->belongsTo(Registration::class, 'registrationId', 'registrationId');
    }

    public function authority()
    {
        return $this->belongsTo(Authority::class, 'authorityId', 'authorityId');
    }

    public function class()
    {
        return $this->belongsTo(ClassModel::class, 'classId', 'classId');
    }
}
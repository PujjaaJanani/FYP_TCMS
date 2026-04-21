<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Registration extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'registration';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'registrationId';

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
        'status',
        'studentId',
        'classId',
        'classIds',
        'enrollmentYear',  
        'monthlyFee' 
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'createdAt' => 'datetime',
    ];

    /**
     * Get the student for this registration.
     */
    public function student()
    {
        return $this->belongsTo(Student::class, 'studentId', 'studentId');
    }

    /**
     * Get the primary class for this registration (for backward compatibility).
     */
    public function class()
    {
        return $this->belongsTo(ClassModel::class, 'classId', 'classId');
    }

    /**
     * Get all classes for this registration from the classIds column.
     */
    public function classes()
    {
        // This is a custom relationship since classIds stores multiple IDs
        $classIds = explode(',', $this->classIds ?? '');
        return ClassModel::whereIn('classId', $classIds);
    }

    /**
     * Get all payments for this registration.
     */
    public function payments()
    {
        return $this->hasMany(Payment::class, 'registrationId', 'registrationId');
    }

    /**
     * Get all attendance records for this registration.
     */
    public function attendances()
    {
        return $this->hasMany(Attendance::class, 'registrationId', 'registrationId');
    }

    /**
     * Get all test marks for this registration.
     */
    public function testMarks()
    {
        return $this->hasMany(TestMark::class, 'registrationId', 'registrationId');
    }

    /**
     * Get the class IDs as an array.
     *
     * @return array
     */
    public function getClassIdsArrayAttribute()
    {
        if (empty($this->classIds)) {
            return [];
        }
        return array_map('intval', explode(',', $this->classIds));
    }

    /**
     * Get the number of classes registered.
     *
     * @return int
     */
    public function getClassCountAttribute()
    {
        return count($this->class_ids_array);
    }

    /**
     * Check if the registration is pending.
     *
     * @return bool
     */
    public function isPending()
    {
        return $this->status === 'Pending';
    }

    /**
     * Check if the registration is approved.
     *
     * @return bool
     */
    public function isApproved()
    {
        return $this->status === 'Approved';
    }

    /**
     * Check if the registration is rejected.
     *
     * @return bool
     */
    public function isRejected()
    {
        return $this->status === 'Rejected';
    }
}
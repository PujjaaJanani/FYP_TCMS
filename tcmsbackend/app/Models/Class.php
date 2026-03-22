<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClassModel extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'class';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'classId';

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
        'classDay',
        'startTime',
        'finishTime',
        'location',
        'availability',
        'authorityId',
        'subjectId',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected $casts = [
        'startTime' => 'datetime',
        'finishTime' => 'datetime',
    ];

    /**
     * Get the authority (teacher) managing this class.
     */
    public function authority()
    {
        return $this->belongsTo(Authority::class, 'authorityId', 'authorityId');
    }

    /**
     * Get the subject for this class.
     */
    public function subject()
    {
        return $this->belongsTo(Subject::class, 'subjectId', 'subjectId');
    }

    /**
     * Get all registrations for this class.
     */
    public function registrations()
    {
        return $this->hasMany(Registration::class, 'classId', 'classId');
    }

    /**
     * Get all students registered for this class.
     */
    public function students()
    {
        return $this->hasManyThrough(
            Student::class,
            Registration::class,
            'classId',
            'studentId',
            'classId',
            'studentId'
        );
    }

    /**
     * Get all study materials for this class.
     */
    public function studyMaterials()
    {
        return $this->hasMany(StudyMaterial::class, 'classId', 'classId');
    }
}
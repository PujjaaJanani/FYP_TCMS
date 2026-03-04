<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TestMark extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'testmark';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'markId';

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
        'mark',
        'testName',
        'testDate',
        'registrationId',
        'classId'
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'testDate' => 'date',
        'mark' => 'float'
    ];

    /**
     * Get the registration for this test mark.
     */
    public function registration()
    {
        return $this->belongsTo(Registration::class, 'registrationId', 'registrationId');
    }

    /**
     * Get the class for this test mark.
     */
    public function class()
    {
        return $this->belongsTo(ClassModel::class, 'classId', 'classId');
    }

    /**
     * Get the student through registration.
     */
    public function student()
    {
        return $this->hasOneThrough(
            Student::class,
            Registration::class,
            'registrationId',
            'studentId',
            'registrationId',
            'studentId'
        );
    }

    /**
     * Check if mark is passing (>= 50).
     */
    public function isPassing()
    {
        return $this->mark >= 50;
    }

    /**
     * Get the grade for this mark.
     */
    public function getGradeAttribute()
    {
        if ($this->mark >= 90) return 'A+';
        if ($this->mark >= 80) return 'A';
        if ($this->mark >= 70) return 'B';
        if ($this->mark >= 60) return 'C';
        if ($this->mark >= 50) return 'D';
        return 'F';
    }

    /**
     * Scope a query to only include marks for a specific class.
     */
    public function scopeForClass($query, $classId)
    {
        return $query->where('classId', $classId);
    }

    /**
     * Scope a query to only include a specific test.
     */
    public function scopeForTest($query, $testName, $testDate)
    {
        return $query->where('testName', $testName)
                     ->where('testDate', $testDate);
    }

    /**
     * Scope a query to only include marks above a threshold.
     */
    public function scopeAbove($query, $threshold)
    {
        return $query->where('mark', '>=', $threshold);
    }

    /**
     * Scope a query to only include marks below a threshold.
     */
    public function scopeBelow($query, $threshold)
    {
        return $query->where('mark', '<', $threshold);
    }

    /**
     * Get all unique tests for a class.
     */
    public static function getUniqueTestsForClass($classId)
    {
        return self::where('classId', $classId)
            ->select('testName', 'testDate')
            ->distinct()
            ->orderBy('testDate', 'desc')
            ->get();
    }

    /**
     * Calculate average for a test.
     */
    public static function calculateTestAverage($classId, $testName, $testDate)
    {
        return self::where('classId', $classId)
            ->where('testName', $testName)
            ->where('testDate', $testDate)
            ->avg('mark');
    }
}
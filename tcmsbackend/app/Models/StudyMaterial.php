<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudyMaterial extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'studymaterial';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'materialId';

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
        'title',
        'description',
        'fileUrl',
        'authorityId',
        'classId',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected $casts = [
        'uploadedAt' => 'datetime',
    ];

    /**
     * Get the authority who uploaded this material.
     */
    public function authority()
    {
        return $this->belongsTo(Authority::class, 'authorityId', 'authorityId');
    }

    /**
     * Get the class for this study material.
     */
    public function class()
    {
        return $this->belongsTo(ClassModel::class, 'classId', 'classId');
    }
}
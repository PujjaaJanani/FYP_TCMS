<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'subject';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'subjectId';

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
        'name',
        'form',
    ];

    /**
     * Get all classes for this subject.
     */
    public function classes()
    {
        return $this->hasMany(ClassModel::class, 'subjectId', 'subjectId');
    }
}
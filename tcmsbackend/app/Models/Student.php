<?php

namespace App\Models;

use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;

class Student extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $table = 'student';
    protected $primaryKey = 'studentId';
    public $timestamps = false;

    protected $fillable = [
        'name',
        'email',
        'parentEmail',
        'parentPassword',
        'password',
        'phone',
        'address',
        'profilePicture',
        'authorityId',
    ];

    protected $hidden = [
        'password',
        'parentPassword',
    ];

    // Relationships
    public function authority()
    {
        return $this->belongsTo(Authority::class, 'authorityId', 'authorityId');
    }

    public function registrations()
    {
        return $this->hasMany(Registration::class, 'studentId', 'studentId');
    }
}

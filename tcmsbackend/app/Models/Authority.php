<?php

namespace App\Models;

use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;

class Authority extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $table = 'authority';
    protected $primaryKey = 'authorityId';
    public $timestamps = false;

    protected $fillable = [
        'name',
        'email',
        'password',
        'phone',
        'profilePicture',
        'role',
        'createdAt',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'createdAt' => 'datetime',
    ];

    // Relationships
    public function students()
    {
        return $this->hasMany(Student::class, 'authorityId', 'authorityId');
    }

    public function classes()
    {
        return $this->hasMany(ClassModel::class, 'authorityId', 'authorityId');
    }

    public function studyMaterials()
    {
        return $this->hasMany(StudyMaterial::class, 'authorityId', 'authorityId');
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class, 'authorityId', 'authorityId');
    }

    // Helper methods
    public function isAdmin()
    {
        return $this->role === 'Admin';
    }

    public function isStaff()
    {
        return $this->role === 'Staff';
    }

    public static function findByEmail($email)
    {
        return static::where('email', $email)->first();
    }
}
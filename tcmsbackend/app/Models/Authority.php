<?php

namespace App\Models;

use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;

class Authority extends Authenticatable
{
    use HasApiTokens, HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'authority';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'authorityId';

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
        'email',
        'password',
        'phone',
        'role',
        'createdAt',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token', // Although not used, good practice to include
    ];

    /**
     * The attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected $casts = [
        'createdAt' => 'datetime',
    ];

    /**
     * Get all students created by this authority.
     */
    public function students()
    {
        return $this->hasMany(Student::class, 'authorityId', 'authorityId');
    }

    /**
     * Get all classes managed by this authority.
     */
    public function classes()
    {
        return $this->hasMany(ClassModel::class, 'authorityId', 'authorityId');
    }

    /**
     * Get all study materials uploaded by this authority.
     */
    public function studyMaterials()
    {
        return $this->hasMany(StudyMaterial::class, 'authorityId', 'authorityId');
    }

    /**
     * Get all attendance records marked by this authority.
     */
    public function attendances()
    {
        return $this->hasMany(Attendance::class, 'authorityId', 'authorityId');
    }

    /**
     * Get the tokens that belong to this authority.
     */
    // public function tokens()
    // {
    //     return $this->hasMany(\Laravel\Sanctum\PersonalAccessToken::class, 'tokenable_id', 'authorityId')
    //                 ->where('tokenable_type', Authority::class);
    // }

    /**
     * Check if the authority is an admin.
     *
     * @return bool
     */
    public function isAdmin()
    {
        return $this->role === 'Admin';
    }

    /**
     * Check if the authority is a staff member.
     *
     * @return bool
     */
    public function isStaff()
    {
        return $this->role === 'Staff';
    }

    /**
     * Find authority by email.
     *
     * @param string $email
     * @return static|null
     */
    public static function findByEmail($email)
    {
        return static::where('email', $email)->first();
    }
}
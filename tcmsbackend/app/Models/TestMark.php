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
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected $casts = [
        'testDate' => 'date',
        'mark' => 'float',
    ];

    /**
     * Get the registration for this test mark.
     */
    public function registration()
    {
        return $this->belongsTo(Registration::class, 'registrationId', 'registrationId');
    }
}
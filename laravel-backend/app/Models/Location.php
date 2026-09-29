<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Location extends Model
{
    use HasFactory;

    protected $fillable = ['floor_id', 'qr_slug'];

    public function floor()
    {
        return $this->belongsTo(Floor::class);
    }

    public function scanLogs()
    {
        return $this->hasMany(ScanLog::class);
    }
}

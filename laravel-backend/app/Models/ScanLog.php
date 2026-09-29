<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScanLog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['location_id', 'qr_slug_raw', 'resolved', 'created_at'];

    public function location()
    {
        return $this->belongsTo(Location::class);
    }
}

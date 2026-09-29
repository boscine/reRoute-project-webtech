<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Floor extends Model
{
    use HasFactory;

    protected $fillable = ['building_id', 'label', 'order'];

    public function building()
    {
        return $this->belongsTo(Building::class);
    }

    public function locations()
    {
        return $this->hasMany(Location::class);
    }
}

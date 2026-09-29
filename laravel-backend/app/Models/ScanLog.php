<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScanLog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['location_id', 'qr_slug_raw', 'resolved', 'created_at'];

    /**
     * SQLite has no boolean type, so the column is stored and read back as an
     * integer. Without this cast, every API response exposes `resolved: 0|1`
     * where the Vue client expects a real boolean. It is masked today only
     * because `v-if` treats 0 as falsy; a strict `=== false` comparison or a
     * JSON schema validator would fail.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'resolved' => 'boolean',
        ];
    }

    public function location()
    {
        return $this->belongsTo(Location::class);
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\Building;
use App\Models\Floor;
use App\Models\Location;
use App\Models\ScanLog;
use Illuminate\Http\Request;

class PublicLocationController extends Controller
{
    // GET /api/buildings
    public function buildings()
    {
        return response()->json(Building::orderBy('name', 'asc')->get());
    }

    // GET /api/floors?building=
    public function floors(Request $request)
    {
        $query = Floor::with(['building', 'locations'])->orderBy('order', 'asc');

        if ($request->filled('building')) {
            $val = $request->input('building');
            if (is_numeric($val)) {
                $query->where('building_id', $val);
            } else {
                $query->whereHas('building', function ($q) use ($val) {
                    $q->where('name', $val);
                });
            }
        }

        return response()->json($query->get());
    }

    // GET /api/locations/{qrSlug}
    public function resolveLocation(string $qrSlug)
    {
        $normalized = strtolower(trim($qrSlug));
        $location = Location::with(['floor.building'])
            ->whereRaw('LOWER(qr_slug) = ?', [$normalized])
            ->first();

        // Audit scan log
        ScanLog::create([
            'location_id' => $location ? $location->id : null,
            'qr_slug_raw' => $qrSlug,
            'resolved' => (bool)$location,
            'created_at' => now(),
        ]);

        if (!$location) {
            return response()->json([
                'found' => false,
                'message' => "Location not found for QR code: {$qrSlug}",
            ], 404);
        }

        return response()->json([
            'found' => true,
            'locationId' => $location->id,
            'qrSlug' => $location->qr_slug,
            'building' => $location->floor->building->name,
            'buildingId' => $location->floor->building->id,
            'floor' => $location->floor->label,
            'floorId' => $location->floor->id,
            'order' => $location->floor->order,
        ]);
    }
}

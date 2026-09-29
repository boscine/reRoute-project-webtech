<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Building;
use App\Models\Floor;
use App\Models\Location;
use App\Models\ScanLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class AdminController extends Controller
{
    private function logActivity($userId, $action, $targetType, $targetId = null, $details = null)
    {
        ActivityLog::create([
            'user_id' => $userId,
            'action' => $action,
            'target_type' => $targetType,
            'target_id' => $targetId ? (string)$targetId : null,
            'details' => $details ? (is_string($details) ? $details : json_encode($details)) : null,
            'created_at' => now(),
        ]);
    }

    // ------------------------------------------------------------------
    // AUTHENTICATION
    // ------------------------------------------------------------------
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', strtolower(trim($request->email)))->first();

        if (!$user || !Hash::check($request->password, $user->password) || !$user->is_active) {
            return response()->json(['error' => 'Invalid credentials or inactive account'], 401);
        }

        $token = $user->createToken('admin-token')->plainTextToken;
        $this->logActivity($user->id, 'LOGIN', 'AdminUser', $user->id, ['email' => $user->email]);

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }

    // ------------------------------------------------------------------
    // DASHBOARD & REPORTS
    // ------------------------------------------------------------------
    public function dashboard()
    {
        $counts = [
            'buildings' => Building::count(),
            'floors' => Floor::count(),
            'locations' => Location::count(),
            'totalScans' => ScanLog::count(),
        ];

        $recentScans = ScanLog::with(['location.floor.building'])
            ->orderBy('id', 'desc')
            ->take(10)
            ->get();

        return response()->json([
            'counts' => $counts,
            'recentScans' => $recentScans,
        ]);
    }

    public function reports()
    {
        $topScans = ScanLog::selectRaw('location_id, count(id) as scan_count')
            ->whereNotNull('location_id')
            ->groupBy('location_id')
            ->orderByDesc('scan_count')
            ->take(5)
            ->with(['location.floor.building'])
            ->get()
            ->map(function ($item) {
                return [
                    'locationId' => $item->location_id,
                    'scanCount' => $item->scan_count,
                    'qrSlug' => $item->location?->qr_slug,
                    'building' => $item->location?->floor?->building?->name,
                    'floor' => $item->location?->floor?->label,
                ];
            });

        $timelineData = ScanLog::orderBy('id', 'desc')
            ->take(200)
            ->get(['created_at', 'resolved']);

        return response()->json([
            'topLocations' => $topScans,
            'timelineData' => $timelineData,
        ]);
    }

    // ------------------------------------------------------------------
    // CRUD: BUILDINGS
    // ------------------------------------------------------------------
    public function buildings()
    {
        return response()->json(Building::withCount('floors')->orderBy('name', 'asc')->get());
    }

    public function createBuilding(Request $request)
    {
        $request->validate(['name' => 'required|unique:buildings,name']);
        $b = Building::create(['name' => $request->name]);
        $this->logActivity($request->user()->id, 'CREATE', 'Building', $b->id, ['name' => $b->name]);
        return response()->json($b, 201);
    }

    public function updateBuilding(Request $request, $id)
    {
        $b = Building::findOrFail($id);
        $request->validate(['name' => 'required|unique:buildings,name,' . $id]);
        $b->update(['name' => $request->name]);
        $this->logActivity($request->user()->id, 'UPDATE', 'Building', $b->id, ['name' => $b->name]);
        return response()->json($b);
    }

    public function deleteBuilding(Request $request, $id)
    {
        $b = Building::findOrFail($id);
        $b->delete();
        $this->logActivity($request->user()->id, 'DELETE', 'Building', $id);
        return response()->json(['success' => true]);
    }

    // ------------------------------------------------------------------
    // CRUD: FLOORS
    // ------------------------------------------------------------------
    public function floors()
    {
        return response()->json(
            Floor::with(['building'])->withCount('locations')->orderBy('building_id')->orderBy('order')->get()
        );
    }

    public function createFloor(Request $request)
    {
        $request->validate([
            'buildingId' => 'required|exists:buildings,id',
            'label' => 'required',
            'order' => 'nullable|integer',
        ]);

        $floor = Floor::create([
            'building_id' => $request->buildingId,
            'label' => $request->label,
            'order' => $request->order ?? 1,
        ]);

        $this->logActivity($request->user()->id, 'CREATE', 'Floor', $floor->id, $request->all());
        return response()->json($floor, 201);
    }

    public function updateFloor(Request $request, $id)
    {
        $floor = Floor::findOrFail($id);
        $floor->update([
            'building_id' => $request->buildingId ?? $floor->building_id,
            'label' => $request->label ?? $floor->label,
            'order' => $request->order ?? $floor->order,
        ]);

        $this->logActivity($request->user()->id, 'UPDATE', 'Floor', $id, $request->all());
        return response()->json($floor);
    }

    public function deleteFloor(Request $request, $id)
    {
        $floor = Floor::findOrFail($id);
        $floor->delete();
        $this->logActivity($request->user()->id, 'DELETE', 'Floor', $id);
        return response()->json(['success' => true]);
    }

    // ------------------------------------------------------------------
    // CRUD: LOCATIONS
    // ------------------------------------------------------------------
    public function locations()
    {
        return response()->json(
            Location::with(['floor.building'])->withCount('scanLogs')->orderBy('id', 'desc')->get()
        );
    }

    public function createLocation(Request $request)
    {
        $request->validate([
            'floorId' => 'required|exists:floors,id',
            'qrSlug' => 'required|unique:locations,qr_slug',
        ]);

        $loc = Location::create([
            'floor_id' => $request->floorId,
            'qr_slug' => strtolower(trim($request->qrSlug)),
        ]);

        $this->logActivity($request->user()->id, 'CREATE', 'Location', $loc->id, $request->all());
        return response()->json($loc, 201);
    }

    public function updateLocation(Request $request, $id)
    {
        $loc = Location::findOrFail($id);
        $loc->update([
            'floor_id' => $request->floorId ?? $loc->floor_id,
            'qr_slug' => $request->qrSlug ? strtolower(trim($request->qrSlug)) : $loc->qr_slug,
        ]);

        $this->logActivity($request->user()->id, 'UPDATE', 'Location', $id, $request->all());
        return response()->json($loc);
    }

    public function deleteLocation(Request $request, $id)
    {
        $loc = Location::findOrFail($id);
        $loc->delete();
        $this->logActivity($request->user()->id, 'DELETE', 'Location', $id);
        return response()->json(['success' => true]);
    }

    // ------------------------------------------------------------------
    // QR CODE GENERATION
    // ------------------------------------------------------------------
    public function qrImage(Request $request, $qrSlug)
    {
        $baseUrl = $request->query('baseUrl', 'http://localhost:5173');
        $targetUrl = "{$baseUrl}/?loc=" . urlencode($qrSlug);
        $png = QrCode::format('svg')->size(300)->generate($targetUrl);
        $dataUrl = 'data:image/svg+xml;base64,' . base64_encode($png);

        return response()->json([
            'qrSlug' => $qrSlug,
            'targetUrl' => $targetUrl,
            'dataUrl' => $dataUrl,
        ]);
    }

    // ------------------------------------------------------------------
    // SCAN LOGS
    // ------------------------------------------------------------------
    public function scanLogs(Request $request)
    {
        $limit = (int)$request->query('limit', 50);
        $logs = ScanLog::with(['location.floor.building'])->orderBy('id', 'desc')->paginate($limit);

        return response()->json([
            'data' => $logs->items(),
            'total' => $logs->total(),
            'page' => $logs->currentPage(),
            'lastPage' => $logs->lastPage(),
        ]);
    }

    // ------------------------------------------------------------------
    // USER MANAGEMENT
    // ------------------------------------------------------------------
    public function users()
    {
        return response()->json(User::orderBy('id', 'asc')->get(['id', 'email', 'role', 'is_active', 'created_at']));
    }

    public function createUser(Request $request)
    {
        $request->validate([
            'email' => 'required|email|unique:users,email',
            'password' => 'required|min:6',
            'role' => 'nullable|in:ADMIN,SUPERADMIN',
        ]);

        $user = User::create([
            'name' => explode('@', $request->email)[0],
            'email' => strtolower(trim($request->email)),
            'password' => Hash::make($request->password),
            'role' => $request->role ?? 'ADMIN',
            'is_active' => true,
        ]);

        $this->logActivity($request->user()->id, 'CREATE', 'AdminUser', $user->id, ['email' => $user->email]);
        return response()->json($user, 201);
    }

    public function toggleUserActive(Request $request, $id)
    {
        if ($request->user()->id == $id) {
            return response()->json(['error' => 'Cannot deactivate self'], 400);
        }

        $user = User::findOrFail($id);
        $user->is_active = !$user->is_active;
        $user->save();

        $action = $user->is_active ? 'ACTIVATE' : 'DEACTIVATE';
        $this->logActivity($request->user()->id, $action, 'AdminUser', $id);

        return response()->json(['id' => $user->id, 'is_active' => $user->is_active]);
    }

    // ------------------------------------------------------------------
    // ACTIVITY LOGS
    // ------------------------------------------------------------------
    public function activityLogs()
    {
        return response()->json(
            ActivityLog::with('user:id,email,role')->orderBy('id', 'desc')->take(100)->get()
        );
    }
}

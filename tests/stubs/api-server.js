'use strict';

/**
 * Stub ReRoute API - a dependency-free, in-memory stand-in for the Laravel API.
 *
 * WHY THIS EXISTS
 * The Playwright suite drives the real Vue SPA (:5173) and, by default, the real
 * Laravel API on :8000. Requiring PHP and a migrated SQLite file makes the suite
 * unrunnable on a clean checkout, and makes the destructive create/delete tests
 * operate on whatever happens to be in the developer's real database.
 *
 * Setting REROUTE_STUB_API=1 boots this file instead. The SPA talks to it
 * unchanged because it mirrors the HTTP contract of the Laravel API exactly:
 * same paths, same status codes, same `error` strings, same response shapes.
 * That fidelity is the point - a test that passes here must pass because the
 * frontend behaves correctly, not because the stub was lenient.
 *
 * WHAT THIS DOES NOT DO
 * It is not a test double for the Laravel layer. It reimplements the contract,
 * so it cannot catch a regression *in* the contract. Tests whose premise is real
 * backend behaviour (Sanctum token enforcement, cascade deletes, the ScanLog
 * audit trail) are skipped in stub mode via skipIfStubbed() in tests/helpers.js
 * and must be run against the real API with `npm run test:api`.
 *
 * Mirrors: laravel-backend/routes/api.php
 *          app/Http/Controllers/PublicLocationController.php
 *          app/Http/Controllers/AdminController.php
 * Seeds:   laravel-backend/database/seeders/DatabaseSeeder.php
 */

const { createServer } = require('node:http');
const { randomBytes } = require('node:crypto');

const PORT = Number(process.env.STUB_API_PORT || 8000);
const HOST = process.env.STUB_API_HOST || '127.0.0.1';

const ADMIN_EMAIL = 'admin@reroute.campus';
const ADMIN_PASSWORD = 'admin12345';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

// --- state ---------------------------------------------------------------

let db = null;
let idCounter = 0;
let tick = 0;

/** SQLite auto-increment ids are integers; the stub matches that shape. */
function nextId() {
  idCounter += 1;
  return idCounter;
}

/**
 * Monotonic timestamps.
 *
 * Sorting is by id descending in the UI and several assertions depend on that
 * ordering. Real timestamps are millisecond-resolution, so rows created in the
 * same tick can sort ambiguously and make those assertions flaky. Deriving time
 * from a counter off a fixed epoch gives a total order instead.
 */
function stamp() {
  tick += 1;
  return new Date(Date.UTC(2026, 0, 1) + tick * 1000).toISOString();
}

/**
 * Mirrors DatabaseSeeder::run() - four buildings with floors and one location
 * per floor, plus a SUPERADMIN account.
 */
function seed() {
  const admin = {
    id: nextId(),
    name: 'Campus Admin',
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    role: 'SUPERADMIN',
    is_active: true,
    created_at: stamp(),
  };

  const campus = [
    {
      name: 'North Hall',
      floors: [
        { label: 'Ground Floor', order: 1, slug: 'nh-gf' },
        { label: 'Floor 1', order: 2, slug: 'nh-f1' },
        { label: 'Floor 2', order: 3, slug: 'nh-f2' },
        { label: 'Floor 3', order: 4, slug: 'nh-f3' },
      ],
    },
    {
      name: 'Science Centre',
      floors: [
        { label: 'Basement Lab', order: 1, slug: 'sc-b1' },
        { label: 'Floor 1', order: 2, slug: 'sc-f1' },
        { label: 'Floor 2', order: 3, slug: 'sc-f2' },
      ],
    },
    {
      name: 'Student Hub',
      floors: [
        { label: 'Level 1 Dining & Commons', order: 1, slug: 'sh-l1' },
        { label: 'Level 2 Student Affairs', order: 2, slug: 'sh-l2' },
      ],
    },
    {
      name: 'Library Building',
      floors: [
        { label: 'Floor 1 Circulation', order: 1, slug: 'lib-f1' },
        { label: 'Floor 2 Quiet Study', order: 2, slug: 'lib-f2' },
        { label: 'Floor 3 Archives', order: 3, slug: 'lib-f3' },
      ],
    },
  ];

  const buildings = [];
  const floors = [];
  const locations = [];

  for (const bData of campus) {
    const building = { id: nextId(), name: bData.name, created_at: stamp(), updated_at: stamp() };
    buildings.push(building);

    for (const fData of bData.floors) {
      const floor = {
        id: nextId(),
        building_id: building.id,
        label: fData.label,
        order: fData.order,
        created_at: stamp(),
        updated_at: stamp(),
      };
      floors.push(floor);
      locations.push({
        id: nextId(),
        floor_id: floor.id,
        qr_slug: fData.slug,
        created_at: stamp(),
        updated_at: stamp(),
      });
    }
  }

  db = {
    users: [admin],
    buildings,
    floors,
    locations,
    scanLogs: [],
    activityLogs: [
      {
        id: nextId(),
        user_id: admin.id,
        action: 'SEED',
        target_type: 'System',
        target_id: 'InitialSeed',
        details: JSON.stringify({ message: 'Sample campus buildings, floors, and QR targets seeded' }),
        created_at: stamp(),
      },
    ],
    sessions: new Map(),
  };
}

function publicBuilding(b) {
  return { id: b.id, name: b.name, created_at: b.created_at, updated_at: b.updated_at };
}

/** Floor with its building relation and nested locations, as Eloquent returns. */
function floorPayload(f) {
  const building = db.buildings.find(b => b.id === f.building_id);
  return {
    id: f.id,
    building_id: f.building_id,
    label: f.label,
    order: f.order,
    created_at: f.created_at,
    updated_at: f.updated_at,
    building: building ? publicBuilding(building) : null,
    locations: db.locations.filter(l => l.floor_id === f.id),
  };
}

/** Location with floor -> building nesting, as the locations() endpoint returns. */
function locationPayload(l) {
  const floor = db.floors.find(f => f.id === l.floor_id);
  const building = floor ? db.buildings.find(b => b.id === floor.building_id) : null;
  return {
    id: l.id,
    floor_id: l.floor_id,
    qr_slug: l.qr_slug,
    created_at: l.created_at,
    updated_at: l.updated_at,
    floor: floor
      ? {
          id: floor.id,
          building_id: floor.building_id,
          label: floor.label,
          order: floor.order,
          building: building ? publicBuilding(building) : null,
        }
      : null,
    scan_logs_count: db.scanLogs.filter(s => s.location_id === l.id).length,
  };
}

function scanLogPayload(s) {
  const location = s.location_id ? db.locations.find(l => l.id === s.location_id) : null;
  const floor = location ? db.floors.find(f => f.id === location.floor_id) : null;
  const building = floor ? db.buildings.find(b => b.id === floor.building_id) : null;

  return {
    id: s.id,
    location_id: s.location_id,
    qr_slug_raw: s.qr_slug_raw,
    // Cast to a real boolean, matching ScanLog's Eloquent `casts` entry. The
    // stub stores 0/1 internally to mimic SQLite but must not leak that.
    resolved: Boolean(s.resolved),
    created_at: s.created_at,
    location: location
      ? {
          id: location.id,
          qr_slug: location.qr_slug,
          floor: floor
            ? { id: floor.id, label: floor.label, building: building ? publicBuilding(building) : null }
            : null,
        }
      : null,
  };
}

function buildingPayload(b) {
  return { ...publicBuilding(b), floors_count: db.floors.filter(f => f.building_id === b.id).length };
}

function userPayload(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    is_active: u.is_active,
    created_at: u.created_at,
  };
}

function logActivity(userId, action, targetType, targetId, details) {
  db.activityLogs.push({
    id: nextId(),
    user_id: userId,
    action,
    target_type: targetType,
    target_id: targetId != null ? String(targetId) : null,
    details: details == null ? null : typeof details === 'string' ? details : JSON.stringify(details),
    created_at: stamp(),
  });
}

// --- auth ---------------------------------------------------------------

/**
 * Resolves a bearer token to a user, mirroring the auth:sanctum middleware.
 * Expired or unknown tokens are rejected exactly as Laravel rejects them.
 */
function authenticate(authHeader) {
  const header = authHeader || '';
  if (!header.startsWith('Bearer ')) return null;

  const token = header.slice(7);
  const session = db.sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    db.sessions.delete(token);
    return null;
  }

  const user = db.users.find(u => u.id === session.userId);
  if (!user || !user.is_active) return null;
  return user;
}

// --- routing ------------------------------------------------------------

/**
 * Dispatches one request. Returns {status, body} for JSON routes, or a
 * special marker for the health probe.
 */
function handle(method, path, query, body, authHeader) {
  const unauthenticated = { status: 401, body: { message: 'Unauthenticated.' } };

  // GET /up - Laravel's health route, used by Playwright as the readiness probe.
  if (method === 'GET' && path === '/up') {
    return { status: 200, body: { status: 'ok' } };
  }

  if (!path.startsWith('/api/')) {
    return { status: 404, body: { message: 'Not Found' } };
  }
  const route = path.slice(4); // strip /api

  // --- public routes, no auth ---
  if (method === 'GET' && route === '/buildings') {
    return { status: 200, body: db.buildings.slice().sort((a, b) => a.name.localeCompare(b.name)).map(publicBuilding) };
  }

  if (method === 'GET' && route === '/floors') {
    const buildingParam = query.get('building');
    let rows = db.floors.slice();
    if (buildingParam) {
      if (/^\d+$/.test(buildingParam)) {
        rows = rows.filter(f => f.building_id === Number(buildingParam));
      } else {
        rows = rows.filter(f => {
          const b = db.buildings.find(x => x.id === f.building_id);
          return b && b.name === buildingParam;
        });
      }
    }
    rows.sort((a, b) => a.order - b.order);
    return { status: 200, body: rows.map(floorPayload) };
  }

  // GET /api/locations/{qrSlug} - resolves a slug and always writes a ScanLog.
  const resolveMatch = route.match(/^\/locations\/([^/]+)$/);
  if (method === 'GET' && resolveMatch) {
    const qrSlug = decodeURIComponent(resolveMatch[1]);
    const normalized = qrSlug.trim().toLowerCase();
    const location = db.locations.find(l => l.qr_slug.toLowerCase() === normalized);

    db.scanLogs.push({
      id: nextId(),
      location_id: location ? location.id : null,
      qr_slug_raw: qrSlug,
      resolved: location ? 1 : 0,
      created_at: stamp(),
    });

    if (!location) {
      return { status: 404, body: { found: false, message: `Location not found for QR code: ${qrSlug}` } };
    }

    const floor = db.floors.find(f => f.id === location.floor_id);
    const building = db.buildings.find(b => b.id === floor.building_id);

    return {
      status: 200,
      body: {
        found: true,
        locationId: location.id,
        qrSlug: location.qr_slug,
        building: building.name,
        buildingId: building.id,
        floor: floor.label,
        floorId: floor.id,
        order: floor.order,
      },
    };
  }

  // --- admin auth ---
  if (method === 'POST' && route === '/admin/login') {
    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '');

    if (!email || !password) {
      return { status: 422, body: { message: 'The email field is required. (and 1 more error)' } };
    }

    const found = db.users.find(u => u.email === email && u.password === password && u.is_active);
    if (!found) {
      return { status: 401, body: { error: 'Invalid credentials or inactive account' } };
    }

    const token = randomBytes(24).toString('hex');
    db.sessions.set(token, { userId: found.id, expiresAt: Date.now() + TOKEN_TTL_MS });
    logActivity(found.id, 'LOGIN', 'AdminUser', found.id, { email: found.email });

    return {
      status: 200,
      body: {
        token,
        user: { id: found.id, email: found.email, role: found.role },
      },
    };
  }

  // --- everything below requires auth ---
  const segments = route.split('/').filter(Boolean); // e.g. ['admin','buildings','3']
  if (segments[0] !== 'admin') {
    return { status: 404, body: { message: 'Not Found' } };
  }

  const current = authenticate(authHeader);
  if (!current) return unauthenticated;

  const resource = segments[1];
  const id = segments[2] ? Number(segments[2]) : null;

  if (method === 'GET' && route === '/admin/me') {
    return { status: 200, body: userPayload(current) };
  }

  if (method === 'GET' && route === '/admin/dashboard') {
    const recentScans = db.scanLogs.slice(-10).reverse().map(scanLogPayload);
    return {
      status: 200,
      body: {
        counts: {
          buildings: db.buildings.length,
          floors: db.floors.length,
          locations: db.locations.length,
          totalScans: db.scanLogs.length,
        },
        recentScans,
      },
    };
  }

  if (method === 'GET' && route === '/admin/reports') {
    const counts = new Map();
    for (const s of db.scanLogs) {
      if (s.location_id) counts.set(s.location_id, (counts.get(s.location_id) || 0) + 1);
    }
    const topLocations = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([locationId, scanCount]) => {
        const location = db.locations.find(l => l.id === locationId);
        const floor = location && db.floors.find(f => f.id === location.floor_id);
        const building = floor && db.buildings.find(b => b.id === floor.building_id);
        return {
          locationId,
          scanCount,
          qrSlug: location?.qr_slug ?? null,
          building: building?.name ?? null,
          floor: floor?.label ?? null,
        };
      });

    return {
      status: 200,
      body: {
        topLocations,
        timelineData: db.scanLogs
          .slice(-200)
          .reverse()
          .map(s => ({ created_at: s.created_at, resolved: Boolean(s.resolved) })),
      },
    };
  }

  // --- buildings ---
  if (resource === 'buildings') {
    if (method === 'GET' && !id) {
      return { status: 200, body: db.buildings.slice().sort((a, b) => a.name.localeCompare(b.name)).map(buildingPayload) };
    }
    if (method === 'POST') {
      const name = String(body?.name ?? '').trim();
      if (!name) return { status: 422, body: { message: 'The name field is required.' } };
      if (db.buildings.some(b => b.name === name)) {
        return { status: 422, body: { message: 'The name has already been taken.' } };
      }
      const created = { id: nextId(), name, created_at: stamp(), updated_at: stamp() };
      db.buildings.push(created);
      logActivity(current.id, 'CREATE', 'Building', created.id, { name: created.name });
      return { status: 201, body: publicBuilding(created) };
    }
    if (method === 'PUT' && id) {
      const building = db.buildings.find(b => b.id === id);
      if (!building) return { status: 404, body: { message: '' } };
      const name = String(body?.name ?? '').trim();
      if (!name) return { status: 422, body: { message: 'The name field is required.' } };
      if (db.buildings.some(b => b.name === name && b.id !== id)) {
        return { status: 422, body: { message: 'The name has already been taken.' } };
      }
      building.name = name;
      building.updated_at = stamp();
      logActivity(current.id, 'UPDATE', 'Building', id, { name: building.name });
      return { status: 200, body: publicBuilding(building) };
    }
    if (method === 'DELETE' && id) {
      const index = db.buildings.findIndex(b => b.id === id);
      if (index === -1) return { status: 404, body: { message: '' } };
      // Cascade, matching the migration's cascadeOnDelete.
      const floorIds = db.floors.filter(f => f.building_id === id).map(f => f.id);
      db.locations = db.locations.filter(l => !floorIds.includes(l.floor_id));
      db.floors = db.floors.filter(f => f.building_id !== id);
      db.buildings.splice(index, 1);
      logActivity(current.id, 'DELETE', 'Building', id);
      return { status: 200, body: { success: true } };
    }
  }

  // --- floors ---
  if (resource === 'floors') {
    if (method === 'GET' && !id) {
      const rows = db.floors
        .slice()
        .sort((a, b) => a.building_id - b.building_id || a.order - b.order)
        .map(f => ({ ...floorPayload(f), locations_count: db.locations.filter(l => l.floor_id === f.id).length }));
      return { status: 200, body: rows };
    }
    if (method === 'POST') {
      const buildingId = Number(body?.buildingId);
      const label = String(body?.label ?? '').trim();
      if (!db.buildings.some(b => b.id === buildingId)) {
        return { status: 422, body: { message: 'The selected building id is invalid.' } };
      }
      if (!label) return { status: 422, body: { message: 'The label field is required.' } };
      if (db.floors.some(f => f.building_id === buildingId && f.label === label)) {
        return { status: 422, body: { message: 'The floors building id label combination has already been taken.' } };
      }
      const created = {
        id: nextId(),
        building_id: buildingId,
        label,
        order: body?.order != null ? Number(body.order) : 1,
        created_at: stamp(),
        updated_at: stamp(),
      };
      db.floors.push(created);
      logActivity(current.id, 'CREATE', 'Floor', created.id, body);
      return { status: 201, body: floorPayload(created) };
    }
    if (method === 'PUT' && id) {
      const floor = db.floors.find(f => f.id === id);
      if (!floor) return { status: 404, body: { message: '' } };
      if (body?.buildingId != null) floor.building_id = Number(body.buildingId);
      if (body?.label) floor.label = String(body.label);
      if (body?.order != null) floor.order = Number(body.order);
      floor.updated_at = stamp();
      logActivity(current.id, 'UPDATE', 'Floor', id, body);
      return { status: 200, body: floorPayload(floor) };
    }
    if (method === 'DELETE' && id) {
      const index = db.floors.findIndex(f => f.id === id);
      if (index === -1) return { status: 404, body: { message: '' } };
      db.locations = db.locations.filter(l => l.floor_id !== id);
      db.floors.splice(index, 1);
      logActivity(current.id, 'DELETE', 'Floor', id);
      return { status: 200, body: { success: true } };
    }
  }

  // --- locations ---
  if (resource === 'locations') {
    if (method === 'GET' && !id) {
      const rows = db.locations.slice().sort((a, b) => b.id - a.id).map(locationPayload);
      return { status: 200, body: rows };
    }
    if (method === 'POST') {
      const floorId = Number(body?.floorId);
      const qrSlug = String(body?.qrSlug ?? '').trim().toLowerCase();
      if (!db.floors.some(f => f.id === floorId)) {
        return { status: 422, body: { message: 'The selected floor id is invalid.' } };
      }
      if (!qrSlug) return { status: 422, body: { message: 'The qr slug field is required.' } };
      if (db.locations.some(l => l.qr_slug === qrSlug)) {
        return { status: 422, body: { message: 'The qr slug has already been taken.' } };
      }
      const created = { id: nextId(), floor_id: floorId, qr_slug: qrSlug, created_at: stamp(), updated_at: stamp() };
      db.locations.push(created);
      logActivity(current.id, 'CREATE', 'Location', created.id, body);
      return { status: 201, body: locationPayload(created) };
    }
    if (method === 'PUT' && id) {
      const location = db.locations.find(l => l.id === id);
      if (!location) return { status: 404, body: { message: '' } };
      if (body?.floorId != null) location.floor_id = Number(body.floorId);
      if (body?.qrSlug) location.qr_slug = String(body.qrSlug).trim().toLowerCase();
      location.updated_at = stamp();
      logActivity(current.id, 'UPDATE', 'Location', id, body);
      return { status: 200, body: locationPayload(location) };
    }
    if (method === 'DELETE' && id) {
      const index = db.locations.findIndex(l => l.id === id);
      if (index === -1) return { status: 404, body: { message: '' } };
      db.locations.splice(index, 1);
      logActivity(current.id, 'DELETE', 'Location', id);
      return { status: 200, body: { success: true } };
    }
  }

  // --- QR image ---
  const qrMatch = route.match(/^\/admin\/qr\/image\/([^/]+)$/);
  if (method === 'GET' && qrMatch) {
    const qrSlug = decodeURIComponent(qrMatch[1]);
    const baseUrl = query.get('baseUrl') || 'http://localhost:5173';
    const targetUrl = `${baseUrl}/?loc=${encodeURIComponent(qrSlug)}`;

    // The real endpoint returns a base64 data URL rendered from an SVG by
    // simplesoftwareio/simple-qrcode. A 1x1 transparent GIF keeps the contract
    // without pulling in a QR encoder the stub does not need to verify.
    const dataUrl =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    return { status: 200, body: { qrSlug, targetUrl, dataUrl } };
  }

  // --- scan logs ---
  if (method === 'GET' && route === '/admin/scan-logs') {
    const limit = Math.min(Number(query.get('limit') || 50), 200);
    const page = Math.max(Number(query.get('page') || 1), 1);
    const all = db.scanLogs.slice().sort((a, b) => b.id - a.id);
    const slice = all.slice((page - 1) * limit, page * limit);
    return {
      status: 200,
      body: {
        data: slice.map(scanLogPayload),
        total: all.length,
        page,
        lastPage: Math.max(Math.ceil(all.length / limit), 1),
      },
    };
  }

  // --- activity logs ---
  if (method === 'GET' && route === '/admin/activity-logs') {
    const rows = db.activityLogs
      .slice()
      .sort((a, b) => b.id - a.id)
      .slice(0, 100)
      .map(a => {
        const user = a.user_id ? db.users.find(u => u.id === a.user_id) : null;
        return {
          id: a.id,
          user_id: a.user_id,
          action: a.action,
          target_type: a.target_type,
          target_id: a.target_id,
          details: a.details,
          created_at: a.created_at,
          user: user ? { id: user.id, email: user.email, role: user.role } : null,
        };
      });
    return { status: 200, body: rows };
  }

  // --- users ---
  if (resource === 'users') {
    if (method === 'GET') {
      const rows = db.users.slice().sort((a, b) => a.id - b.id).map(userPayload);
      return { status: 200, body: rows };
    }
    if (method === 'POST') {
      const email = String(body?.email ?? '').trim().toLowerCase();
      const password = String(body?.password ?? '');
      if (!email || !password) {
        return { status: 422, body: { message: 'The email and password fields are required.' } };
      }
      if (db.users.some(u => u.email === email)) {
        return { status: 422, body: { message: 'The email has already been taken.' } };
      }
      const role = body?.role === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN';
      const created = {
        id: nextId(),
        name: email.split('@')[0],
        email,
        password,
        role,
        is_active: true,
        created_at: stamp(),
      };
      db.users.push(created);
      logActivity(current.id, 'CREATE', 'AdminUser', created.id, { email: created.email });
      return { status: 201, body: userPayload(created) };
    }
    if (method === 'PATCH' && id && segments[3] === 'toggle-active') {
      if (current.id === id) {
        return { status: 400, body: { error: 'Cannot deactivate self' } };
      }
      const target = db.users.find(u => u.id === id);
      if (!target) return { status: 404, body: { message: '' } };
      target.is_active = !target.is_active;
      logActivity(current.id, target.is_active ? 'ACTIVATE' : 'DEACTIVATE', 'AdminUser', id);
      return { status: 200, body: { id: target.id, is_active: target.is_active } };
    }
  }

  return { status: 404, body: { message: 'Not Found' } };
}

// --- server -------------------------------------------------------------

seed();

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  let raw = '';
  req.on('data', chunk => {
    raw += chunk;
  });

  req.on('end', () => {
    let body = null;
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        // Laravel would answer 422 on a malformed JSON body; the stub reports the
        // same shape rather than throwing, so a spec asserting on the status
        // sees a plausible response instead of a crashed server.
        res.writeHead(422, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Malformed JSON' }));
        return;
      }
    }

    let result;
    try {
      result = handle(req.method, url.pathname, url.searchParams, body, req.headers.authorization);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ message: 'Stub failure', error: String(err && err.message) }));
      return;
    }

    res.writeHead(result.status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result.body));
  });
});

server.listen(PORT, HOST, () => {
  console.log(`> ReRoute stub API listening on http://${HOST}:${PORT}`);
  console.log(`> Seeded admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
});

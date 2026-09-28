'use strict';

/**
 * Stub ReRoute API - a dependency-free, in-memory stand-in for backend/server.js.
 *
 * WHY THIS EXISTS
 * The Playwright suite drives two real dev servers (Vue auth :5173, React
 * dashboard :5174) and, by default, the real Express + MongoDB API on :3000.
 * Requiring a running mongod makes the suite unrunnable on a clean checkout, and
 * makes the destructive create/delete tests operate on whatever happens to be in
 * the developer's local database.
 *
 * Setting REROUTE_STUB_API=1 boots this file instead. The frontends talk to it
 * unchanged because it mirrors the HTTP contract of backend/routes/* exactly:
 * same paths, same status codes, same `error` strings, same response shapes.
 * That fidelity is the point - a test that passes here must pass because the
 * frontend behaves correctly, not because the stub was lenient.
 *
 * WHAT THIS DOES NOT DO
 * It is not a test double for the Express layer. It reimplements the contract,
 * so it cannot catch a regression *in* the contract. Tests whose premise is real
 * backend behaviour (session enforcement, invite single-use consumption, load
 * clamping) are skipped in stub mode via skipIfStubbed() in tests/helpers.js and
 * must be run against the real API with REROUTE_STUB_API=0.
 *
 * Mirrors: backend/server.js, routes/auth.js, routes/admins.js, routes/network.js
 * Seeds:   backend/db.js seedInitialData()
 */

const { createServer } = require('node:http');
const { randomBytes } = require('node:crypto');

const PORT = Number(process.env.STUB_API_PORT || 3000);
const HOST = process.env.STUB_API_HOST || '0.0.0.0';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const VALID_STATUSES = ['Online', 'Offline', 'Pending'];
const VALID_TYPES = ['access_point', 'switch', 'gateway', 'router'];

const UNAUTHORIZED = { error: 'Unauthorized: Admin session required. Please log in.' };

// --- state ---------------------------------------------------------------

let db = null;
let idCounter = 0;
let tick = 0;

/** Mongo-shaped 24-char hex id. */
function nextId() {
  idCounter += 1;
  return idCounter.toString(16).padStart(24, '0');
}

/**
 * Monotonic timestamps.
 *
 * Sorting is by createdAt descending and UI-09 asserts the table follows API
 * ordering. Real createdAt is millisecond-resolution, so two admins created in
 * the same tick can sort ambiguously and make that assertion flaky. Deriving
 * time from a counter off a fixed epoch gives a total order instead.
 */
function stamp() {
  tick += 1;
  return new Date(Date.UTC(2026, 0, 1) + tick * 1000).toISOString();
}

function seed() {
  const superAdmin = {
    _id: nextId(),
    name: 'Campus System Admin',
    email: 'admin@campus.edu',
    password: 'password123',
    role: 'super_admin',
    isActive: true,
    lastLogin: null,
    createdAt: stamp(),
    updatedAt: stamp(),
  };

  const invite = code => ({
    _id: nextId(),
    code,
    createdBy: superAdmin._id,
    usedBy: null,
    usedAt: null,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
    isUsed: false,
    createdAt: stamp(),
    updatedAt: stamp(),
  });

  const node = (name, location, ip, type, status, uptime, load) => ({
    _id: nextId(),
    name,
    location,
    ip,
    type,
    status,
    uptime,
    load,
    notes: '',
    createdAt: stamp(),
    updatedAt: stamp(),
  });

  db = {
    admins: [superAdmin],
    invites: [invite('CR-CAMPUS-2026'), invite('CR-NET-ADMIN')],
    nodes: [
      node('Core Gateway Router 01', 'Admin Bldg Server Room', '192.168.100.1', 'gateway', 'Online', '99.98%', 42),
      node('Library Wi-Fi AP 01', 'Main Library 2F', '192.168.100.15', 'access_point', 'Online', '99.40%', 78),
      node('Science Lab Switch A', 'Science Complex Rm 304', '192.168.100.30', 'switch', 'Online', '98.90%', 35),
      node('Cafeteria Wi-Fi AP 02', 'Student Dining Hall', '192.168.100.45', 'access_point', 'Offline', '84.10%', 0),
      node('Gymnasium Switch B', 'Sports Arena Control', '192.168.100.60', 'switch', 'Pending', '—', 0),
    ],
    sessions: new Map(),
  };
}

/** Admin.toPublic() - strips the password field. */
function toPublic(admin) {
  const { password, ...rest } = admin;
  return rest;
}

const byCreatedDesc = (a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);

// --- http plumbing -------------------------------------------------------

/** Mirrors the origin allowlist in backend/server.js. */
function isOriginAllowed(origin) {
  if (!origin) return true;

  const allowed = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map(o => o.trim());
  if (allowed.includes(origin) || allowed.includes('*')) return true;

  let host;
  try {
    host = new URL(origin).hostname;
  } catch {
    return false;
  }
  return (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.startsWith('192.168.') ||
    host.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
  );
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function send(res, status, payload) {
  if (payload === undefined) {
    res.writeHead(status);
    return res.end();
  }
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  return res.end(body);
}

function readBody(req) {
  return new Promise(resolve => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function parseCookies(req) {
  const jar = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    jar[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return jar;
}

/** Returns the live session object, or null. Expired sessions are dropped. */
function getSession(req) {
  const sid = parseCookies(req)['connect.sid'];
  if (!sid) return null;
  const entry = db.sessions.get(sid);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    db.sessions.delete(sid);
    return null;
  }
  return entry.data;
}

/** Issues a real HttpOnly connect.sid cookie, as express-session does. */
function setSessionCookie(res, data) {
  const sid = randomBytes(16).toString('hex');
  db.sessions.set(sid, { data, expiresAt: Date.now() + SESSION_TTL_MS });
  res.setHeader(
    'Set-Cookie',
    'connect.sid=' + sid + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + Math.floor(SESSION_TTL_MS / 1000)
  );
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'connect.sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

// --- route handlers ------------------------------------------------------

const routes = [
  // ---- auth ----
  {
    method: 'POST',
    path: '/api/auth/login',
    async handle(req, res) {
      const { email, password } = await readBody(req);
      if (!email || !password) {
        return send(res, 400, { error: 'Email and password are required.' });
      }

      const admin = db.admins.find(a => a.email === String(email).toLowerCase());
      if (!admin || admin.password !== password) {
        return send(res, 401, { error: 'Invalid email or password.' });
      }
      if (!admin.isActive) {
        return send(res, 403, { error: 'This admin account has been deactivated.' });
      }

      admin.lastLogin = new Date().toISOString();
      admin.updatedAt = stamp();

      setSessionCookie(res, {
        adminId: admin._id,
        adminRole: admin.role,
        adminName: admin.name,
        adminEmail: admin.email,
      });
      return send(res, 200, { message: 'Login successful.', admin: toPublic(admin) });
    },
  },
  {
    method: 'POST',
    path: '/api/auth/register',
    async handle(req, res) {
      const { name, email, password, inviteCode } = await readBody(req);
      if (!name || !email || !password || !inviteCode) {
        return send(res, 400, { error: 'All fields including admin invite code are required.' });
      }
      if (String(password).length < 8) {
        return send(res, 400, { error: 'Password must be at least 8 characters.' });
      }

      const normalised = String(inviteCode).trim().toUpperCase();
      const invite = db.invites.find(
        i => i.code === normalised && i.isUsed === false && new Date(i.expiresAt) > new Date()
      );
      if (!invite) {
        return send(res, 400, { error: 'Invalid or expired invite code.' });
      }

      const lowerEmail = String(email).toLowerCase();
      if (db.admins.some(a => a.email === lowerEmail)) {
        return send(res, 400, { error: 'This email address is already registered.' });
      }

      const admin = {
        _id: nextId(),
        name,
        email: lowerEmail,
        password,
        role: 'admin',
        isActive: true,
        lastLogin: null,
        createdAt: stamp(),
        updatedAt: stamp(),
      };
      db.admins.push(admin);

      invite.isUsed = true;
      invite.usedBy = admin._id;
      invite.usedAt = new Date().toISOString();
      invite.updatedAt = stamp();

      return send(res, 201, { message: 'Admin account successfully registered.', admin: toPublic(admin) });
    },
  },
  {
    method: 'POST',
    path: '/api/auth/logout',
    async handle(req, res) {
      const sid = parseCookies(req)['connect.sid'];
      if (sid) db.sessions.delete(sid);
      clearSessionCookie(res);
      return send(res, 200, { message: 'Logged out successfully.' });
    },
  },
  {
    method: 'GET',
    path: '/api/auth/me',
    async handle(req, res) {
      const session = getSession(req);
      if (!session) return send(res, 401, { error: 'Not authenticated.' });

      const admin = db.admins.find(a => a._id === session.adminId);
      if (!admin) return send(res, 401, { error: 'Admin not found.' });
      return send(res, 200, { admin: toPublic(admin) });
    },
  },

  // ---- admins (all require a session) ----
  {
    method: 'GET',
    path: '/api/admins',
    requireAuth: true,
    async handle(req, res) {
      return send(res, 200, { admins: db.admins.map(toPublic).sort(byCreatedDesc) });
    },
  },
  {
    method: 'POST',
    path: '/api/admins/invite',
    requireAuth: true,
    async handle(req, res) {
      const bytes = randomBytes(4).toString('hex').toUpperCase();
      const code = 'CR-' + bytes.slice(0, 4) + '-' + bytes.slice(4, 8);
      const session = getSession(req);

      const invite = {
        _id: nextId(),
        code,
        createdBy: session ? session.adminId : null,
        usedBy: null,
        usedAt: null,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
        isUsed: false,
        createdAt: stamp(),
        updatedAt: stamp(),
      };
      db.invites.push(invite);

      return send(res, 201, {
        message: 'Invite code generated successfully.',
        invite: { code: invite.code, expiresAt: invite.expiresAt },
      });
    },
  },
  {
    method: 'GET',
    path: '/api/admins/invites',
    requireAuth: true,
    async handle(req, res) {
      const invites = db.invites
        .slice()
        .sort(byCreatedDesc)
        .map(i => {
          const creator = db.admins.find(a => a._id === i.createdBy);
          return {
            ...i,
            createdBy: creator
              ? { _id: creator._id, name: creator.name, email: creator.email }
              : i.createdBy,
          };
        });
      return send(res, 200, { invites });
    },
  },
  {
    method: 'DELETE',
    path: /^\/api\/admins\/([^/]+)$/,
    requireAuth: true,
    async handle(req, res, [id]) {
      const session = getSession(req);
      if (session && id === session.adminId) {
        return send(res, 400, { error: 'Cannot delete your own admin account.' });
      }
      const index = db.admins.findIndex(a => a._id === id);
      if (index === -1) return send(res, 404, { error: 'Admin not found.' });
      db.admins.splice(index, 1);
      return send(res, 200, { message: 'Admin removed successfully.' });
    },
  },

  // ---- network (all require a session) ----
  {
    method: 'GET',
    path: '/api/network/nodes',
    requireAuth: true,
    async handle(req, res) {
      return send(res, 200, { nodes: db.nodes.slice().sort(byCreatedDesc) });
    },
  },
  {
    method: 'POST',
    path: '/api/network/nodes',
    requireAuth: true,
    async handle(req, res) {
      const { name, location, ip, type, status, uptime, load, notes } = await readBody(req);
      if (!name || !location || !ip) {
        return send(res, 400, { error: 'Name, location, and IP address are required.' });
      }
      if (db.nodes.some(n => n.ip === ip)) {
        return send(res, 400, { error: 'A node with this IP address already exists.' });
      }

      const node = {
        _id: nextId(),
        name,
        location,
        ip,
        type: VALID_TYPES.includes(type) ? type : 'access_point',
        status: VALID_STATUSES.includes(status) ? status : 'Pending',
        uptime: uptime || '99.9%',
        load: typeof load === 'number' ? Math.min(100, Math.max(0, load)) : 0,
        notes: notes || '',
        createdAt: stamp(),
        updatedAt: stamp(),
      };
      db.nodes.push(node);
      return send(res, 201, { message: 'Network node created.', node });
    },
  },
  {
    method: 'PATCH',
    path: /^\/api\/network\/nodes\/([^/]+)\/status$/,
    requireAuth: true,
    async handle(req, res, [id]) {
      const { status, load } = await readBody(req);

      // Same precedence as backend/routes/network.js: an unknown status is
      // dropped entirely, but Offline still zeroes the load.
      const update = {};
      if (VALID_STATUSES.includes(status)) {
        update.status = status;
        if (status === 'Offline') update.load = 0;
      }
      if (typeof load === 'number') update.load = Math.min(100, Math.max(0, load));

      const node = db.nodes.find(n => n._id === id);
      if (!node) return send(res, 404, { error: 'Node not found.' });

      Object.assign(node, update, { updatedAt: stamp() });
      return send(res, 200, { message: 'Node status updated.', node });
    },
  },
  {
    method: 'DELETE',
    path: /^\/api\/network\/nodes\/([^/]+)$/,
    requireAuth: true,
    async handle(req, res, [id]) {
      const index = db.nodes.findIndex(n => n._id === id);
      if (index === -1) return send(res, 404, { error: 'Node not found.' });
      db.nodes.splice(index, 1);
      return send(res, 200, { message: 'Node deleted successfully.' });
    },
  },
  {
    method: 'GET',
    path: '/api/network/stats',
    requireAuth: true,
    async handle(req, res) {
      const nodes = db.nodes;
      const sum = nodes.reduce((acc, n) => acc + (n.load || 0), 0);
      return send(res, 200, {
        totalNodes: nodes.length,
        activeNodes: nodes.filter(n => n.status === 'Online').length,
        offlineNodes: nodes.filter(n => n.status === 'Offline').length,
        pendingNodes: nodes.filter(n => n.status === 'Pending').length,
        networkLoad: nodes.length > 0 ? Math.round(sum / nodes.length) : 0,
      });
    },
  },

  // ---- meta ----
  {
    method: 'GET',
    path: '/api/health',
    async handle(req, res) {
      return send(res, 200, { status: 'ok', timestamp: new Date().toISOString(), mongo: 'stubbed' });
    },
  },
  {
    method: 'GET',
    path: '/',
    async handle(req, res) {
      return send(res, 200, { message: 'ReRoute API running (stub)', status: 'ok' });
    },
  },
  {
    method: 'POST',
    path: '/__reset',
    async handle(req, res) {
      idCounter = 0;
      tick = 0;
      seed();
      return send(res, 200, { message: 'Stub state reset to seed data.' });
    },
  },
];

function matchRoute(method, pathname) {
  for (const route of routes) {
    if (route.method !== method) continue;
    if (typeof route.path === 'string') {
      if (route.path === pathname) return { route, params: [] };
    } else {
      const m = route.path.exec(pathname);
      if (m) return { route, params: m.slice(1) };
    }
  }
  return null;
}

seed();

const server = createServer(async (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return send(res, 204, undefined);

  const { pathname } = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const hit = matchRoute(req.method, pathname);

  if (!hit) return send(res, 404, { error: 'Cannot ' + req.method + ' ' + pathname });
  if (hit.route.requireAuth && !getSession(req)) return send(res, 401, UNAUTHORIZED);

  try {
    await hit.route.handle(req, res, hit.params);
  } catch (err) {
    send(res, 500, { error: 'Internal server error.' });
  }
});

server.listen(PORT, HOST, () => {
  console.log('ReRoute STUB API on http://localhost:' + PORT + '/api');
  console.log('   seeded: 1 admin, 2 invite codes, ' + db.nodes.length + ' network nodes');
  console.log('   this is a fake - API-semantics tests are skipped in this mode');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

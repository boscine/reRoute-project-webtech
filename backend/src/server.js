const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8000;
const JWT_SECRET = process.env.JWT_SECRET || 'reroute-secret-key-development-12345';

app.use(cors());
app.use(express.json());

// -------------------------------------------------------------
// Middleware: Admin Authentication & Activity Logger
// -------------------------------------------------------------
async function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await prisma.adminUser.findUnique({ where: { id: payload.userId } });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User is inactive or not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

async function logActivity(adminUserId, action, targetType, targetId, details = null) {
  try {
    await prisma.activityLog.create({
      data: {
        adminUserId,
        action,
        targetType,
        targetId: targetId != null ? String(targetId) : null,
        details: details ? (typeof details === 'string' ? details : JSON.stringify(details)) : null,
      },
    });
  } catch (e) {
    console.error('Failed to write activity log:', e);
  }
}

// -------------------------------------------------------------
// PUBLIC STUDENT SIDE API
// -------------------------------------------------------------

// GET /api/buildings - list all buildings
app.get('/api/buildings', async (req, res) => {
  try {
    const buildings = await prisma.building.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(buildings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve buildings' });
  }
});

// GET /api/floors?building=idOrName
app.get('/api/floors', async (req, res) => {
  const { building } = req.query;
  try {
    let whereClause = {};
    if (building) {
      const bId = parseInt(building, 10);
      if (!isNaN(bId)) {
        whereClause.buildingId = bId;
      } else {
        whereClause.building = { name: String(building) };
      }
    }

    const floors = await prisma.floor.findMany({
      where: whereClause,
      include: {
        building: true,
        locations: true,
      },
      orderBy: { order: 'asc' },
    });

    res.json(floors);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve floors' });
  }
});

// GET /api/locations/:qrSlug - public resolution with ScanLog recording
app.get('/api/locations/:qrSlug', async (req, res) => {
  const { qrSlug } = req.params;
  const normalizedSlug = (qrSlug || '').trim().toLowerCase();

  try {
    const location = await prisma.location.findFirst({
      where: {
        qrSlug: { equals: normalizedSlug, mode: 'insensitive' },
      },
      include: {
        floor: {
          include: {
            building: true,
          },
        },
      },
    });

    // Record scan log
    await prisma.scanLog.create({
      data: {
        locationId: location ? location.id : null,
        qrSlugRaw: qrSlug,
        resolved: !!location,
      },
    });

    if (!location) {
      return res.status(404).json({
        found: false,
        message: `Location not found for QR code: ${qrSlug}`,
      });
    }

    return res.json({
      found: true,
      locationId: location.id,
      qrSlug: location.qrSlug,
      building: location.floor.building.name,
      buildingId: location.floor.building.id,
      floor: location.floor.label,
      floorId: location.floor.id,
      order: location.floor.order,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error while resolving location' });
  }
});

// -------------------------------------------------------------
// AUTHENTICATION (ADMIN)
// -------------------------------------------------------------

// POST /api/admin/login
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await prisma.adminUser.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials or inactive account' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    await logActivity(user.id, 'LOGIN', 'AdminUser', user.id, { email: user.email });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/admin/me
app.get('/api/admin/me', authenticateAdmin, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
  });
});

// -------------------------------------------------------------
// ADMIN DASHBOARD & REPORTS
// -------------------------------------------------------------

// GET /api/admin/dashboard - counts & recent scan activity
app.get('/api/admin/dashboard', authenticateAdmin, async (req, res) => {
  try {
    const [buildingsCount, floorsCount, locationsCount, totalScans, recentScans] = await Promise.all([
      prisma.building.count(),
      prisma.floor.count(),
      prisma.location.count(),
      prisma.scanLog.count(),
      prisma.scanLog.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          location: {
            include: {
              floor: {
                include: { building: true },
              },
            },
          },
        },
      }),
    ]);

    res.json({
      counts: {
        buildings: buildingsCount,
        floors: floorsCount,
        locations: locationsCount,
        totalScans,
      },
      recentScans,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// GET /api/admin/reports - analytics
app.get('/api/admin/reports', authenticateAdmin, async (req, res) => {
  try {
    // 1. Most scanned locations
    const topScans = await prisma.scanLog.groupBy({
      by: ['locationId'],
      where: { locationId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    });

    const populatedTopScans = await Promise.all(
      topScans.map(async (item) => {
        const loc = await prisma.location.findUnique({
          where: { id: item.locationId },
          include: { floor: { include: { building: true } } },
        });
        return {
          locationId: item.locationId,
          scanCount: item._count.id,
          qrSlug: loc?.qrSlug,
          building: loc?.floor.building.name,
          floor: loc?.floor.label,
        };
      })
    );

    // 2. Recent scans for timeline
    const scansLastDays = await prisma.scanLog.findMany({
      take: 200,
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, resolved: true },
    });

    res.json({
      topLocations: populatedTopScans,
      timelineData: scansLastDays,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// -------------------------------------------------------------
// CRUD 1: BUILDINGS
// -------------------------------------------------------------
app.get('/api/admin/buildings', authenticateAdmin, async (req, res) => {
  const buildings = await prisma.building.findMany({
    include: { _count: { select: { floors: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(buildings);
});

app.post('/api/admin/buildings', authenticateAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Building name is required' });

  try {
    const building = await prisma.building.create({ data: { name } });
    await logActivity(req.user.id, 'CREATE', 'Building', building.id, { name });
    res.status(201).json(building);
  } catch (err) {
    res.status(400).json({ error: 'Building already exists or invalid data' });
  }
});

app.put('/api/admin/buildings/:id', authenticateAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name } = req.body;

  try {
    const building = await prisma.building.update({
      where: { id },
      data: { name },
    });
    await logActivity(req.user.id, 'UPDATE', 'Building', id, { name });
    res.json(building);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update building' });
  }
});

app.delete('/api/admin/buildings/:id', authenticateAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await prisma.building.delete({ where: { id } });
    await logActivity(req.user.id, 'DELETE', 'Building', id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Cannot delete building' });
  }
});

// -------------------------------------------------------------
// CRUD 2: FLOORS
// -------------------------------------------------------------
app.get('/api/admin/floors', authenticateAdmin, async (req, res) => {
  const floors = await prisma.floor.findMany({
    include: {
      building: true,
      _count: { select: { locations: true } },
    },
    orderBy: [{ buildingId: 'asc' }, { order: 'asc' }],
  });
  res.json(floors);
});

app.post('/api/admin/floors', authenticateAdmin, async (req, res) => {
  const { buildingId, label, order } = req.body;
  try {
    const floor = await prisma.floor.create({
      data: {
        buildingId: parseInt(buildingId, 10),
        label,
        order: parseInt(order || 1, 10),
      },
    });
    await logActivity(req.user.id, 'CREATE', 'Floor', floor.id, { buildingId, label, order });
    res.status(201).json(floor);
  } catch (err) {
    res.status(400).json({ error: 'Floor creation failed' });
  }
});

app.put('/api/admin/floors/:id', authenticateAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { label, order, buildingId } = req.body;
  try {
    const floor = await prisma.floor.update({
      where: { id },
      data: {
        label,
        order: order !== undefined ? parseInt(order, 10) : undefined,
        buildingId: buildingId !== undefined ? parseInt(buildingId, 10) : undefined,
      },
    });
    await logActivity(req.user.id, 'UPDATE', 'Floor', id, { label, order, buildingId });
    res.json(floor);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update floor' });
  }
});

app.delete('/api/admin/floors/:id', authenticateAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await prisma.floor.delete({ where: { id } });
    await logActivity(req.user.id, 'DELETE', 'Floor', id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Cannot delete floor' });
  }
});

// -------------------------------------------------------------
// CRUD 3: LOCATIONS
// -------------------------------------------------------------
app.get('/api/admin/locations', authenticateAdmin, async (req, res) => {
  const locations = await prisma.location.findMany({
    include: {
      floor: {
        include: { building: true },
      },
      _count: { select: { scanLogs: true } },
    },
    orderBy: { id: 'desc' },
  });
  res.json(locations);
});

app.post('/api/admin/locations', authenticateAdmin, async (req, res) => {
  const { floorId, qrSlug } = req.body;
  try {
    const location = await prisma.location.create({
      data: {
        floorId: parseInt(floorId, 10),
        qrSlug: qrSlug.trim().toLowerCase(),
      },
    });
    await logActivity(req.user.id, 'CREATE', 'Location', location.id, { floorId, qrSlug });
    res.status(201).json(location);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create location. Slug may already exist.' });
  }
});

app.put('/api/admin/locations/:id', authenticateAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { floorId, qrSlug } = req.body;
  try {
    const location = await prisma.location.update({
      where: { id },
      data: {
        floorId: floorId ? parseInt(floorId, 10) : undefined,
        qrSlug: qrSlug ? qrSlug.trim().toLowerCase() : undefined,
      },
    });
    await logActivity(req.user.id, 'UPDATE', 'Location', id, { floorId, qrSlug });
    res.json(location);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update location' });
  }
});

app.delete('/api/admin/locations/:id', authenticateAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  try {
    await prisma.location.delete({ where: { id } });
    await logActivity(req.user.id, 'DELETE', 'Location', id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Cannot delete location' });
  }
});

// -------------------------------------------------------------
// CRUD 4: QR CODES (Image Generation & Reassignment)
// -------------------------------------------------------------
app.get('/api/admin/qr/image/:qrSlug', async (req, res) => {
  const { qrSlug } = req.params;
  const baseUrl = req.query.baseUrl || 'http://localhost:5173';
  const targetUrl = `${baseUrl}/?loc=${encodeURIComponent(qrSlug)}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(targetUrl, { width: 350, margin: 2 });
    res.json({ qrSlug, targetUrl, dataUrl: qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: 'Could not generate QR code' });
  }
});

// -------------------------------------------------------------
// CRUD 5: SCAN LOGS (Read-Only)
// -------------------------------------------------------------
app.get('/api/admin/scan-logs', authenticateAdmin, async (req, res) => {
  const page = parseInt(req.query.page || 1, 10);
  const limit = parseInt(req.query.limit || 50, 10);
  const skip = (page - 1) * limit;

  try {
    const [total, logs] = await Promise.all([
      prisma.scanLog.count(),
      prisma.scanLog.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          location: {
            include: {
              floor: {
                include: { building: true },
              },
            },
          },
        },
      }),
    ]);

    res.json({
      page,
      limit,
      total,
      data: logs,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scan logs' });
  }
});

// -------------------------------------------------------------
// USER MANAGEMENT (Admin Accounts Only)
// -------------------------------------------------------------
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
  const users = await prisma.adminUser.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { id: 'asc' },
  });
  res.json(users);
});

app.post('/api/admin/users', authenticateAdmin, async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await prisma.adminUser.create({
      data: {
        email: email.trim().toLowerCase(),
        passwordHash,
        role: role || 'ADMIN',
      },
    });

    await logActivity(req.user.id, 'CREATE', 'AdminUser', newUser.id, { email });
    res.status(201).json({ id: newUser.id, email: newUser.email, role: newUser.role });
  } catch (err) {
    res.status(400).json({ error: 'Failed to create user (email likely taken)' });
  }
});

app.patch('/api/admin/users/:id/toggle-active', authenticateAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (req.user.id === id) {
    return res.status(400).json({ error: 'Cannot deactivate your own account' });
  }

  try {
    const existing = await prisma.adminUser.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const updated = await prisma.adminUser.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    await logActivity(req.user.id, updated.isActive ? 'ACTIVATE' : 'DEACTIVATE', 'AdminUser', id);
    res.json({ id: updated.id, isActive: updated.isActive });
  } catch (err) {
    res.status(400).json({ error: 'Failed to update user status' });
  }
});

// -------------------------------------------------------------
// ACTIVITY LOGS (Audit Trail)
// -------------------------------------------------------------
app.get('/api/admin/activity-logs', authenticateAdmin, async (req, res) => {
  try {
    const logs = await prisma.activityLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        adminUser: {
          select: { email: true, role: true },
        },
      },
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

app.listen(PORT, () => {
  console.log(`ReRoute Backend API running on port ${PORT}`);
});

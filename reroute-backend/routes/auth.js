const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const InviteCode = require('../models/InviteCode');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');
    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!admin.isActive) {
      return res.status(403).json({ error: 'This admin account has been deactivated.' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Create session
    req.session.adminId = admin._id.toString();
    req.session.adminRole = admin.role;
    req.session.adminName = admin.name;
    req.session.adminEmail = admin.email;

    return res.json({
      message: 'Login successful.',
      admin: admin.toPublic()
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/auth/register (Requires valid invite code)
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, inviteCode } = req.body;

    if (!name || !email || !password || !inviteCode) {
      return res.status(400).json({ error: 'All fields including admin invite code are required.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Check invite code
    const invite = await InviteCode.findOne({
      code: inviteCode.trim().toUpperCase(),
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!invite) {
      return res.status(400).json({ error: 'Invalid or expired invite code.' });
    }

    // Check existing email
    const existing = await Admin.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'This email address is already registered.' });
    }

    // Create new Admin
    const admin = new Admin({
      name,
      email: email.toLowerCase(),
      password,
      role: 'admin'
    });
    await admin.save();

    // Consume invite code
    await invite.consume(admin._id);

    return res.status(201).json({
      message: 'Admin account successfully registered.',
      admin: admin.toPublic()
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: 'Failed to log out.' });
    }
    res.clearCookie('connect.sid');
    return res.json({ message: 'Logged out successfully.' });
  });
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  if (!req.session || !req.session.adminId) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }

  const admin = await Admin.findById(req.session.adminId);
  if (!admin) {
    return res.status(401).json({ error: 'Admin not found.' });
  }

  return res.json({ admin: admin.toPublic() });
});

module.exports = router;

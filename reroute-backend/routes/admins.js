const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Admin = require('../models/Admin');
const InviteCode = require('../models/InviteCode');
const { requireAuth, requireSuperAdmin } = require('../middleware/auth');

// All admin routes require session authentication
router.use(requireAuth);

// GET /api/admins — list all admins
router.router = router.get('/', async (req, res) => {
  try {
    const admins = await Admin.find().sort({ createdAt: -1 });
    return res.json({ admins: admins.map(a => a.toPublic()) });
  } catch (err) {
    console.error('List admins error:', err);
    return res.status(500).json({ error: 'Failed to fetch admins.' });
  }
});

// POST /api/admins/invite — generate single-use invite code
router.post('/invite', async (req, res) => {
  try {
    const randomBytes = crypto.randomBytes(4).toString('hex').toUpperCase();
    const code = `CR-${randomBytes.slice(0, 4)}-${randomBytes.slice(4, 8)}`;

    const invite = new InviteCode({
      code,
      createdBy: req.session.adminId,
    });
    await invite.save();

    return res.status(201).json({
      message: 'Invite code generated successfully.',
      invite: {
        code: invite.code,
        expiresAt: invite.expiresAt,
      }
    });
  } catch (err) {
    console.error('Invite generate error:', err);
    return res.status(500).json({ error: 'Failed to generate invite code.' });
  }
});

// GET /api/admins/invites — list active invite codes
router.get('/invites', async (req, res) => {
  try {
    const invites = await InviteCode.find().populate('createdBy', 'name email').sort({ createdAt: -1 });
    return res.json({ invites });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch invite codes.' });
  }
});

// DELETE /api/admins/:id — delete admin
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.session.adminId) {
      return res.status(400).json({ error: 'Cannot delete your own admin account.' });
    }

    const admin = await Admin.findByIdAndDelete(id);
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found.' });
    }

    return res.json({ message: 'Admin removed successfully.' });
  } catch (err) {
    console.error('Delete admin error:', err);
    return res.status(500).json({ error: 'Failed to remove admin.' });
  }
});

module.exports = router;

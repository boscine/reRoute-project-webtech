const express = require('express');
const router = express.Router();
const NetworkNode = require('../models/NetworkNode');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// GET /api/network/nodes — list all nodes
router.get('/nodes', async (req, res) => {
  try {
    const nodes = await NetworkNode.find().sort({ createdAt: -1 });
    return res.json({ nodes });
  } catch (err) {
    console.error('List nodes error:', err);
    return res.status(500).json({ error: 'Failed to fetch network nodes.' });
  }
});

// POST /api/network/nodes — add a new node
router.post('/nodes', async (req, res) => {
  try {
    const { name, location, ip, type, status, uptime, load, notes } = req.body;
    if (!name || !location || !ip) {
      return res.status(400).json({ error: 'Name, location, and IP address are required.' });
    }

    const existing = await NetworkNode.findOne({ ip });
    if (existing) {
      return res.status(400).json({ error: 'A node with this IP address already exists.' });
    }

    const node = new NetworkNode({
      name,
      location,
      ip,
      type: type || 'access_point',
      status: status || 'Pending',
      uptime: uptime || '99.9%',
      load: typeof load === 'number' ? load : 0,
      notes: notes || '',
    });
    await node.save();

    return res.status(201).json({ message: 'Network node created.', node });
  } catch (err) {
    console.error('Create node error:', err);
    return res.status(500).json({ error: 'Failed to create network node.' });
  }
});

// PATCH /api/network/nodes/:id/status — update status / load
router.patch('/nodes/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, load } = req.body;

    const updateFields = {};
    if (status && ['Online', 'Offline', 'Pending'].includes(status)) {
      updateFields.status = status;
      if (status === 'Offline') updateFields.load = 0;
    }
    if (typeof load === 'number') {
      updateFields.load = Math.min(100, Math.max(0, load));
    }

    const node = await NetworkNode.findByIdAndUpdate(id, updateFields, { new: true });
    if (!node) {
      return res.status(404).json({ error: 'Node not found.' });
    }

    return res.json({ message: 'Node status updated.', node });
  } catch (err) {
    console.error('Update node error:', err);
    return res.status(500).json({ error: 'Failed to update node.' });
  }
});

// DELETE /api/network/nodes/:id
router.delete('/nodes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const node = await NetworkNode.findByIdAndDelete(id);
    if (!node) {
      return res.status(404).json({ error: 'Node not found.' });
    }
    return res.json({ message: 'Node deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete node.' });
  }
});

// GET /api/network/stats — summary statistics
router.get('/stats', async (req, res) => {
  try {
    const nodes = await NetworkNode.find();
    const activeNodes = nodes.filter(n => n.status === 'Online').length;
    const offlineNodes = nodes.filter(n => n.status === 'Offline').length;
    const pendingNodes = nodes.filter(n => n.status === 'Pending').length;

    const avgLoad = nodes.length > 0
      ? Math.round(nodes.reduce((acc, curr) => acc + (curr.load || 0), 0) / nodes.length)
      : 0;

    return res.json({
      totalNodes: nodes.length,
      activeNodes,
      offlineNodes,
      pendingNodes,
      networkLoad: avgLoad
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

module.exports = router;

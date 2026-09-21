const mongoose = require('mongoose');

/**
 * NetworkNode Model
 * Represents a campus network device (AP, switch, gateway, etc.)
 */
const networkNodeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Node name is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
    },
    ip: {
      type: String,
      required: [true, 'IP address is required'],
      unique: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['access_point', 'switch', 'gateway', 'router'],
      default: 'access_point',
    },
    status: {
      type: String,
      enum: ['Online', 'Offline', 'Pending'],
      default: 'Pending',
    },
    uptime: {
      type: String,
      default: '—',
    },
    load: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('NetworkNode', networkNodeSchema);

const mongoose = require('mongoose');

/**
 * InviteCode Model
 * Single-use invite codes that allow new admin registration.
 */
const inviteCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      required: true,
    },
    usedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Mark code as used
inviteCodeSchema.methods.consume = async function (adminId) {
  this.isUsed  = true;
  this.usedBy  = adminId;
  this.usedAt  = new Date();
  return this.save();
};

module.exports = mongoose.model('InviteCode', inviteCodeSchema);

const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const InviteCode = require('./models/InviteCode');
const NetworkNode = require('./models/NetworkNode');

async function seedInitialData() {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount > 0) return; // Already seeded

    // Seed Super Admin
    const superAdmin = new Admin({
      name: 'Campus System Admin',
      email: 'admin@campus.edu',
      password: 'password123',
      role: 'super_admin',
    });
    await superAdmin.save();

    // Seed Invite Codes
    await InviteCode.insertMany([
      { code: 'CR-CAMPUS-2026', createdBy: superAdmin._id },
      { code: 'CR-NET-ADMIN', createdBy: superAdmin._id },
    ]);

    // Seed Network Nodes
    await NetworkNode.insertMany([
      { name: 'Core Gateway Router 01', location: 'Admin Bldg Server Room', ip: '192.168.100.1', type: 'gateway', status: 'Online', uptime: '99.98%', load: 42 },
      { name: 'Library Wi-Fi AP 01', location: 'Main Library 2F', ip: '192.168.100.15', type: 'access_point', status: 'Online', uptime: '99.40%', load: 78 },
      { name: 'Science Lab Switch A', location: 'Science Complex Rm 304', ip: '192.168.100.30', type: 'switch', status: 'Online', uptime: '98.90%', load: 35 },
      { name: 'Cafeteria Wi-Fi AP 02', location: 'Student Dining Hall', ip: '192.168.100.45', type: 'access_point', status: 'Offline', uptime: '84.10%', load: 0 },
      { name: 'Gymnasium Switch B', location: 'Sports Arena Control', ip: '192.168.100.60', type: 'switch', status: 'Pending', uptime: '—', load: 0 },
    ]);

    console.log('🌱 Seeded default data:');
    console.log('   - Admin: admin@campus.edu (password: password123)');
    console.log('   - Invite Code: CR-CAMPUS-2026');
  } catch (err) {
    console.warn('⚠️ Seeding note:', err.message);
  }
}

async function connectDB() {
  const configuredUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/reroute';

  try {
    await mongoose.connect(configuredUri, { serverSelectionTimeoutMS: 2000 });
    console.log('✅ Connected to MongoDB at', configuredUri);
    await seedInitialData();
    return configuredUri;
  } catch (err) {
    console.warn('⚠️ MongoDB is not currently connected:', err.message);
    console.log('💡 Quick Setup Options:');
    console.log('   1. Free Cloud DB: Create a free cluster on https://www.mongodb.com/cloud/atlas');
    console.log('      and paste your URI in backend/.env:');
    console.log('      MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/reroute');
    console.log('   2. Local DB: Install MongoDB Community Server on your PC and run it.');
    return null;
  }
}

module.exports = { connectDB, seedInitialData };

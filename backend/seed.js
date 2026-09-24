require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const InviteCode = require('./models/InviteCode');
const NetworkNode = require('./models/NetworkNode');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/reroute';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('🌱 Connected to MongoDB for seeding...');

    // Clear old data
    await Admin.deleteMany({});
    await InviteCode.deleteMany({});
    await NetworkNode.deleteMany({});

    // Seed Super Admin
    const superAdmin = new Admin({
      name: 'Campus System Admin',
      email: 'admin@campus.edu',
      password: 'password123',
      role: 'super_admin'
    });
    await superAdmin.save();
    console.log('✅ Seeded default admin: admin@campus.edu / password123');

    // Seed Invite Codes
    const invite1 = new InviteCode({
      code: 'CR-CAMPUS-2026',
      createdBy: superAdmin._id
    });
    const invite2 = new InviteCode({
      code: 'CR-NET-ADMIN',
      createdBy: superAdmin._id
    });
    await invite1.save();
    await invite2.save();
    console.log('✅ Seeded invite codes: CR-CAMPUS-2026, CR-NET-ADMIN');

    // Seed Network Nodes
    const sampleNodes = [
      { name: 'Core Gateway Router 01', location: 'Admin Bldg Server Room', ip: '192.168.1.1', type: 'gateway', status: 'Online', uptime: '99.98%', load: 42 },
      { name: 'Library Wi-Fi AP 01', location: 'Main Library 2F', ip: '192.168.1.15', type: 'access_point', status: 'Online', uptime: '99.40%', load: 78 },
      { name: 'Science Lab Switch A', location: 'Science Complex Rm 304', ip: '192.168.1.30', type: 'switch', status: 'Online', uptime: '98.90%', load: 35 },
      { name: 'Cafeteria Wi-Fi AP 02', location: 'Student Dining Hall', ip: '192.168.1.45', type: 'access_point', status: 'Offline', uptime: '84.10%', load: 0 },
      { name: 'Gymnasium Switch B', location: 'Sports Arena Control', ip: '192.168.1.60', type: 'switch', status: 'Pending', uptime: '—', load: 0 },
      { name: 'Dormitory North AP', location: 'Bldg C Hallway', ip: '192.168.1.75', type: 'access_point', status: 'Online', uptime: '99.12%', load: 64 }
    ];
    await NetworkNode.insertMany(sampleNodes);
    console.log(`✅ Seeded ${sampleNodes.length} campus network nodes.`);

    console.log('✨ Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
}

seed();

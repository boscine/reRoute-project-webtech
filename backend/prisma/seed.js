const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Seed default Super Admin
  const adminPasswordHash = await bcrypt.hash('admin12345', 10);
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@reroute.campus' },
    update: {},
    create: {
      email: 'admin@reroute.campus',
      passwordHash: adminPasswordHash,
      role: 'SUPERADMIN',
      isActive: true,
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // 2. Buildings & Floors & Locations
  const campusData = [
    {
      name: 'North Hall',
      floors: [
        { label: 'Ground Floor', order: 1, qrSlug: 'nh-gf' },
        { label: 'Floor 1', order: 2, qrSlug: 'nh-f1' },
        { label: 'Floor 2', order: 3, qrSlug: 'nh-f2' },
        { label: 'Floor 3', order: 4, qrSlug: 'nh-f3' },
      ],
    },
    {
      name: 'Science Centre',
      floors: [
        { label: 'Basement Lab', order: 1, qrSlug: 'sc-b1' },
        { label: 'Floor 1', order: 2, qrSlug: 'sc-f1' },
        { label: 'Floor 2', order: 3, qrSlug: 'sc-f2' },
      ],
    },
    {
      name: 'Student Hub',
      floors: [
        { label: 'Level 1 Dining & Commons', order: 1, qrSlug: 'sh-l1' },
        { label: 'Level 2 Student Affairs', order: 2, qrSlug: 'sh-l2' },
      ],
    },
    {
      name: 'Library Building',
      floors: [
        { label: 'Floor 1 Circulation', order: 1, qrSlug: 'lib-f1' },
        { label: 'Floor 2 Quiet Study', order: 2, qrSlug: 'lib-f2' },
        { label: 'Floor 3 Archives', order: 3, qrSlug: 'lib-f3' },
      ],
    },
  ];

  for (const b of campusData) {
    const building = await prisma.building.upsert({
      where: { name: b.name },
      update: {},
      create: { name: b.name },
    });

    for (const f of b.floors) {
      let floor = await prisma.floor.findFirst({
        where: { buildingId: building.id, label: f.label },
      });

      if (!floor) {
        floor = await prisma.floor.create({
          data: {
            buildingId: building.id,
            label: f.label,
            order: f.order,
          },
        });
      }

      await prisma.location.upsert({
        where: { qrSlug: f.qrSlug },
        update: { floorId: floor.id },
        create: {
          floorId: floor.id,
          qrSlug: f.qrSlug,
        },
      });
    }
  }

  // Initial Activity Log
  await prisma.activityLog.create({
    data: {
      adminUserId: admin.id,
      action: 'SEED',
      targetType: 'System',
      targetId: 'InitialSeed',
      details: JSON.stringify({ message: 'Seeded initial campus buildings, floors and locations' }),
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

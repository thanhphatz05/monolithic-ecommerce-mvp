require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  for (const rolename of ['normal', 'admin']) {
    await prisma.role.upsert({
      where: { rolename },
      update: {},
      create: { rolename },
    });
  }
  await prisma.memberShip.upsert({
    where: { mname: 'Basic' },
    update: { score: 10 },
    create: { mname: 'Basic', score: 10 },
  });
  console.log('Seed hoàn tất: Role(normal, admin), MemberShip(Basic, score=10).');
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });

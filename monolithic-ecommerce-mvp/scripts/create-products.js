require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const samples = [
    { pname: 'X', price: '100000.00', quantity: 20 },
    { pname: 'Y', price: '50000.00', quantity: 30 },
  ];
  for (const data of samples) {
    // Nếu đã có, KHÔNG reset quantity sau khi đặt hàng.
    const existed = await prisma.product.findUnique({ where: { pname: data.pname } });
    if (existed) {
      console.log(`Đã tồn tại ${data.pname}: pid=${existed.pid}, stock=${existed.quantity}; giữ nguyên.`);
      continue;
    }
    const created = await prisma.product.create({ data });
    console.log(`Đã tạo ${created.pname}: pid=${created.pid}, price=${created.price}, stock=${created.quantity}`);
  }
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });

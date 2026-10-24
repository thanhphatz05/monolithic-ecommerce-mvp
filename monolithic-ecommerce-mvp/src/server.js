require('dotenv').config();
const app = require('./app');
const prisma = require('./lib/prisma');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('REPLACE_THIS')) {
  console.error('Cần cấu hình JWT_SECRET có ít nhất 32 ký tự trong .env');
  process.exit(1);
}
const PORT = Number(process.env.PORT) || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`API đã khởi động: http://localhost:${PORT}`);
});

async function shutdown() {
  server.close(async () => { await prisma.$disconnect(); process.exit(0); });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

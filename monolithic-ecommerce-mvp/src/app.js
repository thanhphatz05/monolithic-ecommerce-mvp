const express = require('express');
const cors = require('cors');
const prisma = require('./lib/prisma');
const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', service: 'monolithic-ecommerce-api' });
  } catch (_err) {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/shipments', require('./routes/shipments'));
app.use((_req, res) => res.status(404).json({ message: 'Endpoint không tồn tại.' }));
app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'JSON không đúng định dạng.' });
  }
  console.error(err);
  return res.status(500).json({ message: 'Lỗi máy chủ.' });
});
module.exports = app;

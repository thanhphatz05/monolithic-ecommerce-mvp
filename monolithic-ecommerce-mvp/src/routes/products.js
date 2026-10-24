 const express = require('express');
const prisma = require('../lib/prisma');
const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { pid: 'asc' } });
    res.json({ products });
  } catch (err) { next(err); }
});

router.get('/:pid', async (req, res, next) => {
  try {
    const pid = Number(req.params.pid);
    if (!Number.isInteger(pid) || pid <= 0) return res.status(400).json({ message: 'pid không hợp lệ.' });
    const product = await prisma.product.findUnique({ where: { pid } });
    if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm.' });
    res.json({ product });
  } catch (err) { next(err); }
});

module.exports = router;

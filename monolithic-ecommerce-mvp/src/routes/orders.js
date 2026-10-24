const express = require('express');
const { Prisma } = require('@prisma/client');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);

const includeOrder = {
  details: { include: { product: { select: { pid: true, pname: true } } } },
  shipments: true,
};

router.post('/', async (req, res, next) => {
  try {
    const items = req.body?.items;
    if (!Array.isArray(items) || !items.length || items.length > 50 ||
        items.some(i => !i || !Number.isInteger(i.pid) || i.pid < 1 ||
                         !Number.isInteger(i.qty) || i.qty < 1 || i.qty > 100000)) {
      return res.status(400).json({ message: 'items phải là mảng [{pid,qty}], pid/qty nguyên dương.' });
    }
    const pids = items.map(i => i.pid);
    if (new Set(pids).size !== pids.length) {
      return res.status(400).json({ message: 'Không được trùng pid trong cùng đơn.' });
    }

    // Transaction: nếu X hoặc Y thiếu hàng, toàn bộ thay đổi được rollback.
    const order = await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({ where: { pid: { in: pids } } });
      if (products.length !== items.length) {
        const err = new Error('Có sản phẩm không tồn tại.'); err.status = 404; throw err;
      }
      const productById = new Map(products.map(p => [p.pid, p]));
      for (const item of items) {
        const result = await tx.product.updateMany({
          where: { pid: item.pid, quantity: { gte: item.qty } },
          data: { quantity: { decrement: item.qty } },
        });
        if (result.count !== 1) {
          const err = new Error(`Sản phẩm ${productById.get(item.pid).pname} không đủ tồn kho.`);
          err.status = 409; throw err;
        }
      }
      return tx.order.create({
        data: {
          uid: req.auth.uid,
          details: {
            create: items.map(i => ({
              pid: i.pid,
              qty: i.qty,
              unit_price: productById.get(i.pid).price,
            })),
          },
          shipments: { create: [{ status: 'PENDING' }] },
        },
        include: includeOrder,
      });
    });
    const total = order.details.reduce(
      (sum, d) => sum.plus(new Prisma.Decimal(d.unit_price).times(d.qty)),
      new Prisma.Decimal(0),
    );
    res.status(201).json({ message: 'Đặt hàng thành công', order, total: total.toFixed(2) });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { uid: req.auth.uid }, include: includeOrder, orderBy: { oid: 'desc' },
    });
    res.json({ orders });
  } catch (err) { next(err); }
});

router.get('/:oid', async (req, res, next) => {
  try {
    const oid = Number(req.params.oid);
    if (!Number.isInteger(oid) || oid <= 0) return res.status(400).json({ message: 'oid không hợp lệ.' });
    const order = await prisma.order.findFirst({
      where: { oid, uid: req.auth.uid }, include: includeOrder,
    });
    if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng.' });
    res.json({ order });
  } catch (err) { next(err); }
});

module.exports = router;

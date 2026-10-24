const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const shipments = await prisma.shipment.findMany({
      where: { order: { uid: req.auth.uid } }, orderBy: { shipid: 'desc' },
    });
    res.json({ shipments });
  } catch (err) { next(err); }
});

router.get('/:shipid', async (req, res, next) => {
  try {
    const shipid = Number(req.params.shipid);
    if (!Number.isInteger(shipid) || shipid <= 0) return res.status(400).json({ message: 'shipid không hợp lệ.' });
    const shipment = await prisma.shipment.findFirst({
      where: { shipid, order: { uid: req.auth.uid } },
    });
    if (!shipment) return res.status(404).json({ message: 'Không tìm thấy shipment.' });
    res.json({ shipment });
  } catch (err) { next(err); }
});

module.exports = router;

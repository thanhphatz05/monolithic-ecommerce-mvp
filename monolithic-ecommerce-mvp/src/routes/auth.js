const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

function toPublicUser(user) {
  return {
    uid: user.uid,
    username: user.username,
    fullname: user.fullname,
    role: user.role.rolename,
    membership: { name: user.membership.mname, score: user.membership.score },
  };
}

router.post('/register', async (req, res, next) => {
  try {
    const { username, fullname, password } = req.body || {};
    if (typeof username !== 'string' || username.trim().length < 3 || username.length > 50 ||
        typeof fullname !== 'string' || !fullname.trim() || fullname.length > 100 ||
        typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ message: 'username 3-50 ký tự, fullname bắt buộc, password tối thiểu 6 ký tự.' });
    }
    const role = await prisma.role.findUnique({ where: { rolename: 'normal' } });
    const membership = await prisma.memberShip.findUnique({ where: { mname: 'Basic' } });
    if (!role || !membership) return res.status(503).json({ message: 'Chưa seed Role/MemberShip.' });
    const user = await prisma.user.create({
      data: {
        username: username.trim(), fullname: fullname.trim(),
        password: await bcrypt.hash(password, 10), roleid: role.roleid, mid: membership.mid,
      },
      include: { role: true, membership: true },
    });
    res.status(201).json({ message: 'Đăng ký thành công', user: toPublicUser(user) });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ message: 'username đã tồn tại.' });
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Cần username và password.' });
    }
    const user = await prisma.user.findUnique({
      where: { username }, include: { role: true, membership: true },
    });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Sai tài khoản hoặc mật khẩu.' });
    }
    const token = jwt.sign(
      { uid: user.uid, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' },
    );
    return res.json({ message: 'Đăng nhập thành công', token, user: toPublicUser(user) });
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { uid: req.auth.uid }, include: { role: true, membership: true },
    });
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    res.json({ user: toPublicUser(user) });
  } catch (err) { next(err); }
});

module.exports = router;

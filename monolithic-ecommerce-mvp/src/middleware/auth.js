const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const parts = header.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    return res.status(401).json({ message: 'Thiếu token. Dùng Authorization: Bearer <token>.' });
  }
  try {
    const payload = jwt.verify(parts[1], process.env.JWT_SECRET);
    if (!Number.isInteger(payload.uid)) throw new Error('Token không hợp lệ');
    req.auth = { uid: payload.uid, username: payload.username };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn.' });
  }
}

module.exports = { requireAuth };

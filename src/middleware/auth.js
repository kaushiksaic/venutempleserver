const jwt = require('jsonwebtoken');

function readToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

function attachUser(payload) {
  const role = payload.role || 'admin';
  const user = { ...payload, role };
  return user;
}

function requireAuth(req, res, next) {
  const token = readToken(req);

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = attachUser(payload);
    if (req.user.role === 'admin') {
      req.admin = req.user;
    }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

function optionalAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return next();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = attachUser(payload);
    if (req.user.role === 'admin') {
      req.admin = req.user;
    }
  } catch (err) {
    // Ignore invalid optional tokens
  }
  next();
}

function signToken(payload, expiresIn = '30d') {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

module.exports = { requireAuth, requireAdmin, optionalAuth, signToken };

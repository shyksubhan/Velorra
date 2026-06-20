/* ============================================================
   VELORRA — JWT Authentication Middleware
   ============================================================ */
const jwt = require('jsonwebtoken');

/* ── Verify user JWT token ── */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }
    return res.status(401).json({ error: 'Invalid token. Please sign in again.' });
  }
}

/* ── Verify admin JWT token (has isAdmin: true claim) ── */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required.' });
    }
    next();
  });
}

/* ── Require specific role(s) ── */
function requireRole(...roles) {
  return (req, res, next) => {
    requireAdmin(req, res, () => {
      if (!roles.includes(req.user?.role)) {
        return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}.` });
      }
      next();
    });
  };
}

module.exports = { requireAuth, requireAdmin, requireRole };

/* ============================================================
   VELORRA — JWT Authentication Middleware
   ============================================================ */
const jwt = require('jsonwebtoken');
const store = require('../utils/store');
const { getDB } = require('../utils/firebase');

function isFirebaseAvailable() {
  try { return !!getDB(); } catch { return false; }
}

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

/* ── Verify admin JWT token (has isAdmin: true claim) ──
   IMPORTANT: a valid JWT signature alone is NOT enough — the token stays
   cryptographically valid for its full 30-day life even after the admin
   account behind it is deleted or deactivated. So on every admin-gated
   request we re-check the LIVE record: if the account no longer exists,
   or has been switched off, the session is killed immediately instead of
   silently working until the token expires. ── */
async function requireAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required.' });
    }

    /* The bootstrap super admin (super-admin-1) can never be deleted, so it
       always passes once the JWT itself is valid. */
    if (req.user.uid === 'super-admin-1') return next();

    try {
      let liveUser = store.findAdminUserById(req.user.uid);
      if (!liveUser && isFirebaseAvailable()) {
        const doc = await getDB().collection('adminUsers').doc(req.user.uid).get();
        if (doc.exists) liveUser = { ...doc.data(), id: doc.id };
      }
      if (!liveUser) {
        return res.status(401).json({ error: 'Your account no longer exists. Please sign in again.' });
      }
      if (liveUser.active === false) {
        return res.status(401).json({ error: 'Your account has been deactivated. Please contact your administrator.' });
      }
      next();
    } catch (err) {
      console.error('Admin session check failed:', err.message);
      return res.status(401).json({ error: 'Could not verify your session. Please sign in again.' });
    }
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

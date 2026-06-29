/* ============================================================
   VELORRA — Express Backend Server v2
   ============================================================ */
require('dotenv').config();

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const { initFirebase } = require('./utils/firebase');
const { initCloudinary } = require('./utils/cloudinary');
const store            = require('./utils/store');

/* ── Route modules ── */
const authRoutes       = require('./routes/auth');
const productRoutes    = require('./routes/products');
const orderRoutes      = require('./routes/orders');
const contactRoutes    = require('./routes/contact');
const newsletterRoutes = require('./routes/newsletter');
const adminRoutes      = require('./routes/admin');
const paymentsRoutes   = require('./routes/payments');
const uploadRoutes     = require('./routes/upload');
const reviewRoutes     = require('./routes/reviews');
const resellerRoutes   = require('./routes/resellers');

const app  = express();
const PORT = process.env.PORT || 3001;

/* ── CORS ── */
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'null',   /* file:// protocol */
  ],
  credentials: true,
}));

/* ── Body parsers (exclude Stripe webhook which needs raw body) ── */
app.use('/api/payments/stripe-webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/* ── Security headers ── */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

/* ── Simple API rate limiter (no extra package needed) ── */
const rateLimitStore = new Map();
app.use('/api/', (req, res, next) => {
  const ip  = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowMs = 60 * 1000;  /* 1 minute */
  const maxReqs  = 120;         /* per minute */
  const entry    = rateLimitStore.get(ip) || { count: 0, start: now };
  if (now - entry.start > windowMs) { entry.count = 0; entry.start = now; }
  entry.count++;
  rateLimitStore.set(ip, entry);
  if (entry.count > maxReqs) return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  next();
});

/* ── Firebase init ── */
initFirebase();

/* ── Cloudinary init (image/video uploads) ── */
initCloudinary();

/* ── Serve static frontend ── */
app.use(express.static(path.join(__dirname, '..')));

/* ── SSE Notifications endpoint (/api/notifications/stream) ── */
app.get('/api/notifications/stream', (req, res) => {
  /* Verify admin token from query param (SSE doesn't support custom headers) */
  const token = req.query.token;
  if (!token) return res.status(401).json({ error: 'Token required.' });

  try {
    const jwt     = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).end();
  } catch {
    return res.status(401).end();
  }

  /* Set SSE headers */
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  /* Send initial connected event */
  res.write(`data: ${JSON.stringify({ event: 'connected', time: new Date().toISOString() })}\n\n`);

  /* Subscribe to store events */
  const unsub = store.subscribe(payload => {
    try { res.write(`data: ${JSON.stringify(payload)}\n\n`); } catch (_) {}
  });

  /* Heartbeat every 25s to keep connection alive */
  const heartbeat = setInterval(() => {
    try { res.write(`: heartbeat\n\n`); } catch (_) { clearInterval(heartbeat); }
  }, 25000);

  /* Cleanup on disconnect */
  req.on('close', () => {
    unsub();
    clearInterval(heartbeat);
  });
});

/* ── API Routes ── */
app.use('/api/auth',       authRoutes);
app.use('/api/products',   productRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/contact',    contactRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/payments',   paymentsRoutes);
app.use('/api/upload',     uploadRoutes);
app.use('/api/reviews',    reviewRoutes);
app.use('/api/resellers',  resellerRoutes);

/* ── Abandoned Checkout Tracking ──
   Persisted to Firestore (collection: "abandoned") when Firebase is
   configured, so records survive server restarts/cold-starts (Render
   free tier resets in-memory data). Falls back to the in-memory store
   only in demo mode (no Firebase credentials configured). ── */
function isAbandonedFirebaseAvailable() {
  try { return !!getDB(); } catch { return false; }
}

/* POST /api/abandoned — save/update abandoned checkout (public, called from checkout.js) */
app.post('/api/abandoned', async (req, res) => {
  try {
    const { id, delivery, items, total } = req.body || {};
    if (!delivery || !items) return res.status(400).json({ error: 'delivery and items required' });

    if (isAbandonedFirebaseAvailable()) {
      const db = getDB();

      /* If id sent, update existing record (same checkout session re-saving) */
      if (id) {
        const ref = db.collection('abandoned').doc(id);
        const doc = await ref.get();
        if (doc.exists && doc.data().status !== 'converted') {
          await ref.update({ delivery, items, total: total || 0, updatedAt: new Date().toISOString() });
          return res.json({ id });
        }
      }

      /* Create new */
      const newId = 'ab-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      const record = {
        id:        newId,
        delivery,
        items:     items || [],
        total:     total || 0,
        status:    'abandoned',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.collection('abandoned').doc(newId).set(record);
      try { store.emit('new_abandoned', record); } catch {}
      return res.status(201).json({ id: newId });
    }

    /* ── Demo mode fallback — in-memory ── */
    if (id) {
      const existing = store.abandoned.find(a => a.id === id);
      if (existing && existing.status !== 'converted') {
        existing.delivery  = delivery;
        existing.items     = items;
        existing.total     = total || 0;
        existing.updatedAt = new Date().toISOString();
        return res.json({ id: existing.id });
      }
    }
    const record = {
      id:        'ab-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      delivery,
      items:     items || [],
      total:     total || 0,
      status:    'abandoned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.abandoned.unshift(record);
    if (store.abandoned.length > 500) store.abandoned = store.abandoned.slice(0, 500);
    try { store.emit('new_abandoned', record); } catch {}
    return res.status(201).json({ id: record.id });

  } catch (err) {
    console.error('Abandoned save error:', err);
    return res.status(500).json({ error: 'Failed to save abandoned checkout.' });
  }
});

/* PATCH /api/abandoned/:id/converted — mark as converted when order placed */
app.patch('/api/abandoned/:id/converted', async (req, res) => {
  try {
    if (isAbandonedFirebaseAvailable()) {
      const ref = getDB().collection('abandoned').doc(req.params.id);
      const doc = await ref.get();
      if (doc.exists) await ref.update({ status: 'converted', convertedAt: new Date().toISOString() });
    } else {
      const record = store.abandoned.find(a => a.id === req.params.id);
      if (record) { record.status = 'converted'; record.convertedAt = new Date().toISOString(); }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Abandoned converted-mark error:', err);
    res.json({ ok: true }); /* non-critical — never block the order success flow */
  }
});

/* GET /api/abandoned — admin only */
app.get('/api/abandoned', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  } catch { return res.status(401).json({ error: 'Invalid token' }); }

  try {
    if (isAbandonedFirebaseAvailable()) {
      const snap = await getDB().collection('abandoned').orderBy('createdAt', 'desc').limit(500).get();
      const abandoned = snap.docs.map(d => d.data());
      return res.json({ abandoned, total: abandoned.length });
    }
    return res.json({ abandoned: store.abandoned, total: store.abandoned.length });
  } catch (err) {
    console.error('Abandoned fetch error:', err);
    return res.json({ abandoned: store.abandoned, total: store.abandoned.length });
  }
});

/* DELETE /api/abandoned/:id — admin only */
app.delete('/api/abandoned/:id', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  } catch { return res.status(401).json({ error: 'Invalid token' }); }

  try {
    if (isAbandonedFirebaseAvailable()) {
      await getDB().collection('abandoned').doc(req.params.id).delete();
    } else {
      const idx = store.abandoned.findIndex(a => a.id === req.params.id);
      if (idx !== -1) store.abandoned.splice(idx, 1);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Abandoned delete error:', err);
    res.status(500).json({ error: 'Failed to delete.' });
  }
});
/* POST /api/visitors/ping  — frontend calls every 25s */
app.post('/api/visitors/ping', (req, res) => {
  const { sessionId, page } = req.body || {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });
  const count = store.visitorPing(sessionId, page);
  res.json({ count });
});

/* POST /api/visitors/leave  — frontend calls on beforeunload */
app.post('/api/visitors/leave', (req, res) => {
  const { sessionId } = req.body || {};
  if (sessionId) store.visitorLeave(sessionId);
  res.json({ ok: true });
});

/* GET /api/visitors  — admin: get current count + list */
app.get('/api/visitors', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.isAdmin) return res.status(403).json({ error: 'Forbidden' });
  } catch { return res.status(401).json({ error: 'Invalid token' }); }
  res.json({ count: store.visitorCount(), visitors: store.visitorList() });
});

/* ── Admin dashboard HTML ── serve the file directly to avoid router path issues */
app.get(['/admin', '/admin/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

/* ── Admin API endpoints ── */
app.use('/api/admin', adminRoutes);
app.use('/admin',     adminRoutes);  /* also serve sub-routes like /admin/stats (not used but safe) */

/* ── Health check ── */
app.get('/api/health', (req, res) => {
  const { getDB } = require('./utils/firebase');
  let firebaseStatus = 'demo';
  try { firebaseStatus = getDB() ? 'connected' : 'demo'; } catch { firebaseStatus = 'demo'; }
  res.json({
    status:    'ok',
    service:   'Velorra Jewelry Backend',
    version:   '2.0.0',
    firebase:  firebaseStatus,
    demoMode:  firebaseStatus === 'demo',
    timestamp: new Date().toISOString(),
    endpoints: {
      products:      '/api/products',
      orders:        '/api/orders',
      auth:          '/api/auth',
      contact:       '/api/contact',
      newsletter:    '/api/newsletter',
      payments:      '/api/payments',
      notifications: '/api/notifications/stream',
      reviews:       '/api/reviews',
      admin:         '/admin',
    },
  });
});

/* ── Catch-all ── */
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'API endpoint not found.' });
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

/* ── Global error handler ── */
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

/* ── Start ── */
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════╗');
  console.log('║       VELORRA BACKEND SERVER v2.0              ║');
  console.log('╠════════════════════════════════════════════════╣');
  console.log(`║  Website:  http://localhost:${PORT}               ║`);
  console.log(`║  Admin:    http://localhost:${PORT}/admin          ║`);
  console.log(`║  API:      http://localhost:${PORT}/api/health     ║`);
  console.log('╚════════════════════════════════════════════════╝\n');
});

module.exports = app;

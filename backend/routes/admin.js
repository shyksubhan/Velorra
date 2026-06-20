/* ============================================================
   VELORRA — Admin Routes (uses shared store for real stats)
   ============================================================ */
const express = require('express');
const path    = require('path');
const { getDB }       = require('../utils/firebase');
const { requireAdmin } = require('../middleware/auth');
const store = require('../utils/store');

const router = express.Router();

function isFirebaseAvailable() {
  try { return !!getDB(); } catch { return false; }
}

/* ── Serve admin dashboard HTML ── */
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
});

/* ── GET /api/admin/stats — REAL stats from shared store ── */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    if (isFirebaseAvailable()) {
      const db = getDB();
      const [ordersSnap, productsSnap, subscribersSnap, messagesSnap] = await Promise.all([
        db.collection('orders').get(),
        db.collection('products').get(),
        db.collection('subscribers').get(),
        db.collection('messages').where('read', '==', false).get(),
      ]);
      const orders = ordersSnap.docs.map(d => d.data());
      const statusCounts = {};
      orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
      const revenue = orders.filter(o => o.status !== 'Cancelled').reduce((s, o) => s + (o.total || 0), 0);
      return res.json({
        orders:         { total: ordersSnap.size, statuses: statusCounts },
        products:       { total: productsSnap.size },
        subscribers:    { total: subscribersSnap.size },
        unreadMessages: messagesSnap.size,
        totalRevenue:   Math.round(revenue),
        demoMode:       false,
      });
    }

    /* Demo mode — read from shared store (the SAME store all routes write to) */
    return res.json({ ...store.stats(), demoMode: true });

  } catch (err) {
    console.error('Stats error:', err);
    return res.json({ ...store.stats(), demoMode: true });
  }
});

/* ── GET /api/admin/recent-orders ── */
router.get('/recent-orders', requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    if (isFirebaseAvailable()) {
      const snap = await getDB().collection('orders').orderBy('createdAt', 'desc').limit(limit).get();
      return res.json({ orders: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    }
    return res.json({ orders: store.orders.slice(0, limit) });
  } catch (err) {
    return res.json({ orders: store.orders.slice(0, 10) });
  }
});

/* ── GET /api/admin/export/:type — Export data ── */
router.get('/export/:type', requireAdmin, async (req, res) => {
  try {
    const { type } = req.params;
    let data = [];
    let filename = '';

    if (type === 'orders') {
      data = isFirebaseAvailable()
        ? (await getDB().collection('orders').orderBy('createdAt', 'desc').get()).docs.map(d => d.data())
        : store.orders;
      filename = 'velorra-orders.json';
    } else if (type === 'subscribers') {
      data = isFirebaseAvailable()
        ? (await getDB().collection('subscribers').orderBy('subscribedAt', 'desc').get()).docs.map(d => d.data())
        : store.subscribers;
      filename = 'velorra-subscribers.json';
    } else if (type === 'messages') {
      data = isFirebaseAvailable()
        ? (await getDB().collection('messages').orderBy('createdAt', 'desc').get()).docs.map(d => d.data())
        : store.messages;
      filename = 'velorra-messages.json';
    } else {
      return res.status(400).json({ error: 'Invalid export type.' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    return res.json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Export failed.' });
  }
});

module.exports = router;

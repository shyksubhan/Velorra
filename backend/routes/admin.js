/* ============================================================
   VELORRA — Admin Routes (uses shared store for real stats)
   ============================================================ */
const express = require('express');
const path    = require('path');
const { getDB }       = require('../utils/firebase');
const { requireAdmin, requireRole } = require('../middleware/auth');
const store = require('../utils/store');

const router = express.Router();

function isFirebaseAvailable() {
  try { return !!getDB(); } catch { return false; }
}

/* ── Serve admin dashboard HTML ── */
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
});

/* ── Strip confidential earnings fields unless the caller is super_admin ──
   Mirrors the dashboard's client-side hiding, but enforced server-side so
   the figures never leave the server for admin/supervisor tokens. ── */
function maskRevenue(payload, role) {
  if (role === 'super_admin') return payload;
  const { totalRevenue, todayRevenue, monthRevenue, todayProfit, ...rest } = payload;
  return rest;
}

/* ── GET /api/admin/stats — REAL stats from shared store (super_admin + admin only) ── */
router.get('/stats', requireRole('super_admin', 'admin'), async (req, res) => {
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

      /* ── Date-filtered revenue for admin role hiding ── */
      const today = new Date(); today.setHours(0,0,0,0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const todayRevenue = orders
        .filter(o => o.status !== 'Cancelled' && new Date(o.createdAt) >= today)
        .reduce((s, o) => s + (o.total || 0), 0);
      const monthRevenue = orders
        .filter(o => o.status !== 'Cancelled' && new Date(o.createdAt) >= monthStart)
        .reduce((s, o) => s + (o.total || 0), 0);

      return res.json(maskRevenue({
        orders:         { total: ordersSnap.size, statuses: statusCounts },
        products:       { total: productsSnap.size },
        subscribers:    { total: subscribersSnap.size },
        unreadMessages: messagesSnap.size,
        totalRevenue:   Math.round(revenue),
        todayRevenue:   Math.round(todayRevenue),
        monthRevenue:   Math.round(monthRevenue),
        demoMode:       false,
      }, req.user.role));
    }

    /* Demo mode — read from shared store */
    const base = store.stats();
    const orders = store.orders;
    const today = new Date(); today.setHours(0,0,0,0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    base.todayRevenue = Math.round(orders
      .filter(o => o.status !== 'Cancelled' && new Date(o.createdAt) >= today)
      .reduce((s, o) => s + (o.total || 0), 0));
    base.monthRevenue = Math.round(orders
      .filter(o => o.status !== 'Cancelled' && new Date(o.createdAt) >= monthStart)
      .reduce((s, o) => s + (o.total || 0), 0));
    base.todayProfit = store.dailyStatement().totals.profit;
    return res.json(maskRevenue({ ...base, demoMode: true }, req.user.role));

  } catch (err) {
    console.error('Stats error:', err);
    return res.json(maskRevenue({ ...store.stats(), demoMode: true }, req.user.role));
  }
});

/* ── GET /api/admin/recent-orders (super_admin + admin only — supervisor uses /api/orders) ── */
router.get('/recent-orders', requireRole('super_admin', 'admin'), async (req, res) => {
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

/* ── GET /api/admin/export/:type — Export data (super_admin ONLY — admin & supervisor blocked) ── */
router.get('/export/:type', requireRole('super_admin'), async (req, res) => {
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

/* ── GET /api/admin/activity-logs — All staff activity (super_admin only) ── */
router.get('/activity-logs', requireRole('super_admin'), async (req, res) => {
  try {
    const { staffId, limit: lim } = req.query;
    let logs = store.activityLogs;
    if (staffId) logs = logs.filter(l => l.staffId === staffId);
    if (lim) logs = logs.slice(0, parseInt(lim));
    return res.json({ logs, total: logs.length });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch activity logs.' });
  }
});

/* ── GET /api/admin/staff-summary — Per-staff performance (super_admin only) ── */
router.get('/staff-summary', requireRole('super_admin'), (req, res) => {
  try {
    return res.json({ staff: store.staffSummary() });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch staff summary.' });
  }
});

/* ── GET /api/admin/profit-summary — Lifetime profit/earnings (super_admin ONLY) ──
   Lifetime view never gets reset/filtered by date — it's the full history of
   every sale ever recorded in this server's lifetime. ── */
router.get('/profit-summary', requireRole('super_admin'), async (req, res) => {
  try {
    return res.json(store.lifetimeEarnings());
  } catch (err) {
    console.error('Profit summary error:', err);
    return res.status(500).json({ error: 'Failed to compute profit summary.' });
  }
});

/* ── GET /api/admin/daily-statement?date=YYYY-MM-DD — One day's statement (super_admin ONLY) ──
   Defaults to today (server local date) when no date is given. ── */
router.get('/daily-statement', requireRole('super_admin'), async (req, res) => {
  try {
    return res.json(store.dailyStatement(req.query.date));
  } catch (err) {
    console.error('Daily statement error:', err);
    return res.status(500).json({ error: 'Failed to compute daily statement.' });
  }
});

/* ── GET /api/admin/daily-statements/history?days=30 — Last N days of statements (super_admin ONLY) ──
   Capped at 30 days — older days should be pulled from previously
   downloaded Excel files (lifetime totals remain in /profit-summary). ── */
router.get('/daily-statements/history', requireRole('super_admin'), async (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 30);
    return res.json({ statements: store.dailyStatementHistory(days) });
  } catch (err) {
    console.error('Statement history error:', err);
    return res.status(500).json({ error: 'Failed to compute statement history.' });
  }
});

module.exports = router;

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
      const [ordersSnap, socialSnap, productsSnap, subscribersSnap, messagesSnap, usersSnap] = await Promise.all([
        db.collection('orders').get(),
        db.collection('social_orders').get(),
        db.collection('products').get(),
        db.collection('subscribers').get(),
        db.collection('messages').where('read', '==', false).get(),
        db.collection('users').where('isAdmin', '==', false).get(),
      ]);
      const orders       = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const socialOrders = socialSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const products     = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      /* ── Website orders stats ── */
      const statusCounts = {};
      orders.forEach(o => { statusCounts[o.status] = (statusCounts[o.status] || 0) + 1; });
      const activeOrders = orders.filter(o => o.status !== 'Cancelled');
      const revenue      = activeOrders.reduce((s, o) => s + (o.total || 0), 0);

      /* ── Social orders stats ── */
      const socialStatusCounts = {};
      socialOrders.forEach(o => { socialStatusCounts[o.status] = (socialStatusCounts[o.status] || 0) + 1; });
      const activeSocialOrders = socialOrders.filter(o => o.status !== 'Cancelled');
      const socialRevenue      = activeSocialOrders.reduce((s, o) => s + (o.total || 0), 0);

      /* ── Date-filtered revenue ── */
      const today      = new Date(); today.setHours(0,0,0,0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      /* Website date-filtered */
      const todayOrders    = activeOrders.filter(o => new Date(o.createdAt) >= today);
      const todayRevenue   = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
      const monthRevenue   = activeOrders
        .filter(o => new Date(o.createdAt) >= monthStart)
        .reduce((s, o) => s + (o.total || 0), 0);

      /* Social date-filtered */
      const todaySocialOrders  = activeSocialOrders.filter(o => new Date(o.createdAt) >= today);
      const todaySocialRevenue = todaySocialOrders.reduce((s, o) => s + (o.total || 0), 0);
      const monthSocialRevenue = activeSocialOrders
        .filter(o => new Date(o.createdAt) >= monthStart)
        .reduce((s, o) => s + (o.total || 0), 0);

      /* ── Profit calculation ── */
      const productMap = {};
      products.forEach(p => {
        productMap[p.id]   = p.purchasePrice ?? 0;
        productMap[p.name] = p.purchasePrice ?? 0;
      });

      function calcOrderProfit(order) {
        return (order.items || []).reduce((sum, item) => {
          const pp   = item.purchasePrice ?? productMap[item.productId] ?? productMap[item.name] ?? 0;
          const rev  = (item.price || 0) * (item.qty || 1);
          const cost = (Number(pp) || 0) * (item.qty || 1);
          return sum + (rev - cost);
        }, 0);
      }

      /* Website profit */
      const todayProfit = Math.round(todayOrders.reduce((s, o) => s + calcOrderProfit(o), 0));
      const totalProfit = Math.round(activeOrders.reduce((s, o) => s + calcOrderProfit(o), 0));

      /* Social profit */
      const todaySocialProfit = Math.round(todaySocialOrders.reduce((s, o) => s + calcOrderProfit(o), 0));
      const totalSocialProfit = Math.round(activeSocialOrders.reduce((s, o) => s + calcOrderProfit(o), 0));
      /* ── Invoice Analytics ── */
      let totalInvoices = store.invoices.length;
      try {
        if (isFirebaseAvailable()) {
          const invSnap = await getDB().collection('invoices').get();
          totalInvoices = invSnap.size;
        }
      } catch (e) {}

      const codOrders = activeOrders.filter(o => o.paymentMethod === 'cod');
      const totalCodOrders = codOrders.length;
      const totalAdvanceReceived = codOrders.reduce((sum, o) => sum + (Number(o.advanceAmount) || 0), 0);
      const outstandingCodBalance = codOrders.reduce((sum, o) => sum + Math.max(0, (o.total || 0) - (Number(o.advanceAmount) || 0)), 0);

      return res.json(maskRevenue({
        orders:              { total: ordersSnap.size,  statuses: statusCounts },
        socialOrders:        { total: socialSnap.size,  statuses: socialStatusCounts },
        products:            { total: productsSnap.size },
        subscribers:         { total: subscribersSnap.size },
        unreadMessages:      messagesSnap.size,
        users:               { total: usersSnap.size },
        /* website-only */
        totalRevenue:        Math.round(revenue),
        todayRevenue:        Math.round(todayRevenue),
        monthRevenue:        Math.round(monthRevenue),
        todayProfit,
        totalProfit,
        /* social-only */
        socialRevenue:       Math.round(socialRevenue),
        todaySocialRevenue:  Math.round(todaySocialRevenue),
        monthSocialRevenue:  Math.round(monthSocialRevenue),
        todaySocialProfit,
        totalSocialProfit,
        /* combined */
        combinedRevenue:     Math.round(revenue + socialRevenue),
        todayCombinedRevenue:Math.round(todayRevenue + todaySocialRevenue),
        monthCombinedRevenue:Math.round(monthRevenue + monthSocialRevenue),
        todayCombinedProfit: todayProfit + todaySocialProfit,
        totalCombinedProfit: totalProfit + totalSocialProfit,
        /* invoice analytics */
        totalInvoices,
        totalCodOrders,
        totalAdvanceReceived,
        outstandingCodBalance,
        demoMode:            false,
      }, req.user.role));
    }

    /* Demo mode — read from shared store */
    const base    = store.stats();
    const orders  = store.orders;
    const sOrders = store.socialOrders;
    const today      = new Date(); today.setHours(0,0,0,0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    /* Website */
    base.todayRevenue = Math.round(orders
      .filter(o => o.status !== 'Cancelled' && new Date(o.createdAt) >= today)
      .reduce((s, o) => s + (o.total || 0), 0));
    base.monthRevenue = Math.round(orders
      .filter(o => o.status !== 'Cancelled' && new Date(o.createdAt) >= monthStart)
      .reduce((s, o) => s + (o.total || 0), 0));
    base.todayProfit = store.dailyStatement().totals.profit;

    /* Social */
    const todaySocialOrders = sOrders.filter(o => o.status !== 'Cancelled' && new Date(o.createdAt) >= today);
    base.todaySocialRevenue  = Math.round(todaySocialOrders.reduce((s, o) => s + (o.total || 0), 0));
    base.monthSocialRevenue  = Math.round(sOrders
      .filter(o => o.status !== 'Cancelled' && new Date(o.createdAt) >= monthStart)
      .reduce((s, o) => s + (o.total || 0), 0));
    base.todaySocialProfit   = Math.round(todaySocialOrders.reduce((s, o) =>
      s + (o.items || []).reduce((sum, i) => sum + ((i.price - (i.purchasePrice || 0)) * (i.qty || 1)), 0), 0));
    base.totalSocialProfit   = Math.round(sOrders.filter(o => o.status !== 'Cancelled').reduce((s, o) =>
      s + (o.items || []).reduce((sum, i) => sum + ((i.price - (i.purchasePrice || 0)) * (i.qty || 1)), 0), 0));

    /* Combined */
    base.todayCombinedRevenue = base.todayRevenue + base.todaySocialRevenue;
    base.monthCombinedRevenue = base.monthRevenue + base.monthSocialRevenue;
    base.combinedRevenue      = base.totalRevenue + base.socialRevenue;
    base.todayCombinedProfit  = base.todayProfit  + base.todaySocialProfit;
    base.totalCombinedProfit  = (store.lifetimeEarnings().totals.profit || 0) + base.totalSocialProfit;

    /* Invoice Analytics Demo */
    base.totalInvoices = store.invoices.length;
    const cods = orders.filter(o => o.status !== 'Cancelled' && o.paymentMethod === 'cod');
    base.totalCodOrders = cods.length;
    base.totalAdvanceReceived = cods.reduce((sum, o) => sum + (Number(o.advanceAmount) || 0), 0);
    base.outstandingCodBalance = cods.reduce((sum, o) => sum + Math.max(0, (o.total || 0) - (Number(o.advanceAmount) || 0)), 0);

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

/* ── GET /api/admin/monthly-statements — Month-by-month statements since launch (super_admin ONLY) ──
   Unlike the 30-day daily history, this always starts from siteLaunchDate,
   however long ago that was — it is never capped.
   Optional ?month=YYYY-MM to fetch a SINGLE month's detailed statement. ── */
router.get('/monthly-statements', requireRole('super_admin'), async (req, res) => {
  try {
    /* Single-month detailed view (for per-month export) */
    if (req.query.month) {
      const stmt = store.monthlyStatement(req.query.month);
      return res.json({ statements: [stmt], since: store.siteLaunchDate, single: true });
    }
    return res.json({ statements: store.monthlyStatementHistory(), since: store.siteLaunchDate });
  } catch (err) {
    console.error('Monthly statements error:', err);
    return res.status(500).json({ error: 'Failed to compute monthly statements.' });
  }
});

/* ── GET /api/admin/daily-statements?month=YYYY-MM — All days of a specific month ── */
router.get('/daily-statements', requireRole('super_admin'), async (req, res) => {
  try {
    const { month } = req.query;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ error: 'month param required (YYYY-MM).' });
    }
    const [y, m] = month.split('-').map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const statements = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      statements.push(store.dailyStatement(dateStr));
    }
    return res.json({ statements, month });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to compute monthly daily breakdown.' });
  }
});

/* ── GET /api/admin/site-launch-date — Read the configured launch date (super_admin ONLY) ── */
router.get('/site-launch-date', requireRole('super_admin'), (req, res) => {
  return res.json({ siteLaunchDate: store.siteLaunchDate });
});

/* ── PUT /api/admin/site-launch-date — Set/correct the launch date (super_admin ONLY) ──
   All daily/monthly/lifetime statements key off this date, so super_admin
   can set it once to match the real go-live day of the store. ── */
router.put('/site-launch-date', requireRole('super_admin'), async (req, res) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'A date is required.' });
    const saved = store.setSiteLaunchDate(date);
    /* Persist to Firestore so it survives server restarts */
    if (isFirebaseAvailable()) {
      try {
        await getDB().collection('settings').doc('global').set({ siteLaunchDate: saved }, { merge: true });
      } catch (e) { console.warn('Could not persist launch date to Firestore:', e.message); }
    }
    store.logActivity({
      staffId: req.user.uid, staffName: req.user.email || 'Unknown',
      staffRole: req.user.role, action: 'launch_date_updated', details: { date: saved }
    });
    return res.json({ message: 'Site launch date updated.', siteLaunchDate: saved });
  } catch (err) {
    return res.status(400).json({ error: err.message || 'Invalid date.' });
  }
});

module.exports = router;

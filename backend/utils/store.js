/* ============================================================
   VELORRA — Shared Singleton Data Store
   THE single source of truth for all in-memory data.
   All routes import this module — they all share the SAME arrays.
   ============================================================ */

/* ── Default product catalogue — empty (products are managed via Firebase/admin panel) ── */
const DEFAULT_PRODUCTS = [];

/* ── The singleton store ── */
const store = {
  /* Data arrays — shared across ALL routes */
  products:    JSON.parse(JSON.stringify(DEFAULT_PRODUCTS)),
  orders:      [],
  messages:    [],
  subscribers: [],
  resellers:   [],
  users:       [],
  activityLogs: [],

  /* Admin users with role support */
  adminUsers: [
    {
      id:          'super-admin-1',
      username:    null,     /* filled from process.env.ADMIN_USERNAME at runtime */
      email:       null,     /* filled from process.env.ADMIN_USERNAME at runtime */
      passwordHash: null,    /* filled from process.env.ADMIN_PASSWORD at runtime */
      role:        'super_admin',
      fname:       'Super',
      lname:       'Admin',
      active:      true,
      createdAt:   new Date().toISOString(),
      lastLogin:   null,
    },
  ],

  /* ── Site launch date ──
     Monthly/lifetime statements should only ever count from the day the
     store actually went live — not from whatever the server happened to
     boot on. Defaults to process.env.SITE_LAUNCH_DATE if set, otherwise
     falls back to "today" the first time the server starts (super_admin
     can correct this once from Settings → it's stored here so it persists
     for the life of the server process). */
  siteLaunchDate: (process.env.SITE_LAUNCH_DATE && !isNaN(new Date(process.env.SITE_LAUNCH_DATE)))
    ? new Date(process.env.SITE_LAUNCH_DATE).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10),

  setSiteLaunchDate(dateStr) {
    if (!dateStr || isNaN(new Date(dateStr))) throw new Error('Invalid date.');
    this.siteLaunchDate = new Date(dateStr).toISOString().slice(0, 10);
    return this.siteLaunchDate;
  },

  /* ── Live Visitor Tracking ── */
  _visitors: new Map(), /* sessionId → { page, lastSeen } */
  VISITOR_TIMEOUT_MS: 35000, /* 35s — frontend pings every 25s */

  visitorPing(sessionId, page) {
    this._visitors.set(sessionId, { page: page || '/', lastSeen: Date.now() });
    this._pruneVisitors();
    const count = this._visitors.size;
    this.emit('visitor_update', { count, visitors: this.visitorList() });
    return count;
  },

  visitorLeave(sessionId) {
    this._visitors.delete(sessionId);
    this._pruneVisitors();
    const count = this._visitors.size;
    this.emit('visitor_update', { count, visitors: this.visitorList() });
    return count;
  },

  _pruneVisitors() {
    const cutoff = Date.now() - this.VISITOR_TIMEOUT_MS;
    for (const [id, v] of this._visitors) {
      if (v.lastSeen < cutoff) this._visitors.delete(id);
    }
  },

  visitorCount() { this._pruneVisitors(); return this._visitors.size; },

  visitorList() {
    this._pruneVisitors();
    return Array.from(this._visitors.entries()).map(([id, v]) => ({
      id, page: v.page, secondsAgo: Math.round((Date.now() - v.lastSeen) / 1000),
    }));
  },

  /* ── SSE notification listeners ── */
  _notifListeners: new Set(),

  /* Push an event to all connected admin SSE clients */
  emit(event, data) {
    const payload = { event, data, time: new Date().toISOString() };
    this._notifListeners.forEach(fn => {
      try { fn(payload); } catch (_) {}
    });
  },

  /* Register an SSE listener — returns an unsubscribe function */
  subscribe(fn) {
    this._notifListeners.add(fn);
    return () => this._notifListeners.delete(fn);
  },

  /* ── Activity Logging ── */
  logActivity({ staffId, staffName, staffRole, action, details = {} }) {
    this.activityLogs.unshift({
      id:        'log-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      staffId,
      staffName,
      staffRole,
      action,
      details,
      timestamp: new Date().toISOString(),
    });
    /* Keep last 1000 logs in memory */
    if (this.activityLogs.length > 1000) this.activityLogs = this.activityLogs.slice(0, 1000);
  },

  /* ── Profit helpers (super_admin only — used by /admin/profit endpoints) ──
     Profit per sold item = (sale price the customer paid - purchasePrice that
     was snapshotted onto the order item at checkout time). Cancelled orders
     are excluded since nothing was actually sold. ── */
  _itemProfit(item) {
    /* purchasePrice is snapshotted onto the order item when the order is
       placed (see orders.js). Falls back to looking up the live product
       if an older order somehow lacks the snapshot. */
    let pp = item.purchasePrice;
    if (pp === undefined || pp === null) {
      const prod = this.findProduct(item.productId) || this.products.find(p => p.name === item.name);
      pp = prod?.purchasePrice ?? 0;
    }
    const qty = item.qty || 1;
    const revenue = (item.price || 0) * qty;
    const cost    = (Number(pp) || 0) * qty;
    return { revenue, cost, profit: revenue - cost };
  },

  /* Build a statement (list of sold line-items + totals) for orders matching a filter fn */
  _buildStatement(orderFilterFn) {
    const lines = [];
    let revenue = 0, cost = 0, profit = 0;
    this.orders.filter(o => o.status !== 'Cancelled').filter(orderFilterFn).forEach(o => {
      (o.items || []).forEach(item => {
        const { revenue: r, cost: c, profit: p } = this._itemProfit(item);
        revenue += r; cost += c; profit += p;
        lines.push({
          orderId:   o.id,
          date:      o.createdAt,
          product:   item.name,
          qty:       item.qty || 1,
          salePrice: item.price || 0,
          purchasePrice: item.purchasePrice ?? (this.findProduct(item.productId)?.purchasePrice ?? null),
          revenue:   r,
          cost:      c,
          profit:    p,
        });
      });
    });
    return { lines, totals: { revenue: Math.round(revenue), cost: Math.round(cost), profit: Math.round(profit), orders: this.orders.filter(o => o.status !== 'Cancelled').filter(orderFilterFn).length } };
  },

  /* Statement for one calendar day (dateStr = 'YYYY-MM-DD', server local time) */
  dailyStatement(dateStr) {
    const target = dateStr || new Date().toISOString().slice(0, 10);
    const stmt = this._buildStatement(o => (o.createdAt || '').slice(0, 10) === target);
    return { date: target, ...stmt };
  },

  /* History of daily statements for the last N days (default 30), newest first.
     Never goes earlier than the site's launch date. */
  dailyStatementHistory(days = 30) {
    const out = [];
    const launch = this.siteLaunchDate;
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      if (dateStr < launch) break;  /* stop once we go before launch — nothing to show */
      out.push(this.dailyStatement(dateStr));
    }
    return out;
  },

  /* Statement for one calendar month (monthStr = 'YYYY-MM') */
  monthlyStatement(monthStr) {
    const stmt = this._buildStatement(o => (o.createdAt || '').slice(0, 7) === monthStr);
    return { month: monthStr, ...stmt };
  },

  /* History of monthly statements, starting from the site's launch month up
     to the current month (newest first). This is the "monthly statement"
     view — unlike daily history it is NOT capped at 30 days; it always
     starts the count from siteLaunchDate, however long ago that was. */
  monthlyStatementHistory() {
    const launch = new Date(this.siteLaunchDate + 'T00:00:00');
    const launchMonth = new Date(launch.getFullYear(), launch.getMonth(), 1);
    const now = new Date();
    const out = [];
    let cursor = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cursor >= launchMonth) {
      const monthStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      out.push(this.monthlyStatement(monthStr));
      cursor.setMonth(cursor.getMonth() - 1);
    }
    return out;
  },

  /* Lifetime earnings — every sale ever recorded since launch, no other date filter */
  lifetimeEarnings() {
    const launch = this.siteLaunchDate;
    const stmt = this._buildStatement(o => (o.createdAt || '').slice(0, 10) >= launch);
    /* Also bucket by day so the UI can show a quick trend if desired */
    const byDay = {};
    this.orders.filter(o => o.status !== 'Cancelled' && (o.createdAt || '').slice(0, 10) >= launch).forEach(o => {
      const day = (o.createdAt || '').slice(0, 10);
      if (!byDay[day]) byDay[day] = { date: day, revenue: 0, cost: 0, profit: 0 };
      (o.items || []).forEach(item => {
        const { revenue, cost, profit } = this._itemProfit(item);
        byDay[day].revenue += revenue;
        byDay[day].cost    += cost;
        byDay[day].profit  += profit;
      });
    });
    const days = Object.values(byDay)
      .map(d => ({ ...d, revenue: Math.round(d.revenue), cost: Math.round(d.cost), profit: Math.round(d.profit) }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return { ...stmt, byDay: days, since: launch };
  },

  /* ── Helpers ── */
  findProduct(id)     { return this.products.find(p => p.id === id); },
  findOrder(id)       { return this.orders.find(o => o.id === id); },
  findUser(email)     { return this.users.find(u => u.email === email?.toLowerCase()); },
  findAdminUser(usernameOrEmail) {
    const v = (usernameOrEmail || '').toLowerCase();
    return this.adminUsers.find(u => u.username === v || u.email === v);
  },
  findAdminUserById(id) {
    return this.adminUsers.find(u => u.id === id);
  },

  /* ── Staff summary (per-staff activity counts) ── */
  staffSummary() {
    const summary = {};
    this.adminUsers.filter(u => u.role !== 'super_admin').forEach(u => {
      summary[u.id] = {
        id:           u.id,
        name:         `${u.fname} ${u.lname || ''}`.trim(),
        role:         u.role,
        username:     u.username,
        active:       u.active,
        lastLogin:    u.lastLogin,
        msgReplied:   this.activityLogs.filter(l => l.staffId === u.id && l.action === 'message_reply').length,
        ordersUpdated: this.activityLogs.filter(l => l.staffId === u.id && l.action === 'order_status_change').length,
        lastActive:   this.activityLogs.filter(l => l.staffId === u.id)[0]?.timestamp || null,
      };
    });
    return Object.values(summary);
  },

  /* Stats snapshot — used by /admin/stats */
  stats() {
    const orders = this.orders;
    const revenue = orders
      .filter(o => o.status !== 'Cancelled')
      .reduce((s, o) => s + (o.total || 0), 0);
    const statusCounts = {};
    orders.forEach(o => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });
    return {
      orders:         { total: orders.length, statuses: statusCounts },
      products:       { total: this.products.length },
      subscribers:    { total: this.subscribers.length },
      unreadMessages: this.messages.filter(m => !m.read).length,
      totalRevenue:   Math.round(revenue),
      users:          { total: this.users.length },
    };
  },
};

module.exports = store;

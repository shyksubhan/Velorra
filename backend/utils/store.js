/* ============================================================
   VELORRA — Shared Singleton Data Store
   THE single source of truth for all in-memory data.
   All routes import this module — they all share the SAME arrays.
   ============================================================ */

/* ── Default product catalogue (Hair Accessories) ── */
const DEFAULT_PRODUCTS = [
  {
    id: 'silk-scrunchie-set',
    name: 'Silk Scrunchie Set',
    category: 'scrunchies',
    subcategory: 'Scrunchies',
    price: 850,
    priceOld: 1200,
    purchasePrice: 420,
    emoji: '🎀',
    badge: 'Bestseller',
    description: 'Luxurious 100% mulberry silk scrunchies. Gentle on hair, reduces breakage and creases. Set of 5 elegant colours.',
    sizes: [],
    colors: ['Blush Pink', 'Champagne', 'Dusty Rose', 'Ivory', 'Mauve'],
    inStock: true,
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'crystal-butterfly-pin',
    name: 'Crystal Butterfly Pin',
    category: 'pins',
    subcategory: 'Pins',
    price: 650,
    priceOld: null,
    purchasePrice: 300,
    badge: 'New',
    description: 'Delicate butterfly hair pin encrusted with Austrian crystals. Adds sparkle to any hairstyle.',
    sizes: [],
    colors: ['Silver Crystal', 'Rose Gold Crystal', 'Pearl White'],
    inStock: true,
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'velvet-hair-band',
    name: 'Velvet Padded Hair Band',
    category: 'hair-bands',
    subcategory: 'Hair Bands',
    price: 1200,
    priceOld: null,
    purchasePrice: 550,
    badge: 'New',
    description: 'Wide padded velvet headband. Comfortable all-day wear, perfect for both casual and formal looks.',
    sizes: [],
    colors: ['Deep Mauve', 'Blush Pink', 'Black', 'Ivory'],
    inStock: true,
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pearl-catcher-clip',
    name: 'Pearl Catcher Clip',
    category: 'catchers',
    subcategory: 'Catchers',
    price: 950,
    priceOld: 1400,
    purchasePrice: 480,
    emoji: '🤍',
    badge: 'Sale',
    description: 'Elegant claw clip adorned with faux pearls. Strong grip, suitable for thick and thin hair types.',
    sizes: [],
    colors: ['Pearl White', 'Rose Gold', 'Black Pearl'],
    inStock: true,
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'satin-ponytail-set',
    name: 'Satin Ponytail Ties',
    category: 'ponies',
    subcategory: 'Ponies',
    price: 600,
    priceOld: null,
    purchasePrice: 280,
    badge: 'New',
    description: 'Soft satin-wrapped elastic hair ties that grip without pulling. Pack of 6 in complementary shades.',
    sizes: [],
    colors: ['Blush', 'Nude', 'Taupe', 'White', 'Rose', 'Dusty Lilac'],
    inStock: true,
    featured: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'floral-fancy-set',
    name: 'Floral Fancy Hair Set',
    category: 'fancy',
    subcategory: 'Fancy Hair Accessories',
    price: 1850,
    priceOld: 2400,
    purchasePrice: 900,
    emoji: '🌸',
    badge: 'Sale',
    description: 'A curated set of floral hair accessories — pins, clips and a ribbon. Perfect for special occasions.',
    sizes: [],
    colors: ['Pastel Mix', 'Pink Garden', 'Ivory Bloom'],
    inStock: true,
    featured: false,
    createdAt: new Date().toISOString(),
  },
];

/* ── The singleton store ── */
const store = {
  /* Data arrays — shared across ALL routes */
  products:    JSON.parse(JSON.stringify(DEFAULT_PRODUCTS)),
  orders:      [],
  messages:    [],
  subscribers: [],
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

  /* History of daily statements for the last N days (default 30), newest first */
  dailyStatementHistory(days = 30) {
    const out = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      out.push(this.dailyStatement(dateStr));
    }
    return out;
  },

  /* Lifetime earnings — every sale ever recorded, no date filter */
  lifetimeEarnings() {
    const stmt = this._buildStatement(() => true);
    /* Also bucket by day so the UI can show a quick trend if desired */
    const byDay = {};
    this.orders.filter(o => o.status !== 'Cancelled').forEach(o => {
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
    return { ...stmt, byDay: days, since: days.length ? days[days.length - 1].date : null };
  },

  /* ── Helpers ── */
  findProduct(id)     { return this.products.find(p => p.id === id); },
  findOrder(id)       { return this.orders.find(o => o.id === id); },
  findUser(email)     { return this.users.find(u => u.email === email?.toLowerCase()); },
  findAdminUser(usernameOrEmail) {
    const v = (usernameOrEmail || '').toLowerCase();
    return this.adminUsers.find(u => u.username === v || u.email === v);
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

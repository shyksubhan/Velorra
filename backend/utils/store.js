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
    emoji: '🦋',
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
    emoji: '💗',
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
    emoji: '🎗️',
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

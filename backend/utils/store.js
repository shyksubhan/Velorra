/* ============================================================
   VELORRA — Shared Singleton Data Store
   THE single source of truth for all in-memory data.
   All routes import this module — they all share the SAME arrays.
   This fixes the "isolated memory" bug where each route had its own
   separate array that no other route could see.
   ============================================================ */

/* ── Default product catalogue ── */
const DEFAULT_PRODUCTS = [
  {
    id: 'ivory-silk-maxi-gown',
    name: 'Ivory Silk Maxi Gown',
    category: 'women',
    subcategory: 'Dresses',
    price: 12500,
    priceOld: 16000,
    emoji: '👗',
    badge: 'New',
    description: 'An elegant ivory silk maxi gown crafted for the modern Pakistani woman. Features a flowing silhouette with delicate embroidery on the neckline.',
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Ivory', 'Blush'],
    inStock: true,
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'noir-rose-gold-timepiece',
    name: 'Noir Rose Gold Timepiece',
    category: 'watches',
    subcategory: 'Watches',
    price: 28000,
    priceOld: null,
    emoji: '⌚',
    badge: 'Bestseller',
    description: 'A statement unisex timepiece featuring a rose gold case with a midnight noir dial. Swiss movement.',
    sizes: [],
    colors: ['Rose Gold / Black'],
    inStock: true,
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'obsidian-slim-suit',
    name: 'Obsidian Slim Suit',
    category: 'men',
    subcategory: 'Formal',
    price: 35000,
    priceOld: null,
    emoji: '🤵',
    badge: null,
    description: 'A sharp obsidian slim-cut suit tailored for the modern Pakistani man. Includes jacket and trousers.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Obsidian Black'],
    inStock: true,
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'aurora-gold-necklace',
    name: 'Aurora Gold Necklace',
    category: 'jewellery',
    subcategory: 'Jewellery & Accessories',
    price: 8500,
    priceOld: null,
    emoji: '💎',
    badge: 'New',
    description: 'An ethereal layered gold necklace inspired by the northern lights. 18K gold-plated.',
    sizes: [],
    colors: ['Gold', 'Rose Gold'],
    inStock: true,
    featured: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'velvet-noir-lip-kit',
    name: 'Velvet Noir Lip Kit',
    category: 'cosmetics',
    subcategory: 'Cosmetics',
    price: 3500,
    priceOld: null,
    emoji: '💄',
    badge: 'New',
    description: 'A luxurious lip kit containing a matte liquid lipstick, precision lip liner, and glossy topcoat.',
    sizes: [],
    colors: ['Velvet Noir', 'Berry Rouge', 'Nude Blush'],
    inStock: true,
    featured: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'champagne-leather-tote',
    name: 'Champagne Leather Tote',
    category: 'women',
    subcategory: 'Bags',
    price: 18000,
    priceOld: 24000,
    emoji: '👜',
    badge: 'Sale',
    description: 'A sophisticated champagne-coloured tote crafted from genuine pebbled leather. Fits a 13" laptop.',
    sizes: [],
    colors: ['Champagne'],
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

  /* ── Helpers ── */
  findProduct(id)     { return this.products.find(p => p.id === id); },
  findOrder(id)       { return this.orders.find(o => o.id === id); },
  findUser(email)     { return this.users.find(u => u.email === email?.toLowerCase()); },
  findAdminUser(usernameOrEmail) {
    const v = (usernameOrEmail || '').toLowerCase();
    return this.adminUsers.find(u => u.username === v || u.email === v);
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

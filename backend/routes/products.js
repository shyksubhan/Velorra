/* ============================================================
   VELORRA — Products Routes (uses shared store)
   ============================================================ */
const express = require('express');
const { getDB }       = require('../utils/firebase');
const { requireAdmin } = require('../middleware/auth');
const store            = require('../utils/store');

const router = express.Router();

function isFirebaseAvailable() {
  try { return !!getDB(); } catch { return false; }
}

function makeSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function seedFirestore(db) {
  try {
    const snap = await db.collection('products').limit(1).get();
    if (!snap.empty) return;
    const batch = db.batch();
    store.products.forEach(p => batch.set(db.collection('products').doc(p.id), p));
    await batch.commit();
    console.log('✅ Seeded default products to Firestore.');
  } catch (e) { console.warn('Seed failed:', e.message); }
}

/* ── GET /api/products ── */
router.get('/', async (req, res) => {
  try {
    const { category, featured, search, limit: lim } = req.query;

    if (isFirebaseAvailable()) {
      const db = getDB();
      await seedFirestore(db);
      let query = db.collection('products');
      if (category && category !== 'all') query = query.where('category', '==', category);
      if (featured === 'true') query = query.where('featured', '==', true);
      const snap = await query.get();
      let products = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      if (search) { const q = search.toLowerCase(); products = products.filter(p => p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)); }
      if (lim) products = products.slice(0, parseInt(lim));
      return res.json({ products, total: products.length });
    }

    /* In-memory (shared store) */
    let products = [...store.products];
    if (category && category !== 'all') products = products.filter(p => p.category === category);
    if (featured === 'true') products = products.filter(p => p.featured);
    if (search) { const q = search.toLowerCase(); products = products.filter(p => p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)); }
    if (lim) products = products.slice(0, parseInt(lim));
    return res.json({ products, total: products.length });

  } catch (err) {
    console.error('Get products error:', err);
    return res.json({ products: store.products, total: store.products.length });
  }
});

/* ── GET /api/products/:id ── */
router.get('/:id', async (req, res) => {
  try {
    if (isFirebaseAvailable()) {
      const db = getDB();
      const doc = await db.collection('products').doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: 'Product not found.' });
      return res.json({ product: { ...doc.data(), id: doc.id } });
    }
    const product = store.findProduct(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    return res.json({ product });
  } catch (err) {
    console.error('Get product error:', err);
    return res.status(500).json({ error: 'Failed to fetch product.' });
  }
});

/* ── POST /api/products (admin) ── */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, category, subcategory, price, priceOld, emoji, badge, description, sizes, colors, inStock, featured, images, video } = req.body;
    if (!name || !category || !price) return res.status(400).json({ error: 'Name, category, and price are required.' });

    const slug = makeSlug(name);
    const productData = {
      id:          slug,
      name:        name.trim(),
      category,
      subcategory: subcategory || '',
      price:       Number(price),
      priceOld:    priceOld ? Number(priceOld) : null,
      emoji:       emoji || '🛍️',
      badge:       badge || null,
      description: description || '',
      sizes:       Array.isArray(sizes) ? sizes : (sizes || '').split(',').map(s => s.trim()).filter(Boolean),
      colors:      Array.isArray(colors) ? colors : (colors || '').split(',').map(s => s.trim()).filter(Boolean),
      images:      Array.isArray(images) ? images.filter(Boolean) : [],
      video:       video || null,
      inStock:     inStock !== false,
      featured:    featured === true || featured === 'true',
      createdAt:   new Date().toISOString(),
    };

    if (isFirebaseAvailable()) {
      await getDB().collection('products').doc(slug).set(productData);
    } else {
      const existingIdx = store.products.findIndex(p => p.id === slug);
      if (existingIdx >= 0) store.products[existingIdx] = productData;
      else store.products.push(productData);
      store.emit('product_added', { name: productData.name });
    }

    return res.status(201).json({ message: 'Product created successfully.', product: productData });
  } catch (err) {
    console.error('Create product error:', err);
    return res.status(500).json({ error: 'Failed to create product: ' + err.message });
  }
});

/* ── PUT /api/products/:id (admin) ── */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date().toISOString() };
    if (updates.price) updates.price = Number(updates.price);
    if (updates.priceOld) updates.priceOld = Number(updates.priceOld);

    if (isFirebaseAvailable()) {
      const db = getDB();
      const ref = db.collection('products').doc(req.params.id);
      const doc = await ref.get();
      if (!doc.exists) return res.status(404).json({ error: 'Product not found.' });
      await ref.update(updates);
      return res.json({ message: 'Product updated.', product: { ...doc.data(), ...updates } });
    }

    const idx = store.products.findIndex(p => p.id === req.params.id);
    if (idx < 0) return res.status(404).json({ error: 'Product not found.' });
    store.products[idx] = { ...store.products[idx], ...updates };
    return res.json({ message: 'Product updated.', product: store.products[idx] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update product.' });
  }
});

/* ── DELETE /api/products/:id (admin) ── */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (isFirebaseAvailable()) {
      const db = getDB();
      const ref = db.collection('products').doc(req.params.id);
      if (!(await ref.get()).exists) return res.status(404).json({ error: 'Product not found.' });
      await ref.delete();
    } else {
      const idx = store.products.findIndex(p => p.id === req.params.id);
      if (idx < 0) return res.status(404).json({ error: 'Product not found.' });
      store.products.splice(idx, 1);
    }
    return res.json({ message: 'Product deleted.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete product.' });
  }
});

module.exports = router;

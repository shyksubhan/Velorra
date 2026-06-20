/* ============================================================
   VELORRA — Orders Routes (uses shared store)
   ============================================================ */
const express   = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDB }       = require('../utils/firebase');
const { requireAdmin } = require('../middleware/auth');
const store            = require('../utils/store');
const { sendOrderConfirmation, sendNewOrderNotification } = require('../utils/email');

const router = express.Router();
const STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

function isFirebaseAvailable() {
  try { return !!getDB(); } catch { return false; }
}

/* ── POST /api/orders — Place order ── */
router.post('/', async (req, res) => {
  try {
    const { items, delivery, paymentMethod, deliveryMethod } = req.body;

    if (!items?.length || !delivery?.fname || !delivery?.email) {
      return res.status(400).json({ error: 'Order data is incomplete.' });
    }

    const subtotal    = items.reduce((s, i) => s + (i.price * i.qty), 0);
    const deliveryFee = deliveryMethod === 'express' ? 250 : subtotal < 5000 ? 200 : 0;
    const total       = subtotal + deliveryFee;
    const orderRef    = 'VLR-' + uuidv4().replace(/-/g, '').toUpperCase().slice(0, 8);

    const order = {
      id: orderRef,
      items,
      delivery,
      paymentMethod:  paymentMethod || 'cod',
      deliveryMethod: deliveryMethod || 'standard',
      subtotal,
      deliveryFee,
      total,
      status:    'Pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (isFirebaseAvailable()) {
      await getDB().collection('orders').doc(orderRef).set(order);
    } else {
      store.orders.unshift(order);
    }

    /* Emit SSE notification to admin */
    store.emit('new_order', {
      id: orderRef,
      customer: `${delivery.fname} ${delivery.lname}`,
      total,
      paymentMethod: order.paymentMethod,
    });

    /* Send emails (non-blocking) */
    sendOrderConfirmation({ to: delivery.email, orderRef, items, delivery, total, paymentMethod: order.paymentMethod })
      .catch(e => console.error('Customer email failed:', e.message));
    sendNewOrderNotification({ orderRef, items, delivery, total, paymentMethod: order.paymentMethod })
      .catch(e => console.error('Owner email failed:', e.message));

    return res.status(201).json({ message: 'Order placed successfully! 🎉', orderRef, order });
  } catch (err) {
    console.error('Place order error:', err);
    return res.status(500).json({ error: 'Failed to place order. Please try again.' });
  }
});

/* ── GET /api/orders (admin) ── */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { status, limit: lim } = req.query;
    if (isFirebaseAvailable()) {
      const db = getDB();
      let q = db.collection('orders').orderBy('createdAt', 'desc');
      if (status) q = q.where('status', '==', status);
      if (lim) q = q.limit(parseInt(lim));
      const snap = await q.get();
      const orders = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      return res.json({ orders, total: orders.length });
    }
    let orders = [...store.orders];
    if (status) orders = orders.filter(o => o.status === status);
    if (lim) orders = orders.slice(0, parseInt(lim));
    return res.json({ orders, total: orders.length });
  } catch (err) {
    return res.json({ orders: store.orders, total: store.orders.length });
  }
});

/* ── GET /api/orders/user/:email — Orders by customer ── */
router.get('/user/:email', async (req, res) => {
  try {
    const email = req.params.email.toLowerCase();
    if (isFirebaseAvailable()) {
      const snap = await getDB().collection('orders')
        .where('delivery.email', '==', email)
        .orderBy('createdAt', 'desc').get();
      return res.json({ orders: snap.docs.map(d => ({ ...d.data(), id: d.id })) });
    }
    const orders = store.orders.filter(o => o.delivery?.email?.toLowerCase() === email);
    return res.json({ orders, total: orders.length });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch orders.' });
  }
});

/* ── GET /api/orders/track/:ref — Public order tracking ── */
router.get('/track/:ref', async (req, res) => {
  try {
    const ref = req.params.ref.toUpperCase();
    if (isFirebaseAvailable()) {
      const doc = await getDB().collection('orders').doc(ref).get();
      if (!doc.exists) return res.status(404).json({ error: 'Order not found.' });
      const o = doc.data();
      return res.json({ order: { id: doc.id, status: o.status, createdAt: o.createdAt, updatedAt: o.updatedAt, items: o.items, total: o.total, deliveryMethod: o.deliveryMethod } });
    }
    const order = store.findOrder(ref);
    if (!order) return res.status(404).json({ error: 'Order not found. Check your order reference.' });
    return res.json({ order: { id: order.id, status: order.status, createdAt: order.createdAt, updatedAt: order.updatedAt, items: order.items, total: order.total, deliveryMethod: order.deliveryMethod } });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to track order.' });
  }
});

/* ── GET /api/orders/:id — Single order ── */
router.get('/:id', async (req, res) => {
  try {
    if (isFirebaseAvailable()) {
      const doc = await getDB().collection('orders').doc(req.params.id).get();
      if (!doc.exists) return res.status(404).json({ error: 'Order not found.' });
      return res.json({ order: { ...doc.data(), id: doc.id } });
    }
    const order = store.findOrder(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    return res.json({ order });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch order.' });
  }
});

/* ── PATCH /api/orders/:id/status (admin) ── */
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!STATUSES.includes(status)) return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(', ')}` });

    if (isFirebaseAvailable()) {
      const db = getDB();
      const ref = db.collection('orders').doc(req.params.id);
      if (!(await ref.get()).exists) return res.status(404).json({ error: 'Order not found.' });
      await ref.update({ status, updatedAt: new Date().toISOString() });
    } else {
      const idx = store.orders.findIndex(o => o.id === req.params.id);
      if (idx < 0) return res.status(404).json({ error: 'Order not found.' });
      store.orders[idx].status    = status;
      store.orders[idx].updatedAt = new Date().toISOString();
    }

    /* ── Log activity for non-super_admin staff ── */
    if (req.user?.role !== 'super_admin') {
      store.logActivity({
        staffId:   req.user.uid,
        staffName: req.user.email || 'Unknown',
        staffRole: req.user.role,
        action:    'order_status_change',
        details:   { orderId: req.params.id, newStatus: status },
      });
    }

    store.emit('order_status_changed', { id: req.params.id, status });
    return res.json({ message: `Order updated to "${status}".`, status });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update order.' });
  }
});

module.exports = router;

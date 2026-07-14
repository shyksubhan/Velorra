/* ============================================================
   VELORRA — Social Media Orders Routes
   Manually created orders from Facebook, Instagram, WhatsApp,
   TikTok or any other external social media source.
   ============================================================ */
const express          = require('express');
const { v4: uuidv4 }   = require('uuid');
const { getDB }        = require('../utils/firebase');
const { requireAdmin } = require('../middleware/auth');
const store            = require('../utils/store');

const router  = express.Router();
const STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
const SOURCES  = ['facebook', 'instagram', 'whatsapp', 'tiktok', 'other'];

function isFirebaseAvailable() {
  try { return !!getDB(); } catch { return false; }
}

/* ── POST /api/social-orders — Create manual social media order (admin only) ── */
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      customerName,
      phone,
      city,
      source,
      items,
      paymentMethod,
      status,
      notes,
      couponCode,
      advanceAmount,
      customDiscount,
    } = req.body;

    /* ── Validation ── */
    if (!customerName?.trim()) return res.status(400).json({ error: 'Customer name is required.' });
    if (!items?.length)        return res.status(400).json({ error: 'At least one item is required.' });
    if (!source || !SOURCES.includes(source)) return res.status(400).json({ error: `Source must be one of: ${SOURCES.join(', ')}` });

    /* ── Enrich items and calculate totals ── */
    const enrichedItems = items.map(i => ({
      productId:     String(i.productId || '').trim(),
      name:          String(i.name || '').trim(),
      qty:           Number(i.qty)   || 1,
      price:         Number(i.price) || 0,
      purchasePrice: Number(i.purchasePrice) || 0,
    }));

    const subtotal    = enrichedItems.reduce((s, i) => s + (i.price * i.qty), 0);
    const payMethod   = paymentMethod || 'cod';

    /* Same delivery fee rules as website orders:
       - bank_deposit → always FREE
       - COD          → PKR 200, waived once subtotal ≥ PKR 5,000 */
    const deliveryFee = payMethod === 'bank_deposit'
      ? 0
      : (subtotal >= 5000 ? 0 : 200);

    /* ── Coupon (optional) — same rule set as website checkout ── */
    let discount   = 0;
    let couponMeta = null;
    if (couponCode) {
      let couponDoc;
      if (isFirebaseAvailable()) {
        const cleanCode = String(couponCode).trim().toUpperCase();
        const snap = await getDB().collection('coupons').where('code', '==', cleanCode).limit(1).get();
        couponDoc = snap.empty ? null : { ...snap.docs[0].data(), id: snap.docs[0].id };
      } else {
        couponDoc = store.findCoupon(couponCode);
      }
      const check = store.checkCoupon(couponDoc, subtotal);
      if (!check.ok) return res.status(400).json({ error: check.error });
      discount   = check.discount;
      couponMeta = { code: check.coupon.code, type: check.coupon.type, value: check.coupon.value, discount };
    }

    const total    = Math.max(0, subtotal - discount) + deliveryFee;

    /* Custom Discount (manual override by admin) */
    let customDiscountMeta = null;
    if (customDiscount && Number(customDiscount.value) > 0) {
      const cdVal = Number(customDiscount.value);
      const cdType = customDiscount.type === 'percent' ? 'percent' : 'fixed';
      const cdAmt = cdType === 'percent'
        ? Math.round(subtotal * (cdVal / 100))
        : cdVal;
      const cdFinal = Math.min(cdAmt, Math.max(0, subtotal - discount));
      customDiscountMeta = { value: cdVal, type: cdType, amount: cdFinal };
    }
    const finalTotal = Math.max(0, (subtotal - discount - (customDiscountMeta?.amount || 0)) + deliveryFee);
    const orderRef = 'SOC-' + uuidv4().replace(/-/g, '').toUpperCase().slice(0, 8);

      id:            orderRef,
      orderType:     'social',
      source,
      customerName:  customerName.trim(),
      phone:         phone?.trim() || '',
      city:          city?.trim()  || '',
      notes:         notes?.trim() || '',
      items:         enrichedItems,
      subtotal,
      discount,
      coupon:        couponMeta,
      customDiscount: customDiscountMeta,
      deliveryFee,
      total:         finalTotal,
      advanceAmount: Number(advanceAmount) || 0,
      paymentMethod: payMethod,
      status:        STATUSES.includes(status) ? status : 'Pending',
      createdAt:     new Date().toISOString(),
      updatedAt:     new Date().toISOString(),
    };

    if (isFirebaseAvailable()) {
      try { await getDB().collection('social_orders').doc(orderRef).set(order); }
      catch(e) { console.error('Failed to save social order to Firebase:', e); }
    }
    store.socialOrders.unshift(order);

    /* Record coupon usage only after the order is safely saved */
    if (couponMeta) {
      await store.recordCouponUse(couponMeta.code, isFirebaseAvailable, getDB).catch(e => console.error('recordCouponUse failed:', e.message));
    }

    store.logActivity({
      staffId:   req.user.id,
      staffName: req.user.fname + (req.user.lname ? ' ' + req.user.lname : ''),
      action:    'Added Social Order',
      details:   `${orderRef} for ${customerName.trim()} via ${source}`,
      role:      req.user.role
    });

    /* Emit SSE notification to admin */
    store.emit('new_social_order', {
      id:     orderRef,
      customer: customerName.trim(),
      source,
      total,
      paymentMethod: payMethod,
    });

    return res.status(201).json({ message: 'Social media order created successfully! ✓', orderRef, order });
  } catch (err) {
    console.error('Create social order error:', err);
    return res.status(500).json({ error: 'Failed to create social media order.' });
  }
});

/* ── GET /api/social-orders — List all social media orders (admin only) ── */
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { status, source, limit: lim } = req.query;

    if (isFirebaseAvailable()) {
      const db = getDB();
      let q = db.collection('social_orders').orderBy('createdAt', 'desc');
      if (status) q = q.where('status', '==', status);
      if (source) q = q.where('source', '==', source);
      if (lim)    q = q.limit(parseInt(lim));
      const snap   = await q.get();
      const orders = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      return res.json({ orders, total: orders.length });
    }

    let orders = [...store.socialOrders];
    if (status) orders = orders.filter(o => o.status === status);
    if (source) orders = orders.filter(o => o.source === source);
    if (lim)    orders = orders.slice(0, parseInt(lim));
    return res.json({ orders, total: orders.length });

  } catch (err) {
    console.error('Get social orders error:', err);
    return res.json({ orders: store.socialOrders, total: store.socialOrders.length });
  }
});

/* ── PUT /api/social-orders/:id — Update/Edit social media order (admin only) ── */
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const orderId = req.params.id;
    let existingOrder = null;
    let dbRef = null;

    if (isFirebaseAvailable()) {
      dbRef = getDB().collection('social_orders').doc(orderId);
      const doc = await dbRef.get();
      if (!doc.exists) return res.status(404).json({ error: 'Order not found.' });
      existingOrder = doc.data();
    } else {
      existingOrder = store.socialOrders.find(o => o.id === orderId);
      if (!existingOrder) return res.status(404).json({ error: 'Order not found.' });
    }

    const {
      customerName, phone, city, source, items, paymentMethod, status, notes, couponCode, advanceAmount, customDiscount,
    } = req.body;

    if (!customerName?.trim()) return res.status(400).json({ error: 'Customer name is required.' });
    if (!items?.length)        return res.status(400).json({ error: 'At least one item is required.' });
    if (!source || !SOURCES.includes(source)) return res.status(400).json({ error: `Source must be one of: ${SOURCES.join(', ')}` });

    const enrichedItems = items.map(i => ({
      productId:     String(i.productId || '').trim(),
      name:          String(i.name || '').trim(),
      qty:           Number(i.qty)   || 1,
      price:         Number(i.price) || 0,
      purchasePrice: Number(i.purchasePrice) || 0,
    }));

    const subtotal  = enrichedItems.reduce((s, i) => s + (i.price * i.qty), 0);
    const payMethod = paymentMethod || 'cod';
    const deliveryFee = payMethod === 'bank_deposit' ? 0 : (subtotal >= 5000 ? 0 : 200);

    let discount = 0;
    let couponMeta = null;
    if (couponCode) {
      let couponDoc;
      if (isFirebaseAvailable()) {
        const cleanCode = String(couponCode).trim().toUpperCase();
        const snap = await getDB().collection('coupons').where('code', '==', cleanCode).limit(1).get();
        couponDoc = snap.empty ? null : { ...snap.docs[0].data(), id: snap.docs[0].id };
      } else {
        couponDoc = store.findCoupon(couponCode);
      }
      const check = store.checkCoupon(couponDoc, subtotal);
      if (!check.ok) return res.status(400).json({ error: check.error });
      discount   = check.discount;
      couponMeta = { code: check.coupon.code, type: check.coupon.type, value: check.coupon.value, discount };
    }

    const total = Math.max(0, subtotal - discount) + deliveryFee;

    /* Custom Discount (manual override by admin) */
    let customDiscountMeta = null;
    if (customDiscount && Number(customDiscount.value) > 0) {
      const cdVal = Number(customDiscount.value);
      const cdType = customDiscount.type === 'percent' ? 'percent' : 'fixed';
      const cdAmt = cdType === 'percent'
        ? Math.round(subtotal * (cdVal / 100))
        : cdVal;
      const cdFinal = Math.min(cdAmt, Math.max(0, subtotal - discount));
      customDiscountMeta = { value: cdVal, type: cdType, amount: cdFinal };
    }
    const finalTotal = Math.max(0, (subtotal - discount - (customDiscountMeta?.amount || 0)) + deliveryFee);

    const updatedOrder = {
      ...existingOrder,
      source,
      customerName:  customerName.trim(),
      phone:         phone?.trim() || '',
      city:          city?.trim()  || '',
      notes:         notes?.trim() || '',
      items:         enrichedItems,
      subtotal,
      discount,
      coupon:        couponMeta,
      customDiscount: customDiscountMeta,
      deliveryFee,
      total:         finalTotal,
      advanceAmount: Number(advanceAmount) || 0,
      paymentMethod: payMethod,
      status:        STATUSES.includes(status) ? status : 'Pending',
      updatedAt:     new Date().toISOString(),
    };

    if (isFirebaseAvailable()) {
      await dbRef.set(updatedOrder);
    } else {
      const idx = store.socialOrders.findIndex(o => o.id === orderId);
      store.socialOrders[idx] = updatedOrder;
    }

    store.emit('order_status_changed', { id: orderId, status: updatedOrder.status, orderType: 'social' });

    return res.json({ message: 'Social media order updated successfully! ✓', order: updatedOrder });
  } catch (err) {
    console.error('Update social order error:', err);
    return res.status(500).json({ error: 'Failed to update social media order.' });
  }
});

/* ── PATCH /api/social-orders/:id/status — Update status (admin only) ── */
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!STATUSES.includes(status)) return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(', ')}` });

    if (isFirebaseAvailable()) {
      const db  = getDB();
      const ref = db.collection('social_orders').doc(req.params.id);
      if (!(await ref.get()).exists) return res.status(404).json({ error: 'Order not found.' });
      await ref.update({ status, updatedAt: new Date().toISOString() });
    } else {
      const idx = store.socialOrders.findIndex(o => o.id === req.params.id);
      if (idx < 0) return res.status(404).json({ error: 'Order not found.' });
      store.socialOrders[idx].status    = status;
      store.socialOrders[idx].updatedAt = new Date().toISOString();
    }

    store.emit('order_status_changed', { id: req.params.id, status, orderType: 'social' });
    return res.json({ message: `Social order updated to "${status}".`, status });
  } catch (err) {
    console.error('Update social order status error:', err);
    return res.status(500).json({ error: 'Failed to update order status.' });
  }
});

/* ── DELETE /api/social-orders/:id — Delete order (admin only) ── */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    if (isFirebaseAvailable()) {
      await getDB().collection('social_orders').doc(req.params.id).delete();
    } else {
      const idx = store.socialOrders.findIndex(o => o.id === req.params.id);
      if (idx < 0) return res.status(404).json({ error: 'Order not found.' });
      store.socialOrders.splice(idx, 1);
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('Delete social order error:', err);
    return res.status(500).json({ error: 'Failed to delete order.' });
  }
});

module.exports = router;

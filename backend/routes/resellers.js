/* ============================================================
   VELORRA — Reseller Routes
   POST /api/resellers        — Public: submit reseller request
   GET  /api/resellers        — Admin: list all reseller requests
   PATCH /api/resellers/:id   — Admin: update status
   DELETE /api/resellers/:id  — Admin: delete
   ============================================================ */
const express = require('express');
const { getDB }     = require('../utils/firebase');
const { requireAdmin, requireRole } = require('../middleware/auth');
const store          = require('../utils/store');

const router = express.Router();

function isFirebaseAvailable() {
  try { return !!getDB(); } catch { return false; }
}

/* ── POST /api/resellers — Submit a reseller interest form (public) ── */
router.post('/', async (req, res) => {
  try {
    const { name, phone, city, businessType, message } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required.' });
    if (!phone || !phone.trim()) return res.status(400).json({ error: 'Phone number is required.' });

    const entry = {
      name:         name.trim(),
      phone:        phone.trim(),
      city:         (city || '').trim(),
      businessType: (businessType || '').trim(),
      message:      (message || '').trim(),
      status:       'new',
      createdAt:    new Date().toISOString(),
    };

    if (isFirebaseAvailable()) {
      const db  = getDB();
      const ref = await db.collection('resellers').add(entry);
      /* Emit SSE so admin dashboard gets real-time badge update */
      try { store.emit && store.emit('new_reseller', { ...entry, id: ref.id }); } catch {}
      return res.status(201).json({ message: 'Request received! We will contact you soon.', id: ref.id });
    }

    /* Fallback: in-memory store */
    if (!store.resellers) store.resellers = [];
    const record = { id: 'res-' + Date.now(), ...entry };
    store.resellers.unshift(record);
    try { store.emit && store.emit('new_reseller', record); } catch {}
    return res.status(201).json({ message: 'Request received! We will contact you soon.', id: record.id });

  } catch (err) {
    console.error('Reseller submit error:', err);
    return res.status(500).json({ error: 'Failed to submit request. Please try WhatsApp instead.' });
  }
});

/* ── GET /api/resellers — Admin: list all (all roles can view) ── */
router.get('/', requireAdmin, async (req, res) => {
  try {
    if (isFirebaseAvailable()) {
      const snap = await getDB().collection('resellers').orderBy('createdAt', 'desc').get();
      return res.json({ resellers: snap.docs.map(d => ({ id: d.id, _id: d.id, ...d.data() })) });
    }
    if (!store.resellers) store.resellers = [];
    return res.json({ resellers: store.resellers, total: store.resellers.length });
  } catch (err) {
    if (!store.resellers) store.resellers = [];
    return res.json({ resellers: store.resellers, total: store.resellers.length });
  }
});

/* ── PATCH /api/resellers/:id — Update status ── */
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const { id }     = req.params;
    const { status } = req.body;
    const allowed    = ['new', 'contacted', 'active', 'rejected'];
    if (status && !allowed.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

    if (isFirebaseAvailable()) {
      await getDB().collection('resellers').doc(id).update({ status, updatedAt: new Date().toISOString() });
      return res.json({ message: 'Updated.' });
    }
    if (!store.resellers) store.resellers = [];
    const r = store.resellers.find(x => x.id === id);
    if (!r) return res.status(404).json({ error: 'Not found.' });
    r.status = status;
    return res.json({ message: 'Updated.', reseller: r });
  } catch (err) {
    console.error('Reseller update error:', err);
    return res.status(500).json({ error: 'Failed to update.' });
  }
});

/* ── DELETE /api/resellers/:id — Delete ── */
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (isFirebaseAvailable()) {
      await getDB().collection('resellers').doc(id).delete();
      return res.json({ message: 'Deleted.' });
    }
    if (!store.resellers) store.resellers = [];
    const idx = store.resellers.findIndex(x => x.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found.' });
    store.resellers.splice(idx, 1);
    return res.json({ message: 'Deleted.' });
  } catch (err) {
    console.error('Reseller delete error:', err);
    return res.status(500).json({ error: 'Failed to delete.' });
  }
});

module.exports = router;

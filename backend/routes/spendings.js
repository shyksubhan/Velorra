/* ============================================================
   VELORRA — Spendings Routes
   Track investments and expenses
   ============================================================ */
const express = require('express');
const { getDB } = require('../utils/firebase');
const { requireRole } = require('../middleware/auth');
const store = require('../utils/store');

const router = express.Router();

function isFirebaseAvailable() {
  try { return !!getDB(); } catch { return false; }
}

/* ── GET /api/spendings ── */
router.get('/', requireRole('super_admin'), async (req, res) => {
  try {
    if (isFirebaseAvailable()) {
      const db = getDB();
      const snap = await db.collection('spendings').orderBy('date', 'desc').get();
      const spendings = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      store.spendings = spendings;
      return res.json({ spendings });
    }
    return res.json({ spendings: store.spendings });
  } catch (err) {
    console.error('Fetch spendings error:', err);
    return res.status(500).json({ error: 'Failed to load spendings.' });
  }
});

/* ── POST /api/spendings ── */
router.post('/', requireRole('super_admin'), async (req, res) => {
  try {
    const { amount, reason, date } = req.body;
    if (!amount || !reason) {
      return res.status(400).json({ error: 'Amount and reason are required.' });
    }

    const spending = {
      id: 'spnd-' + Date.now(),
      amount: Number(amount),
      reason: reason.trim(),
      date: date || new Date().toISOString(),
      createdBy: req.user.uid,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseAvailable()) {
      try {
        await getDB().collection('spendings').doc(spending.id).set(spending);
      } catch (e) {
        console.error('Failed to save spending to Firebase:', e);
      }
    }
    
    store.spendings.push(spending);

    store.logActivity({
      staffId: req.user.uid,
      staffName: req.user.fname || req.user.email || 'Unknown',
      staffRole: req.user.role,
      action: 'spending_added',
      details: { amount: spending.amount, reason: spending.reason }
    });

    return res.status(201).json({ message: 'Spending added successfully.', spending });
  } catch (err) {
    console.error('Add spending error:', err);
    return res.status(500).json({ error: 'Failed to add spending.' });
  }
});

/* ── DELETE /api/spendings/:id ── */
router.delete('/:id', requireRole('super_admin'), async (req, res) => {
  try {
    const id = req.params.id;
    if (isFirebaseAvailable()) {
      try {
        await getDB().collection('spendings').doc(id).delete();
      } catch (e) {
        console.error('Failed to delete spending from Firebase:', e);
      }
    }
    
    const idx = store.spendings.findIndex(s => s.id === id);
    if (idx >= 0) {
      const spending = store.spendings[idx];
      store.spendings.splice(idx, 1);
      
      store.logActivity({
        staffId: req.user.uid,
        staffName: req.user.fname || req.user.email || 'Unknown',
        staffRole: req.user.role,
        action: 'spending_deleted',
        details: { amount: spending.amount, reason: spending.reason }
      });
    }

    return res.json({ message: 'Spending deleted.' });
  } catch (err) {
    console.error('Delete spending error:', err);
    return res.status(500).json({ error: 'Failed to delete spending.' });
  }
});

module.exports = router;

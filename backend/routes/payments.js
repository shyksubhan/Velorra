/* ============================================================
   VELORRA — Payments Routes
   Supports: COD, Card (Stripe test mode), Bank Transfer
   ============================================================ */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const store = require('../utils/store');

const router = express.Router();

const PAYMENT_METHODS = ['cod', 'bank_deposit'];

/* ── POST /api/payments/initiate ──
   Called when customer selects a payment method at checkout.
   Returns payment instructions / redirect URL.
*/
router.post('/initiate', async (req, res) => {
  try {
    const { paymentMethod, amount, orderRef, customerPhone, customerEmail } = req.body;

    if (!paymentMethod || !amount || !orderRef) {
      return res.status(400).json({ error: 'paymentMethod, amount, and orderRef are required.' });
    }
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ error: `Invalid payment method. Supported: ${PAYMENT_METHODS.join(', ')}` });
    }

    const txnId = 'TXN-' + uuidv4().replace(/-/g, '').toUpperCase().slice(0, 10);

    switch (paymentMethod) {

      case 'cod':
        return res.json({
          method:       'cod',
          txnId,
          status:       'pending',
          instructions: 'Pay in cash when your order arrives. Our courier will collect the payment at delivery.',
          amount,
          orderRef,
        });

      case 'bank_deposit':
        return res.json({
          method:       'bank_deposit',
          txnId,
          status:       'pending',
          amount,
          orderRef,
          bankDetails: {
            bankName:      'Bank Alfalah',
            accountTitle:  'MUHAMMAD SUBHAN',
            accountNumber: '09601009896691',
            iban:          'PK45ALFH096000100989669',
          },
          instructions: `Deposit PKR ${amount.toLocaleString()} to:\nBank: Bank Alfalah\nAccount Title: MUHAMMAD SUBHAN\nAccount Number: 09601009896691\nIBAN: PK45ALFH096000100989669\n\nAfter placing your order, please send a screenshot of the payment to our WhatsApp along with your order reference (${orderRef}).`,
        });
    }

  } catch (err) {
    console.error('Payment initiate error:', err);
    return res.status(500).json({ error: 'Payment initiation failed: ' + err.message });
  }
});

/* ── POST /api/payments/verify ── Verify a payment by txnId ── */
router.post('/verify', async (req, res) => {
  try {
    const { txnId, orderRef } = req.body;
    if (!txnId || !orderRef) return res.status(400).json({ error: 'txnId and orderRef are required.' });

    /* In production: query payment gateway API to verify */
    /* For demo mode: mark order as payment_received */
    const order = store.findOrder(orderRef);
    if (order) {
      order.paymentStatus = 'received';
      order.txnId         = txnId;
      order.updatedAt     = new Date().toISOString();
    }

    return res.json({ verified: true, txnId, orderRef, message: 'Payment verified successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Payment verification failed.' });
  }
});

/* ── Stripe webhook removed — card payments are no longer supported.
   Payment methods are now: Cash on Delivery (COD) and Bank Deposit. ── */

module.exports = router;

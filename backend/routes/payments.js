/* ============================================================
   VELORRA — Payments Routes
   Supports: COD, JazzCash, EasyPaisa, Card (Stripe test mode)
   ============================================================ */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const store = require('../utils/store');

const router = express.Router();

const PAYMENT_METHODS = ['cod', 'jazzcash', 'easypaisa', 'card', 'bank_transfer'];

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

      case 'jazzcash': {
        /*
          Real JazzCash integration requires:
          - Merchant ID (from JazzCash merchant portal)
          - Password + IntegritySalt (from JazzCash)
          - Generate HMAC SHA256 hash and redirect to JazzCash hosted page

          For now, returns sandbox-ready structure.
          Set JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_INTEGRITY_SALT in .env for production.
        */
        const merchantId = process.env.JAZZCASH_MERCHANT_ID || 'SANDBOX_MERCHANT';
        const isLive     = !!process.env.JAZZCASH_MERCHANT_ID;

        if (isLive) {
          /* Build JazzCash payment form data */
          const crypto = require('crypto');
          const pp_Amount         = String(Math.round(amount * 100)); /* in paisas */
          const pp_BillReference  = orderRef;
          const pp_Description    = `Velorra Order ${orderRef}`;
          const pp_MerchantID     = merchantId;
          const pp_Password       = process.env.JAZZCASH_PASSWORD;
          const pp_ReturnURL      = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/api/payments/jazzcash-callback`;
          const pp_TxnCurrency    = 'PKR';
          const pp_TxnDateTime    = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
          const pp_TxnRefNo       = txnId;
          const pp_TxnType        = 'MWALLET';
          const pp_Version        = '1.1';
          const pp_MobileNumber   = customerPhone || '';

          const hashString = [
            process.env.JAZZCASH_INTEGRITY_SALT,
            pp_Amount, pp_BillReference, pp_Description,
            pp_MerchantID, pp_Password, pp_ReturnURL,
            pp_TxnCurrency, pp_TxnDateTime, pp_TxnRefNo, pp_TxnType, pp_Version, pp_MobileNumber
          ].join('&');

          const pp_SecureHash = crypto.createHmac('sha256', process.env.JAZZCASH_INTEGRITY_SALT || '').update(hashString).digest('hex').toUpperCase();

          return res.json({
            method:        'jazzcash',
            txnId,
            status:        'redirect',
            redirectUrl:   'https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/',
            formData:      { pp_MerchantID, pp_Password, pp_TxnRefNo, pp_Amount, pp_TxnCurrency, pp_TxnDateTime, pp_BillReference, pp_Description, pp_TxnType, pp_Version, pp_ReturnURL, pp_MobileNumber, pp_SecureHash },
            amount,
            orderRef,
          });
        }

        /* Sandbox / Demo mode */
        return res.json({
          method:        'jazzcash',
          txnId,
          status:        'demo',
          amount,
          orderRef,
          instructions:  `Send PKR ${amount.toLocaleString()} to JazzCash account: 0300-0000000 (Velorra). Use order reference "${orderRef}" as your payment message. Screenshot required.`,
          demoMode:      true,
          setupRequired: 'Set JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_INTEGRITY_SALT in .env to enable live JazzCash payments.',
        });
      }

      case 'easypaisa': {
        /*
          Real EasyPaisa integration requires EasyPaisa merchant credentials.
          Set EASYPAISA_STORE_ID, EASYPAISA_HASH_KEY in .env for production.
        */
        const isLive = !!process.env.EASYPAISA_STORE_ID;

        if (isLive) {
          /* Build EasyPaisa OTC/MA transaction */
          const crypto      = require('crypto');
          const storeId     = process.env.EASYPAISA_STORE_ID;
          const hashKey     = process.env.EASYPAISA_HASH_KEY;
          const orderId     = orderRef;
          const transAmount = amount.toFixed(2);
          const mobileNum   = customerPhone || '03000000000';
          const emailAddr   = customerEmail || '';
          const expiryDate  = new Date(Date.now() + 3600000).toISOString().split('T')[0].replace(/-/g, '') + '235959'; /* +1 hour */

          const postData = `amount=${transAmount}&orderRefNum=${orderId}&storeId=${storeId}&expiryDate=${expiryDate}&postBackURL=${process.env.FRONTEND_URL || 'http://localhost:3001'}/api/payments/easypaisa-callback&mobileNum=${mobileNum}&emailAddr=${emailAddr}`;
          const hash = crypto.createHmac('sha256', hashKey).update(postData).digest('base64');

          return res.json({
            method:      'easypaisa',
            txnId,
            status:      'redirect',
            redirectUrl: 'https://easypay.easypaisa.com.pk/tpg/',
            formData:    { storeId, orderId, transactionAmount: transAmount, mobileAccountNo: mobileNum, emailAddress: emailAddr, transactionType: 'MA', tokenExpiry: expiryDate, encryptedHashRequest: hash },
            amount,
            orderRef,
          });
        }

        /* Demo mode */
        return res.json({
          method:        'easypaisa',
          txnId,
          status:        'demo',
          amount,
          orderRef,
          instructions:  `Send PKR ${amount.toLocaleString()} to EasyPaisa account: 0300-0000000 (Velorra). Use "${orderRef}" as the account title message.`,
          demoMode:      true,
          setupRequired: 'Set EASYPAISA_STORE_ID, EASYPAISA_HASH_KEY in .env to enable live EasyPaisa payments.',
        });
      }

      case 'card': {
        /*
          Stripe integration for card payments.
          Set STRIPE_SECRET_KEY in .env — use sk_test_... for testing.
          The frontend uses Stripe.js with your STRIPE_PUBLISHABLE_KEY.
        */
        if (!process.env.STRIPE_SECRET_KEY) {
          return res.json({
            method:        'card',
            txnId,
            status:        'demo',
            amount,
            orderRef,
            instructions:  'Card payment is in demo mode. Set STRIPE_SECRET_KEY in .env to enable live card payments.',
            demoMode:      true,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
            setupRequired: 'Set STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY in .env to enable card payments.',
          });
        }

        const Stripe = require('stripe');
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

        const paymentIntent = await stripe.paymentIntents.create({
          amount:      Math.round(amount * 100), /* Stripe uses smallest currency unit */
          currency:    'pkr',
          description: `Velorra Order ${orderRef}`,
          metadata:    { orderRef },
        });

        return res.json({
          method:       'card',
          txnId,
          status:       'requires_payment',
          clientSecret: paymentIntent.client_secret,
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
          amount,
          orderRef,
        });
      }

      case 'bank_transfer':
        return res.json({
          method:       'bank_transfer',
          txnId,
          status:       'pending',
          amount,
          orderRef,
          instructions: `Transfer PKR ${amount.toLocaleString()} to:\nBank: HBL\nAccount Title: Velorra\nAccount No: 1234-5678-9012\nIBAN: PK00HABB0000000000000000\nReference: ${orderRef}\n\nEmail your transfer receipt to bktjewelryoperations@gmail.com with your order number.`,
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

/* ── GET /api/payments/jazzcash-callback ── JazzCash redirect callback ── */
router.get('/jazzcash-callback', async (req, res) => {
  const { pp_TxnRefNo, pp_ResponseCode, pp_BillReference } = req.query;
  if (pp_ResponseCode === '000') {
    /* Payment successful */
    const order = store.findOrder(pp_BillReference);
    if (order) { order.paymentStatus = 'received'; order.txnId = pp_TxnRefNo; }
    return res.redirect(`/?payment=success&ref=${pp_BillReference}`);
  }
  return res.redirect(`/?payment=failed&ref=${pp_BillReference}`);
});

/* ── POST /api/payments/easypaisa-callback ── */
router.post('/easypaisa-callback', async (req, res) => {
  const { orderRefNum, transactionId, responseCode } = req.body;
  if (responseCode === '0000') {
    const order = store.findOrder(orderRefNum);
    if (order) { order.paymentStatus = 'received'; order.txnId = transactionId; }
  }
  res.sendStatus(200);
});

/* ── POST /api/payments/stripe-webhook ── Stripe event webhook ── */
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) return res.sendStatus(200);
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const event  = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
    if (event.type === 'payment_intent.succeeded') {
      const pi    = event.data.object;
      const order = store.findOrder(pi.metadata?.orderRef);
      if (order) { order.paymentStatus = 'received'; order.txnId = pi.id; }
    }
    res.sendStatus(200);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;

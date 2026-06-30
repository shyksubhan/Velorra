/* ============================================================
   VELORRA — Invoices Routes
   ============================================================ */
const express = require('express');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { getDB } = require('../utils/firebase');
const { requireAdmin } = require('../middleware/auth');
const store = require('../utils/store');
const { sendInvoiceEmail } = require('../utils/email');

const router = express.Router();

function isFirebaseAvailable() {
  try { return !!getDB(); } catch { return false; }
}

/* Ensure data/invoices directory exists */
const INVOICES_DIR = path.join(__dirname, '..', 'data', 'invoices');
if (!fs.existsSync(INVOICES_DIR)) {
  fs.mkdirSync(INVOICES_DIR, { recursive: true });
}

/* Helper to pad numbers */
const padNum = (num, size) => ('000000000' + num).substr(-size);

/* ── POST /api/invoices/generate ── */
router.post('/generate', requireAdmin, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId is required' });

    // Find the order
    let order = null;
    if (isFirebaseAvailable()) {
      const doc = await getDB().collection('orders').doc(orderId).get();
      if (doc.exists) order = { id: doc.id, ...doc.data() };
    }
    if (!order) order = store.orders.find(o => o.id === orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Generate next invoice ID
    let nextNum = 1;
    let existingInvoices = [];
    if (isFirebaseAvailable()) {
      const snap = await getDB().collection('invoices').get();
      existingInvoices = snap.docs.map(d => d.data());
    } else {
      existingInvoices = store.invoices;
    }
    
    // Simple sequence: INV-YYYY-XXXXX
    const year = new Date().getFullYear();
    const invCount = existingInvoices.filter(i => i.id.startsWith(`INV-${year}`)).length;
    nextNum = invCount + 1;
    const invId = `INV-${year}-${padNum(nextNum, 5)}`;

    const pdfFileName = `${invId}.pdf`;
    const pdfPath = path.join(INVOICES_DIR, pdfFileName);

    // Create the PDF
    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      const company = store.settings?.company || { name: 'Velorra Jewelry', address: '', phone: '', email: '' };

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text(company.name, { align: 'right' });
      doc.fontSize(10).font('Helvetica').text(company.address, { align: 'right' });
      doc.text(company.phone, { align: 'right' });
      doc.text(company.email, { align: 'right' });
      
      doc.moveUp(4);
      doc.fontSize(20).font('Helvetica-Bold').text('INVOICE', { align: 'left' });
      doc.fontSize(10).font('Helvetica');
      doc.text(`Invoice Number: ${invId}`);
      doc.text(`Date: ${new Date().toLocaleDateString()}`);
      doc.text(`Order Ref: ${orderId}`);
      
      doc.moveDown(2);

      // Billing Info
      doc.font('Helvetica-Bold').text('Bill To:');
      doc.font('Helvetica');
      doc.text(`${order.delivery?.fname || ''} ${order.delivery?.lname || ''}`);
      doc.text(order.delivery?.address || '');
      doc.text(order.delivery?.city || '');
      doc.text(order.delivery?.phone || '');
      doc.text(order.delivery?.email || '');

      doc.moveDown(2);

      // Status Section
      doc.rect(50, doc.y, 500, 20).fillAndStroke('#f0f0f0', '#cccccc');
      doc.fillColor('#000000').font('Helvetica-Bold');
      doc.text('Order Status', 60, doc.y - 15);
      doc.text('Payment Method', 200, doc.y - 15);
      doc.text('Advance Status', 340, doc.y - 15);
      
      doc.font('Helvetica');
      doc.text(order.status || 'Pending', 60, doc.y + 5);
      doc.text((order.paymentMethod || '').toUpperCase(), 200, doc.y - 10);
      doc.text(order.advanceStatus || 'N/A', 340, doc.y - 10);
      doc.moveDown(2);

      // Table Header
      const tableTop = doc.y;
      doc.font('Helvetica-Bold');
      doc.text('Item', 50, tableTop);
      doc.text('Price', 280, tableTop, { width: 90, align: 'right' });
      doc.text('Qty', 370, tableTop, { width: 90, align: 'right' });
      doc.text('Total', 470, tableTop, { width: 80, align: 'right' });
      
      doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
      doc.font('Helvetica');
      
      let y = tableTop + 25;
      (order.items || []).forEach(item => {
        const itemTotal = (item.price * item.qty);
        doc.text(item.name, 50, y);
        doc.text(`PKR ${item.price.toLocaleString()}`, 280, y, { width: 90, align: 'right' });
        doc.text(item.qty.toString(), 370, y, { width: 90, align: 'right' });
        doc.text(`PKR ${itemTotal.toLocaleString()}`, 470, y, { width: 80, align: 'right' });
        y += 20;
      });
      
      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 15;

      // Totals
      doc.font('Helvetica-Bold');
      doc.text('Subtotal:', 370, y, { width: 90, align: 'right' });
      doc.text(`PKR ${(order.subtotal || 0).toLocaleString()}`, 470, y, { width: 80, align: 'right' });
      y += 20;

      if (order.discount > 0) {
        doc.text('Discount:', 370, y, { width: 90, align: 'right' });
        doc.text(`- PKR ${(order.discount).toLocaleString()}`, 470, y, { width: 80, align: 'right' });
        y += 20;
      }

      doc.text('Delivery Fee:', 370, y, { width: 90, align: 'right' });
      doc.text(`PKR ${(order.deliveryFee || 0).toLocaleString()}`, 470, y, { width: 80, align: 'right' });
      y += 20;

      doc.fontSize(12).text('Grand Total:', 370, y, { width: 90, align: 'right' });
      doc.text(`PKR ${(order.total || 0).toLocaleString()}`, 470, y, { width: 80, align: 'right' });
      y += 25;
      
      doc.fontSize(10);
      const advancePaid = Number(order.advanceAmount) || 0;
      if (advancePaid > 0) {
        doc.text('Advance Paid:', 370, y, { width: 90, align: 'right' });
        doc.text(`- PKR ${advancePaid.toLocaleString()}`, 470, y, { width: 80, align: 'right' });
        y += 20;
      }
      
      const remaining = Math.max(0, (order.total || 0) - advancePaid);
      doc.text('Remaining to Collect:', 320, y, { width: 140, align: 'right' });
      doc.text(`PKR ${remaining.toLocaleString()}`, 470, y, { width: 80, align: 'right' });

      // Footer
      doc.fontSize(8).font('Helvetica-Oblique');
      doc.text('Thank you for your business.', 50, 750, { align: 'center', width: 500 });
      
      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });

    // Save Invoice Snapshot
    const invoiceRecord = {
      id: invId,
      orderId: order.id,
      type: 'standard',
      pdfUrl: `/api/invoices/${invId}/download`,
      pdfFilePath: pdfPath,
      customerName: `${order.delivery?.fname || ''} ${order.delivery?.lname || ''}`,
      total: order.total,
      snapshot: order,
      status: 'Generated',
      emailStatus: 'Not Sent',
      createdAt: new Date().toISOString(),
      createdBy: req.user?.email || 'System',
      downloadCount: 0,
      lastDownloadDate: null
    };

    if (isFirebaseAvailable()) {
      await getDB().collection('invoices').doc(invId).set(invoiceRecord);
    }
    store.invoices.unshift(invoiceRecord);

    store.logActivity({
      staffId: req.user?.uid,
      staffName: req.user?.email || 'System',
      staffRole: req.user?.role || 'system',
      action: 'invoice_generated',
      details: { invoiceId: invId, orderId: orderId }
    });

    return res.status(201).json({ message: 'Invoice generated.', invoice: invoiceRecord });
  } catch (err) {
    console.error('Invoice generate error:', err);
    return res.status(500).json({ error: 'Failed to generate invoice.' });
  }
});

/* ── GET /api/invoices ── */
router.get('/', requireAdmin, async (req, res) => {
  try {
    let invoices = [];
    if (isFirebaseAvailable()) {
      const snap = await getDB().collection('invoices').orderBy('createdAt', 'desc').get();
      invoices = snap.docs.map(d => d.data());
    } else {
      invoices = store.invoices;
    }
    return res.json({ invoices });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch invoices.' });
  }
});

/* ── GET /api/invoices/:id/download ── */
router.get('/:id/download', async (req, res) => {
  try {
    const invId = req.params.id;
    let inv = null;
    if (isFirebaseAvailable()) {
      const doc = await getDB().collection('invoices').doc(invId).get();
      if (doc.exists) inv = doc.data();
    }
    if (!inv) inv = store.invoices.find(i => i.id === invId);
    if (!inv) return res.status(404).json({ error: 'Invoice not found.' });

    const pdfPath = inv.pdfFilePath || path.join(INVOICES_DIR, `${invId}.pdf`);
    if (!fs.existsSync(pdfPath)) return res.status(404).json({ error: 'PDF file missing.' });

    // Increment download count
    inv.downloadCount = (inv.downloadCount || 0) + 1;
    inv.lastDownloadDate = new Date().toISOString();
    if (isFirebaseAvailable()) {
      await getDB().collection('invoices').doc(invId).update({ downloadCount: inv.downloadCount, lastDownloadDate: inv.lastDownloadDate });
    }

    res.download(pdfPath, `${invId}.pdf`);
  } catch (err) {
    return res.status(500).json({ error: 'Download failed.' });
  }
});

/* ── POST /api/invoices/:id/email ── */
router.post('/:id/email', requireAdmin, async (req, res) => {
  try {
    const invId = req.params.id;
    let inv = null;
    if (isFirebaseAvailable()) {
      const doc = await getDB().collection('invoices').doc(invId).get();
      if (doc.exists) inv = doc.data();
    }
    if (!inv) inv = store.invoices.find(i => i.id === invId);
    if (!inv) return res.status(404).json({ error: 'Invoice not found.' });

    const pdfPath = inv.pdfFilePath || path.join(INVOICES_DIR, `${invId}.pdf`);
    if (!fs.existsSync(pdfPath)) return res.status(404).json({ error: 'PDF file missing.' });

    const toEmail = inv.snapshot?.delivery?.email;
    if (!toEmail) return res.status(400).json({ error: 'Customer email missing.' });

    // Send email
    await sendInvoiceEmail({
      to: toEmail,
      invoiceRef: invId,
      customerName: inv.customerName || 'Customer',
      pdfPath
    });

    inv.emailStatus = `Sent on ${new Date().toLocaleString()}`;
    if (isFirebaseAvailable()) {
      await getDB().collection('invoices').doc(invId).update({ emailStatus: inv.emailStatus });
    }

    store.logActivity({
      staffId: req.user?.uid,
      staffName: req.user?.email || 'Unknown',
      staffRole: req.user?.role || 'admin',
      action: 'invoice_emailed',
      details: { invoiceId: invId, to: toEmail }
    });

    return res.json({ message: 'Email sent successfully!', emailStatus: inv.emailStatus });
  } catch (err) {
    console.error('Invoice email error:', err);
    return res.status(500).json({ error: 'Failed to email invoice.' });
  }
});

module.exports = router;

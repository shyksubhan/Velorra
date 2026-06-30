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

    // Invoice ID is EXACTLY the Order ID
    const invId = orderId;
    const pdfFileName = `${invId}.pdf`;
    const pdfPath = path.join(INVOICES_DIR, pdfFileName);

    // Fetch company logo if it exists
    const company = store.settings?.company || { name: 'Velorra Jewelry', address: '', phone: '', email: '', website: '' };
    let logoBuffer = null;
    if (company.logoUrl && company.logoUrl.startsWith('http')) {
      try {
        const fetch = require('node:http');
        const https = require('node:https');
        const client = company.logoUrl.startsWith('https') ? https : fetch;
        logoBuffer = await new Promise((resolve) => {
          client.get(company.logoUrl, (res) => {
            if (res.statusCode !== 200) return resolve(null);
            const data = [];
            res.on('data', chunk => data.push(chunk));
            res.on('end', () => resolve(Buffer.concat(data)));
          }).on('error', () => resolve(null));
        });
      } catch (err) {
        console.error('Failed to fetch logo:', err);
      }
    }

    // Create the PDF
    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(pdfPath);
      doc.pipe(stream);

      // Colors
      const C_BLACK = '#0a0a0a';
      const C_GOLD = '#b8883a';
      const C_CREAM = '#fdfbf7';
      const C_TEXT = '#333333';
      const C_MUTED = '#888888';
      const C_BORDER = '#eaeaea';

      // --- HEADER ---
      let startY = 50;
      if (logoBuffer) {
        try {
          doc.image(logoBuffer, 50, startY, { height: 40 });
        } catch(e) {
          doc.fontSize(24).fillColor(C_GOLD).font('Helvetica-Bold').text(company.name, 50, startY);
        }
      } else {
        doc.fontSize(24).fillColor(C_GOLD).font('Helvetica-Bold').text(company.name, 50, startY);
      }

      // Company Info (Right aligned)
      doc.fontSize(24).fillColor(C_BLACK).font('Helvetica-Bold').text('INVOICE', 350, startY, { align: 'right', width: 195 });
      
      const isCod = order.paymentMethod === 'cod';
      if (isCod) {
         doc.rect(470, startY + 28, 75, 14).fillAndStroke(C_BLACK, C_BLACK);
         doc.fontSize(8).fillColor(C_GOLD).font('Helvetica-Bold').text('COD ORDER', 470, startY + 31, { align: 'center', width: 75 });
      }

      doc.fontSize(9).fillColor(C_TEXT).font('Helvetica');
      doc.text(`Invoice / Order No:   ${invId}`, 350, startY + 55, { align: 'right', width: 195 });
      doc.text(`Invoice Date:   ${new Date().toLocaleDateString()}`, 350, startY + 70, { align: 'right', width: 195 });
      doc.text(`Payment Method:   ${isCod ? 'Cash on Delivery (COD)' : 'Online / Card'}`, 350, startY + 85, { align: 'right', width: 195 });
      doc.text(`Invoice Status:   Generated`, 350, startY + 100, { align: 'right', width: 195 });

      // BILL TO (Left aligned)
      let billY = startY + 65;
      doc.fontSize(10).fillColor(C_BLACK).font('Helvetica-Bold').text('BILL TO', 50, billY);
      doc.fontSize(9).font('Helvetica').fillColor(C_TEXT);
      doc.text(`${order.delivery?.fname || ''} ${order.delivery?.lname || ''}`, 50, billY + 15);
      doc.text(`${order.delivery?.address || ''}, ${order.delivery?.city || ''}`, 50, billY + 30);
      doc.text(order.delivery?.phone || '', 50, billY + 45);
      doc.text(order.delivery?.email || '', 50, billY + 60);

      doc.moveDown(3);

      // --- TABLE HEADER ---
      let y = 210;
      doc.rect(50, y, 495, 25).fillAndStroke(C_CREAM, C_CREAM);
      doc.fillColor(C_BLACK).font('Helvetica-Bold').fontSize(9);
      doc.text('ITEMS', 60, y + 8);
      doc.text('PRICE', 300, y + 8, { width: 80, align: 'right' });
      doc.text('QTY', 390, y + 8, { width: 50, align: 'center' });
      doc.text('TOTAL', 450, y + 8, { width: 85, align: 'right' });
      
      y += 25;

      // --- TABLE ROWS ---
      doc.font('Helvetica').fillColor(C_TEXT);
      (order.items || []).forEach(item => {
        const itemTotal = (item.price * item.qty);
        doc.rect(50, y, 495, 40).fillAndStroke('#ffffff', '#ffffff');
        doc.fillColor(C_TEXT);
        doc.text(item.name, 60, y + 10);
        doc.fillColor(C_MUTED).fontSize(8).text(`SKU: ${item.sku || 'N/A'}`, 60, y + 22);
        doc.fillColor(C_TEXT).fontSize(9);
        doc.text(`PKR ${item.price.toLocaleString()}`, 300, y + 15, { width: 80, align: 'right' });
        doc.text(item.qty.toString(), 390, y + 15, { width: 50, align: 'center' });
        doc.text(`PKR ${itemTotal.toLocaleString()}`, 450, y + 15, { width: 85, align: 'right' });
        y += 40;
        doc.moveTo(50, y).lineTo(545, y).stroke(C_BORDER);
      });
      y += 15;

      // --- TOTALS ---
      doc.fontSize(9).fillColor(C_TEXT);
      doc.text('Subtotal', 350, y, { width: 80, align: 'left' });
      doc.text(`PKR ${(order.subtotal || 0).toLocaleString()}`, 450, y, { width: 85, align: 'right' });
      y += 20;

      if (order.discount > 0) {
        doc.text('Discount', 350, y, { width: 80, align: 'left' });
        doc.text(`- PKR ${(order.discount).toLocaleString()}`, 450, y, { width: 85, align: 'right' });
        y += 20;
      }

      if ((order.deliveryFee || 0) > 0) {
        doc.text('Delivery Fee', 350, y, { width: 80, align: 'left' });
        doc.text(`PKR ${(order.deliveryFee || 0).toLocaleString()}`, 450, y, { width: 85, align: 'right' });
        y += 20;
      }

      doc.fontSize(12).font('Helvetica-Bold').fillColor(C_BLACK);
      doc.text('Grand Total', 350, y, { width: 80, align: 'left' });
      doc.text(`PKR ${(order.total || 0).toLocaleString()}`, 450, y, { width: 85, align: 'right' });
      y += 35;

      // --- ADVANCE & COD BOX ---
      const advancePaid = Number(order.advanceAmount) || 0;
      const remaining = Math.max(0, (order.total || 0) - advancePaid);
      
      doc.rect(50, y, 280, 80).fillAndStroke(C_CREAM, C_CREAM);
      doc.fillColor(C_BLACK).fontSize(9).font('Helvetica-Bold');
      doc.text('Advance Paid', 60, y + 15);
      doc.text(`PKR ${advancePaid.toLocaleString()}`, 200, y + 15, { width: 110, align: 'left' });
      doc.font('Helvetica');
      doc.text('Advance Method', 60, y + 30);
      doc.text(order.advanceMethod || '—', 200, y + 30, { width: 110, align: 'left' });
      doc.text('Reference No', 60, y + 45);
      doc.text(order.advanceRef || '—', 200, y + 45, { width: 110, align: 'left' });
      doc.text('Advance Date', 60, y + 60);
      doc.text(order.advanceDate ? new Date(order.advanceDate).toLocaleDateString() : '—', 200, y + 60, { width: 110, align: 'left' });

      // Highlight Box
      doc.rect(350, y, 195, 80).fillAndStroke(C_BLACK, C_BLACK);
      doc.fillColor(C_GOLD).font('Helvetica').fontSize(10);
      doc.text(isCod ? 'Remaining to Collect (COD)' : 'Remaining Balance', 350, y + 20, { align: 'center', width: 195 });
      doc.font('Helvetica-Bold').fontSize(18);
      doc.text(`PKR ${remaining.toLocaleString()}`, 350, y + 40, { align: 'center', width: 195 });

      y += 100;

      // --- STATUS BADGES ---
      doc.rect(50, y, 495, 40).fillAndStroke(C_CREAM, C_CREAM);
      doc.fillColor(C_TEXT).fontSize(8).font('Helvetica-Bold');
      doc.text('Order Status', 90, y + 12);
      doc.font('Helvetica').text(order.status || 'Pending', 90, y + 24);

      doc.font('Helvetica-Bold').text('Payment Status', 200, y + 12);
      doc.font('Helvetica').text(advancePaid > 0 ? (advancePaid >= order.total ? 'Paid' : 'Partial (Advance)') : (isCod ? 'Unpaid' : 'Paid'), 200, y + 24);
      
      doc.font('Helvetica-Bold').text('Advance Status', 320, y + 12);
      doc.font('Helvetica').text(order.advanceStatus || '—', 320, y + 24);

      doc.font('Helvetica-Bold').text('Delivery Status', 430, y + 12);
      doc.font('Helvetica').text('Not Shipped', 430, y + 24);

      // --- FOOTER ---
      doc.rect(0, 780, 600, 65).fillAndStroke(C_BLACK, C_BLACK);
      doc.fillColor(C_GOLD).fontSize(9).font('Helvetica-Bold');
      doc.text(`Thank you for shopping with ${company.name}!`, 0, 795, { align: 'center', width: 600 });
      doc.fillColor('#dddddd').fontSize(8).font('Helvetica');
      doc.text(`${company.website || 'www.velorra.com'}   |   ${company.email || 'support@velorra.com'}   |   ${company.phone || '+92 300 1112233'}`, 0, 810, { align: 'center', width: 600 });

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

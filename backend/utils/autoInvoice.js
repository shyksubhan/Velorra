const path = require('path');
const fs = require('fs');
const { getDB } = require('./firebase');
const store = require('./store');
const { buildPdf } = require('./pdfGenerator');
const { sendInvoiceEmail } = require('./email');

const INVOICES_DIR = path.join(__dirname, '..', 'data', 'invoices');
if (!fs.existsSync(INVOICES_DIR)) {
  fs.mkdirSync(INVOICES_DIR, { recursive: true });
}

function isFirebaseAvailable() {
  try { return !!getDB(); } catch { return false; }
}

async function autoGenerateAndEmailInvoice(orderId) {
  try {
    const isSocial = orderId.startsWith('SOC-');
    const colName = isSocial ? 'social_orders' : 'orders';
    let order = null;

    if (isFirebaseAvailable()) {
      const doc = await getDB().collection(colName).doc(orderId).get();
      if (doc.exists) order = { id: doc.id, ...doc.data() };
    }
    if (!order) {
      order = (isSocial ? store.socialOrders : store.orders).find(o => o.id === orderId);
    }
    if (!order) return; // Order not found

    const invId = orderId;
    const pdfFileName = `${invId}.pdf`;
    const pdfPath = path.join(INVOICES_DIR, pdfFileName);

    const company = store.settings?.company || { name: 'Golnisà', address: '', phone: '', email: '', website: '' };

    // Generate PDF
    await buildPdf(pdfPath, invId, order, order, company);

    // Save Invoice Record
    const invoiceRecord = {
      id: invId,
      orderId: order.id,
      type: 'standard',
      pdfUrl: `/api/invoices/${invId}/download`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      customerName: order.customerName || (order.delivery ? `${order.delivery.fname} ${order.delivery.lname}` : 'Customer'),
      amount: order.total || 0,
      snapshot: order
    };

    // Save to DB
    if (isFirebaseAvailable()) {
      await getDB().collection('invoices').doc(invId).set(invoiceRecord);
    }
    const idx = store.invoices.findIndex(i => i.id === invId);
    if (idx !== -1) store.invoices[idx] = invoiceRecord;
    else store.invoices.unshift(invoiceRecord);

    // Auto send email if email exists
    const toEmail = order.email || order.delivery?.email;
    if (toEmail) {
      try {
        await sendInvoiceEmail({
          to: toEmail,
          invoiceRef: invId,
          customerName: invoiceRecord.customerName,
          pdfPath,
          liveOrder: order
        });
        const emailStatus = `Auto-sent on ${new Date().toLocaleString()}`;
        if (isFirebaseAvailable()) {
          await getDB().collection('invoices').doc(invId).update({ emailStatus });
        }
        invoiceRecord.emailStatus = emailStatus;
        store.logActivity({
          staffId: 'system',
          staffName: 'Auto System',
          action: 'auto_invoice_emailed',
          details: { invoiceId: invId, to: toEmail }
        });
      } catch (e) {
        console.error('Auto email failed:', e);
      }
    }
  } catch (err) {
    console.error('Auto invoice generation error:', err);
  }
}

module.exports = { autoGenerateAndEmailInvoice };

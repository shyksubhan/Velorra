/* ============================================================
   VELORRA — Email Utility (Resend)
   ============================================================ */
const { Resend } = require('resend');

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = 'Velorra Jewelry <onboarding@resend.dev>';
const TO   = process.env.EMAIL_TO;

/* ── Order Confirmation Email (to customer) ── */
async function sendOrderConfirmation({ to, orderRef, items, delivery, total, paymentMethod }) {
  const resend = getResend();
  const itemRows = items.map(i =>
    `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;">${i.emoji || '🛍️'} ${i.name} × ${i.qty}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;text-align:right;">PKR ${(i.price * i.qty).toLocaleString()}</td>
    </tr>`
  ).join('');

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Order Confirmed — ${orderRef} | Velorra Jewelry`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:40px;background:#0a0a0a;font-family:Georgia,serif;color:#ccc;">
      <h1 style="color:#c9a84c;">VELORRA <span style="color:#fff;">Jewelry</span></h1>
      <h2 style="color:#fff;">Order Confirmed ✓</h2>
      <p>Thank you ${delivery.fname}! Your order <strong style="color:#c9a84c;">${orderRef}</strong> has been placed.</p>
      <table width="100%" style="margin:24px 0;">${itemRows}</table>
      <p><strong style="color:#c9a84c;">Total: PKR ${total.toLocaleString()}</strong></p>
      <p style="color:#888;">Delivering to: ${delivery.address}, ${delivery.city}</p>
      <p style="color:#888;">Payment: ${paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'bank_deposit' ? 'Bank Deposit' : paymentMethod}</p>
      ${paymentMethod === 'bank_deposit' ? `
      <div style="margin:18px 0;padding:16px 20px;background:#161616;border:1px solid #2a2a2a;">
        <p style="color:#c9a84c;margin:0 0 8px;font-weight:bold;">Bank Deposit Details</p>
        <p style="margin:2px 0;">Bank: Bank Alfalah</p>
        <p style="margin:2px 0;">Account Title: MUHAMMAD SUBHAN</p>
        <p style="margin:2px 0;">Account Number: 09601009896691</p>
        <p style="margin:2px 0;">IBAN: PK45ALFH0960001009896691</p>
        <p style="margin:10px 0 0;color:#aaa;">After placing your order, please send a screenshot of the payment to our WhatsApp.</p>
      </div>` : ''}
      <p style="color:#555;font-size:.8rem;">Questions? Email velorrajewelry@gmail.com</p>
    </body></html>`,
  });
}

/* ── New Order Notification (to store owner) ── */
async function sendNewOrderNotification({ orderRef, items, delivery, total, paymentMethod }) {
  if (!TO) return;
  const resend = getResend();
  const itemList = items.map(i => `<li>${i.name} × ${i.qty} — PKR ${(i.price * i.qty).toLocaleString()}</li>`).join('');

  await resend.emails.send({
    from: FROM,
    to: TO,
    subject: `🛍️ New Order — ${orderRef} | PKR ${total.toLocaleString()}`,
    html: `<body style="font-family:sans-serif;background:#111;color:#ccc;padding:32px;">
      <h2 style="color:#c9a84c;">🛍️ New Order — ${orderRef}</h2>
      <p><strong>Customer:</strong> ${delivery.fname} ${delivery.lname} (${delivery.email})</p>
      <p><strong>Phone:</strong> ${delivery.phone}</p>
      <p><strong>Address:</strong> ${delivery.address}, ${delivery.city}</p>
      <p><strong>Payment:</strong> ${paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod === 'bank_deposit' ? 'Bank Deposit' : paymentMethod}</p>
      <ul>${itemList}</ul>
      <p style="color:#c9a84c;font-size:1.2rem;"><strong>Total: PKR ${total.toLocaleString()}</strong></p>
    </body>`,
  });
}

/* ── Contact Form Notification (to store owner) ── */
async function sendContactNotification({ name, email, phone, subject, message }) {
  if (!TO) return;
  const resend = getResend();

  await resend.emails.send({
    from: FROM,
    to: TO,
    subject: `📬 Contact: ${subject || 'New Message'} — from ${name}`,
    html: `<body style="font-family:sans-serif;background:#111;color:#ccc;padding:32px;">
      <h2 style="color:#c9a84c;">New Contact Message</h2>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
      ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ''}
      <p><strong>Message:</strong></p>
      <blockquote style="border-left:3px solid #c9a84c;padding:12px 20px;background:#1a1a2a;">${message}</blockquote>
    </body>`,
  });
}

/* ── Newsletter Welcome ── */
async function sendNewsletterWelcome(email) {
  const resend = getResend();

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: '💛 Welcome to Velorra Jewelry',
    html: `<body style="margin:0;padding:40px;background:#0a0a0a;font-family:Georgia,serif;text-align:center;color:#ccc;">
      <h1 style="color:#c9a84c;">VELORRA <span style="color:#fff;">Jewelry</span></h1>
      <h2 style="color:#fff;">Welcome to the Circle 💛</h2>
      <p style="color:#888;">You're now part of Velorra Jewelry's exclusive circle. You'll be the first to know about new arrivals, fresh collections, and special offers.</p>
      <p style="color:#888;font-size:.85rem;margin-top:24px;">Questions? velorrajewelry@gmail.com</p>
    </body>`,
  });
}



/* ── Reply Email (to customer, from admin) ── */
async function sendReplyEmail({ to, customerName, originalMessage, replyText }) {
  const resend = getResend();
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Re: Your message to Velorra Jewelry`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:40px;background:#faf7f2;font-family:Georgia,serif;color:#2c1f14;">
      <h2 style="color:#b8883a;">Velorra <span style="color:#2c1f14;">Jewelry</span></h2>
      <p>Dear ${customerName || 'Valued Customer'},</p>
      <p style="line-height:1.8;">${replyText.replace(/\n/g, '<br>')}</p>
      <hr style="border:none;border-top:1px solid #e8d5b0;margin:24px 0;"/>
      <p style="color:#9a8070;font-size:.82rem;">Your original message:</p>
      <blockquote style="border-left:3px solid #b8883a;padding:10px 16px;background:#f5f0e8;color:#5a4030;font-size:.85rem;margin:8px 0;">
        ${originalMessage}
      </blockquote>
      <p style="color:#9a8070;font-size:.78rem;margin-top:24px;">
        Velorra Jewelry — hello@velorrajewelry.com
      </p>
    </body></html>`,
  });
}

/* ── Bulk Promotion Email (to all subscribers) ── */
async function sendBulkPromotion({ subscribers, subject, body, promoCode }) {
  const resend = getResend();
  const results = { sent: 0, failed: 0, errors: [] };

  for (const email of subscribers) {
    try {
      await resend.emails.send({
        from: FROM,
        to: email,
        subject,
        html: `<!DOCTYPE html><html><body style="margin:0;padding:40px;background:#faf7f2;font-family:Georgia,serif;color:#2c1f14;text-align:center;">
          <h2 style="color:#b8883a;letter-spacing:.15em;">VELORRA <span style="color:#2c1f14;">JEWELRY</span></h2>
          <hr style="border:none;border-top:1px solid #e8d5b0;margin:20px auto;width:80px;"/>
          <div style="max-width:520px;margin:0 auto;text-align:left;line-height:1.9;color:#5a4030;">
            ${body.replace(/\n/g, '<br>')}
          </div>
          ${promoCode ? `
          <div style="margin:32px auto;max-width:300px;border:1px solid #b8883a;padding:20px;text-align:center;background:#fff;">
            <p style="font-size:.65rem;letter-spacing:.3em;text-transform:uppercase;color:#9a8070;margin:0 0 10px;">Your Exclusive Code</p>
            <p style="font-family:monospace;font-size:1.6rem;color:#b8883a;font-weight:700;letter-spacing:.2em;margin:0;">${promoCode}</p>
          </div>` : ''}
          <p style="color:#9a8070;font-size:.72rem;margin-top:32px;">
            You're receiving this because you subscribed to Velorra Jewelry.<br/>
            <a href="https://velorra-vvp3.onrender.com/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}" 
               style="color:#b8883a;">Unsubscribe</a>
          </p>
        </body></html>`,
      });
      results.sent++;
      /* Small delay to avoid rate limiting */
      await new Promise(r => setTimeout(r, 120));
    } catch (err) {
      results.failed++;
      results.errors.push({ email, error: err.message });
    }
  }
  return results;
}

/* ── Send Invoice Email ── */
async function sendInvoiceEmail({ to, invoiceRef, customerName, pdfPath, liveOrder }) {
  const resend = getResend();
  if (!resend) return console.log('Resend missing. Simulated email to:', to);

  const fs = require('fs');
  const path = require('path');
  
  let attachments = [];
  if (pdfPath && fs.existsSync(pdfPath)) {
    const pdfData = fs.readFileSync(pdfPath);
    attachments = [
      {
        filename: `${invoiceRef}.pdf`,
        content: pdfData
      }
    ];
  }

  const store = require('./store');
  const company = store.settings?.company || { 
    name: 'Velorra Jewelry', 
    website: 'velorrajewelry.store', 
    email: 'velorrajewelry@gmail.com',
    phone: '+92 331 4978295',
    logoUrl: ''
  };

  let webUrl = company.website || 'https://velorrajewelry.store';
  if (!webUrl.startsWith('http')) webUrl = 'https://' + webUrl;

  const isCod = true; // For display purposes in this context, or we can pass it if we want. We'll just genericize or assume from the invoiceRef.
  const logoHtml = company.logoUrl 
    ? `<img src="${company.logoUrl}" alt="${company.name}" style="max-height: 45px; display: block; margin: 0 auto;">`
    : `<h1 style="color:#b8883a; font-family: Georgia, serif; font-size: 28px; margin: 0; font-weight: normal; letter-spacing: 2px;">${company.name.toUpperCase()}</h1>`;

  const oStatus = liveOrder?.status || 'Pending';
  const deliveryStatus = oStatus === 'Pending' ? 'Not Shipped' :
                         oStatus === 'Processing' ? 'Preparing Shipment' :
                         oStatus === 'Shipped' ? 'In Transit' :
                         oStatus === 'Delivered' ? 'Delivered' :
                         oStatus === 'Cancelled' ? 'Cancelled' : 'Not Shipped';
                         
  const advancePaid = Number(liveOrder?.advanceAmount) || 0;
  let pStatus = 'Unpaid';
  if (advancePaid > 0) {
    pStatus = advancePaid >= (liveOrder?.total || 0) ? 'Paid' : 'Partial (Advance)';
  } else if (liveOrder?.paymentMethod !== 'cod') {
    pStatus = 'Paid';
  }

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    .wrapper { width: 100%; max-width: 600px; margin: 0 auto; background-color: #0a0a0a; color: #ffffff; }
    .header { padding: 40px 20px; text-align: center; border-bottom: 2px solid #b8883a; }
    .content { padding: 40px 30px; }
    .title { font-size: 24px; color: #ffffff; margin-top: 0; font-weight: 600; margin-bottom: 10px; }
    .text { font-size: 14px; color: #cccccc; line-height: 1.6; margin-bottom: 30px; }
    
    .order-box { background-color: #1a1a1a; border: 1px solid #333333; padding: 25px; border-radius: 4px; margin-bottom: 30px; }
    .order-row { display: table; width: 100%; margin-bottom: 15px; }
    .order-row:last-child { margin-bottom: 0; }
    .order-col { display: table-cell; width: 50%; vertical-align: top; }
    .label { font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; display: block; }
    .value { font-size: 14px; color: #ffffff; font-weight: 500; display: block; }
    .value-gold { color: #b8883a; }
    
    .btn-container { text-align: center; margin: 30px 0; }
    .btn-primary { display: inline-block; padding: 14px 30px; background-color: transparent; color: #b8883a; text-decoration: none; border: 1px solid #b8883a; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; border-radius: 2px; }
    
    .footer { padding: 30px; text-align: center; border-top: 1px solid #333333; }
    .footer-links { font-size: 12px; color: #888888; margin-bottom: 20px; }
    .footer-links a { color: #888888; text-decoration: none; margin: 0 10px; }
    .copyright { font-size: 11px; color: #555555; margin: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      ${logoHtml}
    </div>
    
    <div class="content">
      <h2 class="title">Your Invoice is Ready!</h2>
      <div class="text">
        Dear ${customerName},<br><br>
        Thank you for shopping with ${company.name}. We've attached your invoice for your recent order.
      </div>
      
      <div class="order-box">
        <div class="order-row">
          <div class="order-col">
            <span class="label">Order Number</span>
            <span class="value">${invoiceRef}</span>
          </div>
          <div class="order-col">
            <span class="label">Order Status</span>
            <span class="value value-gold">${oStatus}</span>
          </div>
        </div>
        <div class="order-row" style="margin-top: 20px;">
          <div class="order-col">
            <span class="label">Payment Status</span>
            <span class="value">${pStatus}</span>
          </div>
          <div class="order-col">
            <span class="label">Delivery Status</span>
            <span class="value">${deliveryStatus}</span>
          </div>
        </div>
      </div>
      
      <div class="btn-container">
        <a href="https://velorra-vvp3.onrender.com/api/invoices/${invoiceRef}/download" class="btn-primary" style="background-color:#b8883a;color:#0a0a0a;margin-bottom:10px;display:block;">Download Invoice</a>
        <a href="${webUrl}" class="btn-primary" style="display:block;">View Store</a>
      </div>
    </div>
    
    <div class="footer">
      <div class="footer-links">
        <a href="${webUrl}">Website</a> | 
        <a href="mailto:${company.email}">Email</a> | 
        <a href="tel:${company.phone}">Phone</a>
      </div>
      <p class="copyright">&copy; ${new Date().getFullYear()} ${company.name}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;

  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your Invoice ${invoiceRef} | ${company.name}`,
    html: htmlContent,
    attachments
  });
}

module.exports = {
  sendOrderConfirmation,
  sendNewOrderNotification,
  sendContactNotification,
  sendNewsletterWelcome,
  sendReplyEmail,
  sendBulkPromotion,
  sendInvoiceEmail,
};

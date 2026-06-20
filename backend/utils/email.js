/* ============================================================
   VELORRA — Nodemailer Email Utility
   ============================================================ */
const nodemailer = require('nodemailer');

/* ── Create reusable transporter ── */
function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

/* ── Order Confirmation Email (to customer) ── */
async function sendOrderConfirmation({ to, orderRef, items, delivery, total, paymentMethod }) {
  const transporter = createTransporter();

  const itemRows = items.map(i =>
    `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;">${i.emoji || '🛍️'} ${i.name} × ${i.qty}</td>
      <td style="padding:10px 0;border-bottom:1px solid #2a2a2a;text-align:right;">PKR ${(i.price * i.qty).toLocaleString()}</td>
    </tr>`
  ).join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Order Confirmation — Velorra</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a1a,#111);padding:40px;text-align:center;border-bottom:1px solid #2a2a2a;">
            <h1 style="margin:0;color:#c9a84c;font-size:2rem;letter-spacing:0.08em;">Vel<span style="color:#fff;">orra</span></h1>
            <p style="color:#888;margin:8px 0 0;font-size:0.8rem;letter-spacing:0.15em;text-transform:uppercase;">Premium Fashion — Pakistan</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="color:#fff;margin:0 0 8px;">Order Confirmed ✓</h2>
            <p style="color:#888;margin:0 0 24px;">Thank you for shopping with Velorra, ${delivery.fname}! Your order has been placed successfully.</p>
            <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin-bottom:24px;">
              <p style="color:#c9a84c;margin:0 0 4px;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;">Order Reference</p>
              <p style="color:#fff;font-size:1.2rem;font-weight:bold;margin:0;">${orderRef}</p>
            </div>
            <!-- Items -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <th style="color:#c9a84c;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;text-align:left;padding-bottom:12px;border-bottom:1px solid #2a2a2a;">Item</th>
                <th style="color:#c9a84c;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;text-align:right;padding-bottom:12px;border-bottom:1px solid #2a2a2a;">Price</th>
              </tr>
              ${itemRows}
              <tr>
                <td style="padding:16px 0 0;color:#fff;font-weight:bold;">Total</td>
                <td style="padding:16px 0 0;color:#c9a84c;font-weight:bold;text-align:right;">PKR ${total.toLocaleString()}</td>
              </tr>
            </table>
            <!-- Delivery -->
            <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin-bottom:24px;">
              <p style="color:#c9a84c;margin:0 0 12px;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;">Delivering To</p>
              <p style="color:#fff;margin:0 0 4px;">${delivery.fname} ${delivery.lname}</p>
              <p style="color:#888;margin:0 0 4px;">${delivery.address}, ${delivery.city}, ${delivery.province || 'Pakistan'}</p>
              <p style="color:#888;margin:0;">${delivery.phone}</p>
            </div>
            <!-- Payment -->
            <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:8px;padding:20px;margin-bottom:32px;">
              <p style="color:#c9a84c;margin:0 0 8px;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;">Payment Method</p>
              <p style="color:#fff;margin:0;">${paymentMethod === 'cod' ? '💵 Cash on Delivery' : paymentMethod === 'card' ? '💳 Credit/Debit Card' : '📲 ' + paymentMethod}</p>
            </div>
            <p style="color:#888;font-size:0.85rem;line-height:1.6;">
              Standard delivery takes <strong style="color:#fff;">3–5 business days</strong>. Express Lahore delivery takes <strong style="color:#fff;">1–2 days</strong>. 
              For any questions, WhatsApp us or email <a href="mailto:hello@velorra.com" style="color:#c9a84c;">hello@velorra.com</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#0a0a0a;padding:24px;text-align:center;border-top:1px solid #2a2a2a;">
            <p style="color:#555;font-size:0.75rem;margin:0;">© 2025 Velorra. All rights reserved. Lahore, Pakistan.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from:    `"Velorra" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Order Confirmed — ${orderRef} | Velorra`,
    html,
  });
}

/* ── New Order Notification Email (to store owner) ── */
async function sendNewOrderNotification({ orderRef, items, delivery, total, paymentMethod }) {
  const transporter = createTransporter();

  const itemList = items.map(i => `• ${i.name} × ${i.qty} — PKR ${(i.price * i.qty).toLocaleString()}`).join('\n');

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:40px;background:#0a0a0a;font-family:monospace;color:#ccc;">
  <h2 style="color:#c9a84c;">🛍️ New Order Received — ${orderRef}</h2>
  <p><strong>Customer:</strong> ${delivery.fname} ${delivery.lname} (${delivery.email})</p>
  <p><strong>Phone:</strong> ${delivery.phone}</p>
  <p><strong>Address:</strong> ${delivery.address}, ${delivery.city}, ${delivery.province}</p>
  <p><strong>Payment:</strong> ${paymentMethod}</p>
  <p><strong>Items:</strong></p>
  <pre style="background:#111;padding:16px;border-radius:8px;">${itemList}</pre>
  <p><strong style="color:#c9a84c;">Total: PKR ${total.toLocaleString()}</strong></p>
  <p style="color:#888;">Login to the admin panel to update order status.</p>
</body>
</html>`;

  await transporter.sendMail({
    from:    `"Velorra Orders" <${process.env.EMAIL_USER}>`,
    to:      process.env.EMAIL_TO,
    subject: `🛍️ New Order — ${orderRef} | PKR ${total.toLocaleString()}`,
    html,
  });
}

/* ── Contact Form Notification (to store owner) ── */
async function sendContactNotification({ name, email, phone, subject, message }) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from:    `"Velorra Contact" <${process.env.EMAIL_USER}>`,
    to:      process.env.EMAIL_TO,
    subject: `📬 Contact Form: ${subject || 'New Message'} — from ${name}`,
    html: `
<body style="font-family:sans-serif;background:#111;color:#ccc;padding:32px;">
  <h2 style="color:#c9a84c;">New Contact Message</h2>
  <p><strong>Name:</strong> ${name}</p>
  <p><strong>Email:</strong> <a href="mailto:${email}" style="color:#c9a84c;">${email}</a></p>
  ${phone ? `<p><strong>Phone:</strong> ${phone}</p>` : ''}
  ${subject ? `<p><strong>Subject:</strong> ${subject}</p>` : ''}
  <p><strong>Message:</strong></p>
  <blockquote style="border-left:3px solid #c9a84c;padding:12px 20px;background:#1a1a1a;border-radius:4px;">${message}</blockquote>
</body>`,
  });
}

/* ── Welcome Email for Newsletter Subscriber ── */
async function sendNewsletterWelcome(email) {
  const transporter = createTransporter();

  await transporter.sendMail({
    from:    `"Velorra" <${process.env.EMAIL_USER}>`,
    to:      email,
    subject: '💛 Welcome to the Velorra Circle — Your 10% Discount Inside',
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:40px;background:#0a0a0a;font-family:'Georgia',serif;text-align:center;color:#ccc;">
  <h1 style="color:#c9a84c;">Vel<span style="color:#fff;">orra</span></h1>
  <h2 style="color:#fff;">Welcome to the Circle 💛</h2>
  <p style="color:#888;max-width:480px;margin:0 auto 24px;">You're now part of an exclusive group that gets early access to new arrivals, style tips, and members-only offers.</p>
  <div style="background:#1a1a1a;border:1px solid #c9a84c;border-radius:12px;padding:32px;display:inline-block;margin:24px auto;">
    <p style="color:#888;margin:0 0 8px;font-size:0.8rem;letter-spacing:0.15em;text-transform:uppercase;">Your Welcome Discount</p>
    <p style="color:#c9a84c;font-size:2.5rem;font-weight:bold;margin:0;letter-spacing:0.05em;">10% OFF</p>
    <p style="color:#555;font-size:0.8rem;margin:8px 0 0;">Applied automatically at checkout</p>
  </div>
  <p style="color:#888;font-size:0.85rem;">Questions? We're at <a href="mailto:hello@velorra.com" style="color:#c9a84c;">hello@velorra.com</a></p>
</body>
</html>`,
  });
}

module.exports = {
  sendOrderConfirmation,
  sendNewOrderNotification,
  sendContactNotification,
  sendNewsletterWelcome,
};

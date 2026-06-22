/* ============================================================
   VELORRA — Email Utility (Resend)
   ============================================================ */
const { Resend } = require('resend');

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = 'BKT Jewelry <onboarding@resend.dev>';
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
    subject: `Order Confirmed — ${orderRef} | BKT Jewelry`,
    html: `<!DOCTYPE html><html><body style="margin:0;padding:40px;background:#0a0a0a;font-family:Georgia,serif;color:#ccc;">
      <h1 style="color:#c9a84c;">BKT <span style="color:#fff;">Jewelry</span></h1>
      <h2 style="color:#fff;">Order Confirmed ✓</h2>
      <p>Thank you ${delivery.fname}! Your order <strong style="color:#c9a84c;">${orderRef}</strong> has been placed.</p>
      <table width="100%" style="margin:24px 0;">${itemRows}</table>
      <p><strong style="color:#c9a84c;">Total: PKR ${total.toLocaleString()}</strong></p>
      <p style="color:#888;">Delivering to: ${delivery.address}, ${delivery.city}</p>
      <p style="color:#888;">Payment: ${paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod}</p>
      <p style="color:#555;font-size:.8rem;">Questions? Email bktjewelryoperations@gmail.com</p>
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
      <p><strong>Payment:</strong> ${paymentMethod}</p>
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
    subject: '💛 Welcome to BKT Jewelry',
    html: `<body style="margin:0;padding:40px;background:#0a0a0a;font-family:Georgia,serif;text-align:center;color:#ccc;">
      <h1 style="color:#c9a84c;">BKT <span style="color:#fff;">Jewelry</span></h1>
      <h2 style="color:#fff;">Welcome to the Circle 💛</h2>
      <p style="color:#888;">You're now part of BKT Jewelry's exclusive circle. You'll be the first to know about new arrivals, fresh collections, and special offers.</p>
      <p style="color:#888;font-size:.85rem;margin-top:24px;">Questions? bktjewelryoperations@gmail.com</p>
    </body>`,
  });
}

module.exports = {
  sendOrderConfirmation,
  sendNewOrderNotification,
  sendContactNotification,
  sendNewsletterWelcome,
};

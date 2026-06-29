/* ============================================================
   VELORRA — Site Configuration
   Edit this file to update your WhatsApp number, social links, etc.
   ============================================================ */
const VELORRA_CONFIG = {
  /* ── WhatsApp ──
     Format: country code + number, no spaces, no +
     Example: Pakistan 0300-1234567 → '923001234567'          */
  whatsapp: {
    number:  '923314978295',          // ← REPLACE with your number
    message: 'Hi! I found you on Velorra Jewelry and I have a question.',
  },
  /* ── Social Media ──
     Replace these URLs with your actual profile links         */
  social: {
    instagram: 'https://www.instagram.com/velorrajewelry_/',   // ← your Instagram URL
    facebook:  'https://www.facebook.com/profile.php?id=61590913872614',    // ← your Facebook URL
    whatsapp:  '',                                    // auto-built from number above
    tiktok:    '',                                    // optional — leave blank to hide
  },
  /* ── Contact ── */
  contact: {
    email:    'velorrajewelry@gmail.com',
    phone:    '+92 331 4978295',
    location: 'Lahore, Punjab, Pakistan',
    hours:    'Monday – Saturday',
  },
};
/* Auto-build WhatsApp URL */
VELORRA_CONFIG.social.whatsapp =
  `https://wa.me/${VELORRA_CONFIG.whatsapp.number}` +
  `?text=${encodeURIComponent(VELORRA_CONFIG.whatsapp.message)}`;
/* Make globally available */
window.VELORRA_CONFIG = VELORRA_CONFIG;

/* ============================================================
   AUTO-FILL CONTACT DETAILS
   Any element with data-velorra="email" / "phone" / "location" / "hours"
   gets its text (and href, for <a> tags) filled in automatically from
   VELORRA_CONFIG.contact above. This means editing the contact block
   at the top of this file updates EVERY page at once — footers, the
   contact page, policy page, everywhere — no need to hunt through HTML
   files one by one.

   Usage in HTML:
     <span data-velorra="email"></span>
     <a href="#" data-velorra="email">velorrajewelry@gmail.com</a>   (href auto becomes mailto:)
     <span data-velorra="phone"></span>
     <a href="#" data-velorra="phone">+92 300 000 0000</a>     (href auto becomes tel:)
     <span data-velorra="location"></span>
     <span data-velorra="hours"></span>
   ============================================================ */
function applyVelorraContactInfo(root) {
  root = root || document;
  const c = VELORRA_CONFIG.contact;

  root.querySelectorAll('[data-velorra="email"]').forEach(el => {
    el.textContent = c.email;
    if (el.tagName === 'A') el.href = `mailto:${c.email}`;
  });
  root.querySelectorAll('[data-velorra="phone"]').forEach(el => {
    el.textContent = c.phone;
    if (el.tagName === 'A') el.href = `tel:${c.phone.replace(/\s+/g, '')}`;
  });
  root.querySelectorAll('[data-velorra="location"]').forEach(el => {
    el.textContent = c.location;
  });
  root.querySelectorAll('[data-velorra="hours"]').forEach(el => {
    el.textContent = c.hours;
  });
}
/* Run once the page loads */
document.addEventListener('DOMContentLoaded', () => applyVelorraContactInfo());
/* Expose globally so pages that inject HTML later (like policy.html)
   can re-run it on the newly added content */
window.applyVelorraContactInfo = applyVelorraContactInfo;

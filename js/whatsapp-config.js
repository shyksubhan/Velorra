/* ============================================================
   GOLNISÀ — Site Configuration
   Edit this file to update your WhatsApp number, social links, etc.
   ============================================================ */
const GOLNISÀ_CONFIG = {
  /* ── WhatsApp ──
     Format: country code + number, no spaces, no +
     Example: Pakistan 0300-1234567 → '923001234567'          */
  whatsapp: {
    number:  '923314978295',          // ← REPLACE with your number
    message: 'Hi! I found you on Golnisà and I have a question.',
  },
  /* ── Social Media ──
     Replace these URLs with your actual profile links         */
  social: {
    instagram: 'https://www.instagram.com/golnisa_/',   // ← your Instagram URL
    facebook:  'https://www.facebook.com/profile.php?id=61590913872614',    // ← your Facebook URL
    whatsapp:  '',                                    // auto-built from number above
    tiktok:    '',                                    // optional — leave blank to hide
  },
  /* ── Contact ── */
  contact: {
    email:    'golnisaqueries@gmail.com',
    phone:    '+92 331 4978295',
    location: 'Lahore, Punjab, Pakistan',
    hours:    'Monday – Saturday',
  },
};
/* Auto-build WhatsApp URL */
GOLNISÀ_CONFIG.social.whatsapp =
  `https://wa.me/${GOLNISÀ_CONFIG.whatsapp.number}` +
  `?text=${encodeURIComponent(GOLNISÀ_CONFIG.whatsapp.message)}`;
/* Make globally available */
window.GOLNISÀ_CONFIG = GOLNISÀ_CONFIG;

/* ============================================================
   AUTO-FILL CONTACT DETAILS
   Any element with data-golnisa="email" / "phone" / "location" / "hours"
   gets its text (and href, for <a> tags) filled in automatically from
   GOLNISÀ_CONFIG.contact above. This means editing the contact block
   at the top of this file updates EVERY page at once — footers, the
   contact page, policy page, everywhere — no need to hunt through HTML
   files one by one.

   Usage in HTML:
     <span data-golnisa="email"></span>
     <a href="#" data-golnisa="email">golnisaqueries@gmail.com</a>   (href auto becomes mailto:)
     <span data-golnisa="phone"></span>
     <a href="#" data-golnisa="phone">+92 300 000 0000</a>     (href auto becomes tel:)
     <span data-golnisa="location"></span>
     <span data-golnisa="hours"></span>
   ============================================================ */
function applyGolnisàContactInfo(root) {
  root = root || document;
  const c = GOLNISÀ_CONFIG.contact;

  root.querySelectorAll('[data-golnisa="email"]').forEach(el => {
    el.textContent = c.email;
    if (el.tagName === 'A') el.href = `mailto:${c.email}`;
  });
  root.querySelectorAll('[data-golnisa="phone"]').forEach(el => {
    el.textContent = c.phone;
    if (el.tagName === 'A') el.href = `tel:${c.phone.replace(/\s+/g, '')}`;
  });
  root.querySelectorAll('[data-golnisa="location"]').forEach(el => {
    el.textContent = c.location;
  });
  root.querySelectorAll('[data-golnisa="hours"]').forEach(el => {
    el.textContent = c.hours;
  });
}
/* Run once the page loads */
document.addEventListener('DOMContentLoaded', () => applyGolnisàContactInfo());
/* Expose globally so pages that inject HTML later (like policy.html)
   can re-run it on the newly added content */
window.applyGolnisàContactInfo = applyGolnisàContactInfo;

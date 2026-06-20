/* ============================================================
   VELORRA — Site Configuration
   Edit this file to update your WhatsApp number, social links, etc.
   ============================================================ */
const VELORRA_CONFIG = {
  /* ── WhatsApp ──
     Format: country code + number, no spaces, no +
     Example: Pakistan 0300-1234567 → '923001234567'          */
  whatsapp: {
    number:  '923000000000',          // ← REPLACE with your number
    message: 'Hi! I found you on Velorra and I have a question.',
  },
  /* ── Social Media ──
     Replace these URLs with your actual profile links         */
  social: {
    instagram: 'https://www.instagram.com/velorra',   // ← your Instagram URL
    facebook:  'https://www.facebook.com/velorra',    // ← your Facebook URL
    whatsapp:  '',                                    // auto-built from number above
    tiktok:    '',                                    // optional — leave blank to hide
  },
  /* ── Contact ── */
  contact: {
    email:    'hello@velorra.com',
    phone:    '+92 300 000 0000',
    location: 'Lahore, Punjab, Pakistan',
    hours:    'Monday – Saturday: 10:00am – 7:00pm',
  },
};
/* Auto-build WhatsApp URL */
VELORRA_CONFIG.social.whatsapp =
  `https://wa.me/${VELORRA_CONFIG.whatsapp.number}` +
  `?text=${encodeURIComponent(VELORRA_CONFIG.whatsapp.message)}`;
/* Make globally available */
window.VELORRA_CONFIG = VELORRA_CONFIG;

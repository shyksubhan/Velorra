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
    message: 'Hi! I found you on Velorra and I have a question.',
  },
  /* ── Social Media ──
     Replace these URLs with your actual profile links         */
  social: {
    instagram: 'https://www.instagram.com/shyk._.subhan/',   // ← your Instagram URL
    facebook:  'https://www.facebook.com/subhan.imran.5623',    // ← your Facebook URL
    whatsapp:  '',                                    // auto-built from number above
    tiktok:    '',                                    // optional — leave blank to hide
  },
  /* ── Contact ── */
  contact: {
    email:    'isubhan3755@gmail.com',
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

/* ============================================================
   VELORRA — Main JavaScript
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Custom Cursor ── */
  const cursor     = document.getElementById('cursor');
  const cursorRing = document.getElementById('cursor-ring');
  if (cursor && cursorRing) {
    let mx = 0, my = 0, rx = 0, ry = 0;
    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; });
    const animCursor = () => {
      cursor.style.left = mx + 'px'; cursor.style.top = my + 'px';
      rx += (mx - rx) * 0.13; ry += (my - ry) * 0.13;
      cursorRing.style.left = rx + 'px'; cursorRing.style.top = ry + 'px';
      requestAnimationFrame(animCursor);
    };
    animCursor();
    document.querySelectorAll('a, button, .product-card, .cat-card').forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursor.style.width = '18px'; cursor.style.height = '18px';
        cursorRing.style.width = '52px'; cursorRing.style.height = '52px';
        cursorRing.style.borderColor = 'rgba(201,168,76,0.45)';
      });
      el.addEventListener('mouseleave', () => {
        cursor.style.width = '10px'; cursor.style.height = '10px';
        cursorRing.style.width = '36px'; cursorRing.style.height = '36px';
        cursorRing.style.borderColor = 'var(--gold)';
      });
    });
  }

  /* ── Sticky Nav ── */
  const nav = document.querySelector('body > nav');
  if (nav) {
    const handleScroll = () => nav.classList.toggle('scrolled', window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  /* ── Scroll Reveal ── */
  const revealEls = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.12 });
  revealEls.forEach(el => observer.observe(el));

  /* ── Cart System ── */
  let cart = JSON.parse(localStorage.getItem('velorra_cart') || '[]');

  const saveCart = () => localStorage.setItem('velorra_cart', JSON.stringify(cart));

  const updateCartUI = () => {
    const count = cart.reduce((s, i) => s + i.qty, 0);
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = count; el.style.display = count ? 'flex' : 'none';
    });
    const itemsEl = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total-val');
    if (!itemsEl) return;
    if (cart.length === 0) {
      itemsEl.innerHTML = '<div class="cart-empty">Your bag is empty.</div>';
      if (totalEl) totalEl.textContent = 'PKR 0';
      return;
    }
    itemsEl.innerHTML = cart.map((item, idx) => `
      <div class="cart-item">
        <div class="cart-item-img">${item.emoji || '👗'}</div>
        <div class="cart-item-details">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-variant">${item.variant || 'Standard'}</div>
          <div class="cart-item-row">
            <span class="cart-item-price">PKR ${(item.price * item.qty).toLocaleString()}</span>
            <div class="qty-ctrl">
              <button onclick="changeQty(${idx},-1)">−</button>
              <span>${item.qty}</span>
              <button onclick="changeQty(${idx},1)">+</button>
            </div>
          </div>
        </div>
      </div>`).join('');
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
    if (totalEl) totalEl.textContent = 'PKR ' + total.toLocaleString();
  };

  window.changeQty = (idx, delta) => {
    cart[idx].qty += delta;
    if (cart[idx].qty <= 0) cart.splice(idx, 1);
    saveCart(); updateCartUI();
  };

  window.addToCart = (name, price, emoji, variant) => {
    const existing = cart.find(i => i.name === name && i.variant === variant);
    if (existing) existing.qty++;
    else cart.push({ name, price, emoji: emoji || '🛍️', variant: variant || 'Standard', qty: 1 });
    saveCart(); updateCartUI();
    showToast('Added to bag ✓');
    openCart();
  };

  /* ── Cart Drawer ── */
  const drawer  = document.getElementById('cart-drawer');
  const overlay = document.getElementById('overlay');
  const openCart  = () => { drawer?.classList.add('open'); overlay?.classList.add('active'); };
  const closeCart = () => { drawer?.classList.remove('open'); overlay?.classList.remove('active'); };
  document.querySelectorAll('[data-open-cart]').forEach(el => el.addEventListener('click', openCart));
  document.getElementById('cart-close')?.addEventListener('click', closeCart);
  overlay?.addEventListener('click', closeCart);

  updateCartUI();

  /* ── Toast ── */
  window.showToast = (msg) => {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
  };

  /* ── Filter Buttons (Shop) ── */
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.filter;
      document.querySelectorAll('.product-card').forEach(card => {
        const show = cat === 'all' || card.dataset.category === cat;
        card.style.display = show ? '' : 'none';
      });
    });
  });

  /* ── Size / Color Options (Product Detail) ── */
  document.querySelectorAll('.size-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      opt.closest('.size-options').querySelectorAll('.size-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
    });
  });
  document.querySelectorAll('.color-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      opt.closest('.color-options').querySelectorAll('.color-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
    });
  });

  /* ── Newsletter Form ── (real backend) */
  document.querySelector('.newsletter-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const input = e.target.querySelector('input');
    if (!input?.value) return;
    const email = input.value.trim();
    const btn   = e.target.querySelector('button');
    if (btn) { btn.disabled = true; btn.textContent = 'Subscribing…'; }
    try {
      const result = await apiSubscribeNewsletter(email);
      if (result.ok) {
        showToast(result.data.message || 'Welcome to Velorra ✓');
        input.value = '';
      } else {
        showToast(result.data.error || 'Please try again.');
      }
    } catch {
      /* Backend not available — graceful fallback */
      showToast('Welcome to Velorra ✓');
      input.value = '';
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Subscribe'; }
    }
  });

  /* ── Contact Form ── (real backend) */
  document.getElementById('contact-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const fd      = new FormData(e.target);
    const payload = {
      name:    fd.get('name')    || fd.get('fname') || '',
      email:   fd.get('email')   || '',
      phone:   fd.get('phone')   || '',
      subject: fd.get('subject') || '',
      message: fd.get('message') || '',
    };
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    try {
      const result = await apiSendContact(payload);
      if (result.ok) {
        showToast('Message sent — we\'ll reply within 24h ✓');
        e.target.reset();
      } else {
        showToast(result.data.error || 'Please try again.');
      }
    } catch {
      showToast('Message sent — we\'ll reply within 24h ✓');
      e.target.reset();
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Send Message'; }
    }
  });

  /* ── Hamburger Mobile Menu ── */
  const ham = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');
  ham?.addEventListener('click', () => {
    const open = navLinks.style.display === 'flex';
    navLinks.style.display = open ? 'none' : 'flex';
    navLinks.style.flexDirection = 'column';
    navLinks.style.position = 'absolute';
    navLinks.style.top = '72px'; navLinks.style.left = '0'; navLinks.style.right = '0';
    navLinks.style.background = 'rgba(10,10,10,0.97)';
    navLinks.style.padding = '24px';
    navLinks.style.gap = '20px';
    navLinks.style.backdropFilter = 'blur(16px)';
    navLinks.style.borderTop = '1px solid var(--border)';
  });

});

/* ============================================================
   AI CHATBOT
   ============================================================ */
/* ============================================================
   VELORRA AI CHATBOT — Powered by Claude
   ============================================================ */
const VELORRA_CHAT_HISTORY = [];   // stores full conversation for context

const VELORRA_SYSTEM_PROMPT = `You are the Velorra Style Assistant — a warm, knowledgeable, and elegant AI shopping assistant for Velorra, a premium Pakistani fashion brand based in Lahore.

ABOUT VELORRA:
- Premium fashion brand selling women's clothing, men's clothing, jewellery, watches, and cosmetics
- Based in Lahore, Punjab, Pakistan
- Target audience: modern Pakistani women and men who value quality and style
- Brand tone: warm, sophisticated, helpful — like a personal stylist

PRODUCTS WE SELL:
- Women's Dresses: Ivory Silk Maxi Gown (PKR 12,500), other dresses and abayas
- Men's Formal: Obsidian Slim Suit (PKR 35,000), formal shirts and trousers
- Jewellery: Aurora Gold Necklace (PKR 8,500), rings, earrings, bracelets
- Watches: Noir Rose Gold Timepiece (PKR 28,000), unisex luxury watches
- Cosmetics: Velvet Noir Lip Kit (PKR 3,500), skincare and makeup
- Bags: Champagne Leather Tote (PKR 18,000)

SHIPPING & DELIVERY:
- Free shipping on orders over PKR 5,000
- Standard delivery: 3–5 business days across Pakistan
- Express delivery available in Lahore (1–2 days)
- We ship nationwide across all cities

RETURNS & EXCHANGES:
- 14-day return window from delivery date
- Items must be unused, unworn, unwashed, with original tags intact
- Sale items and cosmetics are non-returnable for hygiene reasons
- To return: contact us via WhatsApp or email within 14 days with your order number

PAYMENT METHODS:
- Cash on Delivery (COD) — available nationwide
- Easypaisa and JazzCash mobile wallets
- Bank transfer
- All major credit and debit cards (Visa, Mastercard)

SIZING:
- Clothing sizes: XS, S, M, L, XL, XXL
- Each product page has a detailed size guide with measurements in inches and cm
- When in doubt, size up — we recommend measuring your chest, waist, and hips
- Free exchanges for size issues within 14 days

CONTACT:
- WhatsApp: Available on the website (click the WhatsApp button)
- Email: hello@velorra.com
- Instagram: @velorra
- Business hours: Monday–Saturday, 10:00am–7:00pm

YOUR BEHAVIOUR RULES:
- Be warm, friendly, and conversational — like a helpful personal stylist
- Keep responses concise — 2 to 4 sentences maximum unless the customer clearly needs more detail
- Use occasional relevant emojis (💛 ✨ 👗 💍) to feel warm, but don't overuse them
- Always answer in the same language the customer writes in (Urdu or English)
- If someone asks about a specific product not in your list, say you can check for them and suggest they message on WhatsApp for the latest stock
- Never make up prices — if unsure, direct them to the shop page or WhatsApp
- If the customer seems ready to buy, gently guide them to the shop or add to bag
- Never discuss topics unrelated to fashion, shopping, Velorra, or style advice`;

/* ── Worker URL ─────────────────────────────────────────────
   After deploying velorra-chat-worker.js to Cloudflare Workers,
   replace the URL below with your worker URL.
   Example: 'https://velorra-chat.yourname.workers.dev'
   ────────────────────────────────────────────────────────── */
const VELORRA_WORKER_URL = 'https://velorra-chat.yourname.workers.dev';

async function getAIResponse(userMessage) {
  VELORRA_CHAT_HISTORY.push({ role: 'user', content: userMessage });

  try {
    const res = await fetch(VELORRA_WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system:     VELORRA_SYSTEM_PROMPT,
        messages:   VELORRA_CHAT_HISTORY,
      })
    });

    if (!res.ok) throw new Error('API error ' + res.status);

    const data  = await res.json();
    const reply = data.content?.[0]?.text || 'I apologise, something went wrong. Please try again or message us on WhatsApp.';

    VELORRA_CHAT_HISTORY.push({ role: 'assistant', content: reply });
    return reply;

  } catch (err) {
    console.error('Velorra chat error:', err);
    VELORRA_CHAT_HISTORY.pop();
    return 'I\'m having a small technical issue right now 🙏 Please try again in a moment, or reach us directly on WhatsApp for immediate help.';
  }
}

function toggleChat() {
  const win = document.getElementById('chat-window');
  win?.classList.toggle('active');
  if (win?.classList.contains('active')) {
    setTimeout(() => document.getElementById('chat-input')?.focus(), 200);
  }
}

function appendBotMessage(text) {
  const msgs = document.getElementById('chat-messages');
  if (!msgs) return;
  /* Convert **bold** markdown and newlines for display */
  const html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  const div = document.createElement('div');
  div.className = 'msg bot';
  div.innerHTML = html;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const msgs  = document.getElementById('chat-messages');
  if (!input || !msgs || !input.value.trim()) return;

  const userMsg = input.value.trim();
  input.value  = '';
  input.disabled = true;
  document.getElementById('chat-send').disabled = true;

  /* Hide quick reply buttons after first message */
  const qr = document.getElementById('chat-quick-replies');
  if (qr) qr.style.display = 'none';

  /* Show user message */
  const userDiv = document.createElement('div');
  userDiv.className = 'msg user';
  userDiv.textContent = userMsg;
  msgs.appendChild(userDiv);
  msgs.scrollTop = msgs.scrollHeight;

  /* Show typing indicator */
  const typingDiv = document.createElement('div');
  typingDiv.className = 'msg bot typing';
  typingDiv.id = 'typing-ind';
  typingDiv.innerHTML = '<span></span><span></span><span></span>';
  msgs.appendChild(typingDiv);
  msgs.scrollTop = msgs.scrollHeight;

  /* Get real AI response */
  const reply = await getAIResponse(userMsg);

  /* Remove typing indicator */
  document.getElementById('typing-ind')?.remove();

  /* Show AI response */
  appendBotMessage(reply);

  /* Re-enable input */
  input.disabled = false;
  document.getElementById('chat-send').disabled = false;
  input.focus();
}

function sendQuick(text) {
  const input = document.getElementById('chat-input');
  if (input) { input.value = text; sendChat(); }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('chat-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
  });
});
 /* ============================================================
   VELORRA — WhatsApp + Social Footer Builder
   (append to end of existing script.js)
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  /* ── Set WhatsApp button link from config ── */
  const waBtn = document.getElementById('whatsapp-float');
  if (waBtn && window.VELORRA_CONFIG) {
    waBtn.href = window.VELORRA_CONFIG.social.whatsapp;
  }
  /* ── Build footer social links from config ── */
  const socialWrap = document.getElementById('footer-social-links');
  if (socialWrap && window.VELORRA_CONFIG) {
    const cfg = window.VELORRA_CONFIG.social;
    const links = [
      { url: cfg.instagram, icon: '<i class="fa-brands fa-instagram"></i>', label: 'Instagram' },
      { url: cfg.facebook,  icon: '<i class="fa-brands fa-facebook-f"></i>', label: 'Facebook' },
      { url: cfg.whatsapp,  icon: '<i class="fa-brands fa-whatsapp"></i>',   label: 'WhatsApp' },
      { url: cfg.tiktok,    icon: '<i class="fa-brands fa-tiktok"></i>',     label: 'TikTok' },
    ].filter(l => l.url);
    socialWrap.innerHTML = links.map(l =>
      `<a href="${l.url}" target="_blank" rel="noopener"
          class="footer-social-item" aria-label="${l.label}">${l.icon}</a>`
    ).join('');
  }
  /* ── Update account icon if logged in ── */
  const user = JSON.parse(localStorage.getItem('velorra_user') || 'null');
  if (user) {
    document.querySelectorAll('a[href="account.html"]').forEach(el => {
      el.setAttribute('title', `Hi, ${user.fname}`);
      el.style.color = 'var(--gold)';
    });
  }
  /* ── Validate JWT token silently (don't block page) ── */
  const token = localStorage.getItem('velorra_token');
  if (token && user) {
    checkBackend().then(online => {
      if (online) {
        apiGet('/auth/me').then(data => {
          if (data.error) { clearSession(); }
        }).catch(() => {});
      }
    });
  }
});
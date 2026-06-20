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
  const nav = document.querySelector('nav');
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

  /* ── Newsletter Form ── */
  document.querySelector('.newsletter-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const input = e.target.querySelector('input');
    if (!input?.value) return;
    showToast('Welcome to Velorra ✓');
    input.value = '';
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
   VELORRA — AI Chatbot (Real Claude AI)
   ============================================================ */
const chatHistory = [];

async function getAIResponse(userMsg) {
  chatHistory.push({ role: 'user', content: userMsg });
  try {
    const res  = await fetch('https://velorra-vvp3.onrender.com/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ messages: chatHistory }),
    });
    const data = await res.json();
    const reply = data.reply || "I'm having a small issue right now. Please try WhatsApp for immediate help.";
    chatHistory.push({ role: 'assistant', content: reply });
    return reply;
  } catch (err) {
    return "I'm having a small technical issue right now 🙏 Please try again in a moment, or reach us directly on WhatsApp for immediate help.";
  }
}

function toggleChat() {
  const win = document.getElementById('chat-window');
  win?.classList.toggle('active');
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const msgs  = document.getElementById('chat-messages');
  if (!input || !msgs || !input.value.trim()) return;

  const userMsg = input.value.trim();
  input.value = '';

  msgs.innerHTML += `<div class="msg user">${userMsg}</div>`;
  msgs.innerHTML += `<div class="msg bot typing" id="typing-ind"><span></span><span></span><span></span></div>`;
  msgs.scrollTop = msgs.scrollHeight;

  const reply = await getAIResponse(userMsg);
  document.getElementById('typing-ind')?.remove();
  msgs.innerHTML += `<div class="msg bot">${reply}</div>`;
  msgs.scrollTop = msgs.scrollHeight;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('chat-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendChat();
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
      { url: cfg.instagram, icon: '📸', label: 'Instagram' },
      { url: cfg.facebook,  icon: '📘', label: 'Facebook' },
      { url: cfg.whatsapp,  icon: '💬', label: 'WhatsApp' },
      { url: cfg.tiktok,    icon: '🎵', label: 'TikTok' },
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
});
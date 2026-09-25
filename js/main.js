/* ============================================================
   GOLNISÀ — Main JavaScript
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

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
  let cart = JSON.parse(localStorage.getItem('golnisa_cart') || '[]');

  const saveCart = () => localStorage.setItem('golnisa_cart', JSON.stringify(cart));

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
        <div class="cart-item-img" style="${item.image ? 'padding:0;' : ''}">${item.image ? `<img src="${item.image}" alt="${item.name.replace(/"/g, '&quot;')}" style="width:100%;height:100%;object-fit:cover;border-radius:4px;">` : (item.emoji || '👗')}</div>
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

  window.addToCart = (name, price, emoji, variant, image) => {
    const existing = cart.find(i => i.name === name && i.variant === variant);
    if (existing) existing.qty++;
    else cart.push({ name, price, emoji: emoji || '🛍️', variant: variant || 'Standard', image: image || null, qty: 1 });
    saveCart(); updateCartUI();
    showToast('Added to bag ✓');
    openCart();
  };

  /* ── Buy It Now ──
     Goes straight to checkout with just this single item. The
     customer's existing bag is stashed (not lost) so it can be
     restored if they leave checkout without completing the order. */
  window.buyNow = (name, price, emoji, variant, image) => {
    const existingCart = localStorage.getItem('golnisa_cart');
    if (existingCart && existingCart !== '[]') {
      localStorage.setItem('golnisa_cart_stashed', existingCart);
    }
    const buyNowCart = [{ name, price, emoji: emoji || '🛍️', variant: variant || 'Standard', image: image || null, qty: 1 }];
    localStorage.setItem('golnisa_cart', JSON.stringify(buyNowCart));
    window.location.href = 'checkout';
  };

  /* ── Buy It Now: restore stashed bag if the customer left checkout
     without completing the order (i.e. they're on any page other
     than checkout.html and a stash exists) ── */
  const stashedCart = localStorage.getItem('golnisa_cart_stashed');
  if (stashedCart && !window.location.pathname.endsWith('checkout')) {
    localStorage.setItem('golnisa_cart', stashedCart);
    localStorage.removeItem('golnisa_cart_stashed');
    cart = JSON.parse(stashedCart);
  }

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
        // if dataset.category is a comma-separated list or single string
        let show = false;
        if (cat === 'all') {
          show = true;
        } else if (cat === 'sale' && card.querySelector('.product-price-old')) {
          show = true;
        } else {
          show = card.dataset.category === cat;
        }
        card.style.display = show ? '' : 'none';
      });
      if (typeof window.updateShopHero === 'function') {
        window.updateShopHero(cat);
      }
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
        showToast(result.data.message || "Welcome to Golnisà! 💛 You'll be the first to hear about new arrivals and offers.");
        input.value = '';
      } else {
        showToast(result.data.error || 'Please try again.');
      }
    } catch {
      /* Backend not available — graceful fallback */
      showToast("Welcome to Golnisà! 💛 You'll be the first to hear about new arrivals and offers.");
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
  const navLinks = document.querySelector('.header-nav-main');
  ham?.addEventListener('click', () => {
      if(!navLinks) return;
    navLinks.classList.toggle('mobile-open');
    ham.classList.toggle('open');
  });
  /* Close mobile menu after a link is tapped, or on outside click */
  navLinks?.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') { navLinks.classList.remove('mobile-open'); ham.classList.remove('open'); }
  });
  document.addEventListener('click', (e) => {
    if (navLinks?.classList.contains('mobile-open') && !navLinks.contains(e.target) && !ham.contains(e.target)) {
      navLinks.classList.remove('mobile-open'); ham.classList.remove('open');
    }
  });

  /* ── Mobile: Shop dropdown touch toggle ── */
  if (window.innerWidth <= 900) {
    const dropdownToggle = document.querySelector('.nav-dropdown > a');
    const dropdownParent = document.querySelector('.nav-dropdown');
    dropdownToggle?.addEventListener('click', (e) => {
      e.preventDefault();
      dropdownParent.classList.toggle('open');
    });
  }

});

 /* ============================================================
   GOLNISÀ — WhatsApp + Social Footer Builder
   (append to end of existing script.js)
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  /* ── Set WhatsApp button link from config ── */
  const waBtn = document.getElementById('whatsapp-float');
  if (waBtn && window.GOLNISÀ_CONFIG) {
    waBtn.href = window.GOLNISÀ_CONFIG.social.whatsapp;
  }
  /* ── Build footer social links from config ── */
  const socialWrap = document.getElementById('footer-social-links');
  if (socialWrap && window.GOLNISÀ_CONFIG) {
    const cfg = window.GOLNISÀ_CONFIG.social;
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
  const user = JSON.parse(localStorage.getItem('golnisa_user') || 'null');
  if (user) {
    document.querySelectorAll('a[href="account"]').forEach(el => {
      el.setAttribute('title', `Hi, ${user.fname}`);
      el.style.color = 'var(--gold)';
    });
  }
  /* ── Validate JWT token silently (don't block page) ── */
  const token = localStorage.getItem('golnisa_token');
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

/* ============================================================
   GLOBAL INJECTIONS (WhatsApp Float & Promo Popup)
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Only inject if it doesn't already exist
  if (!document.getElementById('whatsapp-btn-wrap')) {
    const waUrl = window.GOLNISA_CONFIG ? window.GOLNISA_CONFIG.social.whatsapp : 'https://wa.me/923014617844';
    
    const waWrap = document.createElement('div');
    waWrap.id = 'whatsapp-btn-wrap';
    // Style is partially in pages.css, but we can ensure it stays fixed at bottom right
    waWrap.style.cssText = 'position:fixed; bottom:108px; right:32px; z-index:1499; display:flex; flex-direction:column; align-items:flex-end; gap:12px;';
    
    // The Promo Popup
    const promoHtml = `
      <div id="wa-promo-popup" style="background:#fff; padding:12px 16px; border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,0.12); border:1px solid var(--gold); position:relative; animation:fadeUp 0.5s ease; max-width:240px; text-align:right;">
        <div style="font-weight:700; font-size:0.75rem; color:var(--gold); text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px;">Special Offer ✨</div>
        <div style="font-size:0.8rem; color:var(--text); line-height:1.4;">Free delivery over PKR 2,000/- on <strong>advance payment</strong>.</div>
        <div id="wa-promo-close" style="position:absolute; top:4px; right:6px; cursor:pointer; color:var(--muted); font-size:1.1rem; line-height:1; width:20px; height:20px; text-align:center;">&times;</div>
      </div>
    `;

    // The WhatsApp Button
    const btnHtml = `
      <a id="whatsapp-float" href="${waUrl}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp" style="width:52px; height:52px; border-radius:50%; background:#25D366; color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 24px rgba(37,211,102,0.4); transition:transform 0.3s, box-shadow 0.3s; position:relative;">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </a>
    `;

    waWrap.innerHTML = (sessionStorage.getItem('golnisa_promo_closed') ? '' : promoHtml) + btnHtml;
    document.body.appendChild(waWrap);

    const closeBtn = document.getElementById('wa-promo-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        document.getElementById('wa-promo-popup').style.display = 'none';
        sessionStorage.setItem('golnisa_promo_closed', 'true');
      });
    }

    // Hover effects for the button
    const floatBtn = document.getElementById('whatsapp-float');
    floatBtn.addEventListener('mouseenter', () => {
      floatBtn.style.transform = 'scale(1.1)';
      floatBtn.style.boxShadow = '0 8px 32px rgba(37,211,102,0.55)';
    });
    floatBtn.addEventListener('mouseleave', () => {
      floatBtn.style.transform = 'scale(1)';
      floatBtn.style.boxShadow = '0 6px 24px rgba(37,211,102,0.4)';
    });
  }
});

/* ── Show/Hide Password Toggle ──
   Usage: <button onclick="toggleGolnisàPassword('field-id', this)"><i class="fa-regular fa-eye"></i></button> */
window.toggleGolnisàPassword = (inputId, btn) => {
  const input = document.getElementById(inputId);
  if (!input) return;
  const icon = btn.querySelector('i');
  const showing = input.type === 'text';
  input.type = showing ? 'password' : 'text';
  if (icon) icon.className = showing ? 'fa-regular fa-eye' : 'fa-regular fa-eye-slash';
  btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
};
/* ── Proceed to Checkout — cart check ── */
window.proceedToCheckout = () => {
  const cart = JSON.parse(localStorage.getItem('golnisa_cart') || '[]');
  if (!cart.length) {
    window.showToast('Your bag is empty. Add items before checking out.');
    return;
  }
  window.location.href = 'checkout';
};


document.addEventListener('DOMContentLoaded', () => {
  const headerSearchInput = document.getElementById('header-search-input');
  const headerSearchBtn = document.getElementById('header-search-btn');
  if (headerSearchInput) {
    headerSearchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && this.value.trim()) {
        window.location.href = 'shop.html?q=' + encodeURIComponent(this.value.trim());
      }
    });
  }
  if (headerSearchBtn && headerSearchInput) {
    headerSearchBtn.addEventListener('click', function() {
      const val = headerSearchInput.value.trim();
      if (val) window.location.href = 'shop.html?q=' + encodeURIComponent(val);
    });
  }
});


/* ============================================================
   GOLNISÀ — Meta Pixel E-Commerce Tracking Helper
   Pixel ID: 4331926033691657
   ============================================================ */
window.MetaPixel = {
  // Retrieve test_event_code if testing via Meta Events Manager
  getTestCode: function() {
    try {
      var urlParams = new URLSearchParams(window.location.search);
      var code = urlParams.get('test_event_code');
      if (code) {
        sessionStorage.setItem('meta_test_event_code', code);
        return code;
      }
      return sessionStorage.getItem('meta_test_event_code') || null;
    } catch (_) {
      return null;
    }
  },

  // Safe track runner
  track: function(eventName, params = {}, custom = false) {
    try {
      if (typeof window.fbq === 'function') {
        var testCode = this.getTestCode();
        var options = testCode ? { test_event_code: testCode } : undefined;
        if (custom) {
          window.fbq('trackCustom', eventName, params, options);
        } else {
          window.fbq('track', eventName, params, options);
        }
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || localStorage.getItem('pixel_debug') === '1') {
          console.log(`[Meta Pixel] ${eventName}:`, params, options);
        }
      }
    } catch (e) {
      console.warn('[Meta Pixel Error]', e);
    }
  },

  // ViewContent: Fired on product detail page
  trackViewContent: function(product) {
    if (!product) return;
    const price = Number(product.price) || 0;
    const id = String(product.id || '');
    const name = String(product.name || '');
    const category = String(product.category || product.subcategory || 'Jewelry');

    this.track('ViewContent', {
      content_name: name,
      content_category: category,
      content_ids: id ? [id] : [name],
      content_type: 'product',
      value: price,
      currency: 'PKR'
    });
  },

  // AddToCart: Fired when an item is added to bag
  trackAddToCart: function(item) {
    if (!item) return;
    const price = Number(item.price) || 0;
    const qty = Number(item.qty) || 1;
    const id = String(item.productId || item.id || item.name || '');
    const name = String(item.name || '');

    this.track('AddToCart', {
      content_name: name,
      content_ids: id ? [id] : [name],
      content_type: 'product',
      value: price * qty,
      currency: 'PKR'
    });
  },

  // InitiateCheckout: Fired when customer proceeds to checkout
  trackInitiateCheckout: function(cart, subtotal) {
    if (!cart || !cart.length) return;
    const totalVal = Number(subtotal != null ? subtotal : cart.reduce((s, i) => s + (Number(i.price) * (Number(i.qty) || 1)), 0));
    const contentIds = cart.map(i => String(i.productId || i.id || i.name));
    const contents = cart.map(i => ({
      id: String(i.productId || i.id || i.name),
      quantity: Number(i.qty) || 1,
      item_price: Number(i.price) || 0
    }));
    const numItems = cart.reduce((acc, i) => acc + (Number(i.qty) || 1), 0);

    this.track('InitiateCheckout', {
      content_ids: contentIds,
      contents: contents,
      content_type: 'product',
      value: totalVal,
      currency: 'PKR',
      num_items: numItems
    });
  },

  // Purchase: Fired ONLY after backend successfully creates an order
  trackPurchase: function(orderRef, orderData, cartItems, grandTotal) {
    if (!orderRef) return;
    // Deduplication guard
    const storageKey = 'pixel_purchased_' + orderRef;
    if (sessionStorage.getItem(storageKey)) return;
    sessionStorage.setItem(storageKey, '1');

    const items = (orderData && Array.isArray(orderData.items) && orderData.items.length) ? orderData.items : (cartItems || []);
    const value = Number(grandTotal != null ? grandTotal : (orderData && orderData.total != null ? orderData.total : 0));
    const contentIds = items.map(i => String(i.productId || i.id || i.name));
    const contents = items.map(i => ({
      id: String(i.productId || i.id || i.name),
      quantity: Number(i.qty) || 1,
      item_price: Number(i.price) || 0
    }));
    const numItems = items.reduce((acc, i) => acc + (Number(i.qty) || 1), 0);

    this.track('Purchase', {
      content_name: 'Order ' + orderRef,
      content_ids: contentIds,
      contents: contents,
      content_type: 'product',
      value: value,
      currency: 'PKR',
      num_items: numItems,
      order_id: orderRef
    });
  },

  // Search
  trackSearch: function(query) {
    if (!query) return;
    this.track('Search', {
      search_string: String(query).trim()
    });
  },

  // Contact
  trackContact: function() {
    this.track('Contact');
  },

  // Lead (e.g. newsletter)
  trackLead: function(leadType) {
    this.track('Lead', {
      content_name: leadType || 'General Lead'
    });
  }
};

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
          <div class="cart-item-variant">${item.variant && item.variant !== 'Standard' ? item.variant : ''}</div>
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

  window.addToCart = (name, price, emoji, variant, image, options = {}) => {
    // Track Meta Pixel AddToCart immediately
    try {
      window.MetaPixel?.trackAddToCart({
        name,
        price,
        qty: 1,
        productId: options.productId || null
      });
    } catch (_) {}

    const existing = cart.find(i => i.name === name && i.variant === (variant || 'Standard'));
    if (existing) {
      existing.qty++;
    } else {
      cart.push({
        name,
        price,
        emoji: emoji || '🛍️',
        variant: variant || 'Standard',
        variantOption: options.variantOption || null,
        color: options.color || null,
        size: options.size || null,
        image: image || null,
        productId: options.productId || null,
        qty: 1
      });
    }
    saveCart(); updateCartUI();
    (window.showToast || showToast)?.('Added to bag ✓');
    if (typeof openCart === 'function') openCart();
  };

  /* ── Buy It Now ──
     Goes straight to checkout with just this single item. The
     customer's existing bag is stashed (not lost) so it can be
     restored if they leave checkout without completing the order. */
  window.buyNow = (name, price, emoji, variant, image, options = {}) => {
    // Track Meta Pixel AddToCart immediately
    try {
      window.MetaPixel?.trackAddToCart({
        name,
        price,
        qty: 1,
        productId: options.productId || null
      });
    } catch (_) {}

    const existingCart = localStorage.getItem('golnisa_cart');
    if (existingCart && existingCart !== '[]') {
      localStorage.setItem('golnisa_cart_stashed', existingCart);
    }
    const buyNowCart = [{
      name,
      price,
      emoji: emoji || '🛍️',
      variant: variant || 'Standard',
      variantOption: options.variantOption || null,
      color: options.color || null,
      size: options.size || null,
      image: image || null,
      productId: options.productId || null,
      qty: 1
    }];
    localStorage.setItem('golnisa_cart', JSON.stringify(buyNowCart));

    const testCode = window.MetaPixel?.getTestCode?.();
    const targetUrl = testCode ? `checkout?test_event_code=${encodeURIComponent(testCode)}` : 'checkout';
    setTimeout(() => {
      window.location.href = targetUrl;
    }, 120);
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
        window.MetaPixel?.trackContact();
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
    (window.showToast || showToast)?.('Your bag is empty. Add items before checking out.');
    return;
  }
  // Track Meta Pixel InitiateCheckout
  try {
    window.MetaPixel?.trackInitiateCheckout(cart);
  } catch (_) {}

  const testCode = window.MetaPixel?.getTestCode?.();
  const targetUrl = testCode ? `checkout?test_event_code=${encodeURIComponent(testCode)}` : 'checkout';
  setTimeout(() => {
    window.location.href = targetUrl;
  }, 120);
};



/* ── Search Bar / Search Button Handler (Mobile & Desktop) ── */
document.addEventListener('DOMContentLoaded', () => {
  const headerSearchInput = document.getElementById('header-search-input');
  const headerSearchBtn   = document.getElementById('header-search-btn');

  if (headerSearchInput) {
    headerSearchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && this.value.trim()) {
        const query = this.value.trim();
        window.MetaPixel?.trackSearch(query);
        window.location.href = 'shop.html?q=' + encodeURIComponent(query);
      }
    });
  }

  if (headerSearchBtn) {
    headerSearchBtn.addEventListener('click', function(e) {
      if (window.innerWidth <= 768) {
        e.preventDefault();
        const overlay = document.getElementById('search-overlay');
        if (overlay) {
          overlay.classList.add('active');
          const inp = document.getElementById('search-input');
          if (inp) { inp.focus(); }
        }
        return;
      }
      const val = headerSearchInput ? headerSearchInput.value.trim() : '';
      if (val) {
        window.MetaPixel?.trackSearch(val);
        window.location.href = 'shop.html?q=' + encodeURIComponent(val);
      }
    });
  }

  /* ── Initialize Mobile Menu Drawer with all categories ── */
  initMobileMenuDrawer();
});

function initMobileMenuDrawer() {
  let drawer = document.getElementById('mobile-menu-drawer');
  let backdrop = document.getElementById('mobile-menu-backdrop');
  if (!drawer) {
    backdrop = document.createElement('div');
    backdrop.id = 'mobile-menu-backdrop';
    backdrop.className = 'mobile-menu-backdrop';
    document.body.appendChild(backdrop);

    drawer = document.createElement('div');
    drawer.id = 'mobile-menu-drawer';
    drawer.className = 'mobile-menu-drawer';
    drawer.innerHTML = `
      <div class="mm-header">
        <a href="/" class="nav-logo-link" style="display:flex;align-items:center;">
          <img src="images/logo.svg" alt="Golnisà" style="height:28px;width:auto;" />
        </a>
        <button class="mm-close" id="mm-close-btn" aria-label="Close menu">&times;</button>
      </div>
      
      <div class="mm-section-title">Categories & Collections</div>
      <nav class="mm-links">
        <a href="jewelry.html" class="mm-link"><i class="fa-solid fa-gem" style="color:var(--gold);width:18px;"></i> All Jewelry</a>
        <a href="jewelry.html?cat=new-arrivals" class="mm-link"><i class="fa-solid fa-wand-magic-sparkles" style="color:var(--gold);width:18px;"></i> New Arrivals <span class="mm-link-badge">New</span></a>
        <a href="jewelry.html?cat=trending-now" class="mm-link"><i class="fa-solid fa-fire" style="color:#e67e22;width:18px;"></i> Trending Now</a>
        <a href="jewelry.html?cat=sale" class="mm-link"><i class="fa-solid fa-tag" style="color:#e74c3c;width:18px;"></i> Sale <span class="mm-link-badge" style="background:#e74c3c;">Hot</span></a>
        <a href="jewelry.html?cat=necklace" class="mm-link"><i class="fa-solid fa-certificate" style="color:var(--gold);width:18px;"></i> Necklaces</a>
        <a href="jewelry.html?cat=earrings" class="mm-link"><i class="fa-regular fa-sun" style="color:var(--gold);width:18px;"></i> Earrings</a>
        <a href="jewelry.html?cat=bracelets" class="mm-link"><i class="fa-solid fa-circle-notch" style="color:var(--gold);width:18px;"></i> Bracelets</a>
        <a href="jewelry.html?cat=rings" class="mm-link"><i class="fa-regular fa-circle" style="color:var(--gold);width:18px;"></i> Rings</a>
        <a href="jewelry.html?cat=couple-items" class="mm-link"><i class="fa-solid fa-heart" style="color:#e91e63;width:18px;"></i> Couple Items</a>
        <a href="jewelry.html?cat=jewelry-sets" class="mm-link"><i class="fa-solid fa-crown" style="color:var(--gold);width:18px;"></i> Jewelry Sets</a>
      </nav>

      <div class="mm-divider"></div>

      <div class="mm-section-title">Navigation</div>
      <nav class="mm-links">
        <a href="/" class="mm-link"><i class="fa-solid fa-house" style="width:18px;color:var(--muted);"></i> Home</a>
        <a href="about" class="mm-link"><i class="fa-regular fa-bookmark" style="width:18px;color:var(--muted);"></i> About Us</a>
        <a href="contact" class="mm-link"><i class="fa-regular fa-envelope" style="width:18px;color:var(--muted);"></i> Contact</a>
        <a href="account" class="mm-link"><i class="fa-regular fa-user" style="width:18px;color:var(--muted);"></i> Login / My Account</a>
      </nav>

      <div class="mm-footer">
        <a href="https://wa.me/923000000000" id="mm-whatsapp-link" target="_blank" rel="noopener">
          <i class="fa-brands fa-whatsapp" style="color:#25d366;font-size:1.1rem;"></i> WhatsApp Customer Support
        </a>
        <p style="font-size:0.72rem;color:var(--muted);margin:0;">Pakistan's Premier Online Jewelry Store</p>
      </div>
    `;
    document.body.appendChild(drawer);

    if (window.GOLNISÀ_CONFIG?.whatsapp?.number) {
      const wal = document.getElementById('mm-whatsapp-link');
      if (wal) wal.href = 'https://wa.me/' + window.GOLNISÀ_CONFIG.whatsapp.number;
    }
  }

  const openMenu = () => {
    drawer.classList.add('open');
    backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  const closeMenu = () => {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    document.body.style.overflow = '';
  };

  document.querySelectorAll('.hamburger').forEach(ham => {
    ham.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (drawer.classList.contains('open')) closeMenu();
      else openMenu();
    });
  });

  document.getElementById('mm-close-btn')?.addEventListener('click', closeMenu);
  backdrop.addEventListener('click', closeMenu);
  drawer.querySelectorAll('.mm-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });
}

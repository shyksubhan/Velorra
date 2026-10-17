/* ============================================================
   GOLNISÀ — Single-Page Checkout Logic
   ============================================================ */

function toast(msg, type) { window.showToast?.(msg, type); }

document.addEventListener('DOMContentLoaded', () => {
  let appliedCoupon = null; /* { code, type, value } */

  const computeDiscount = (subtotal) => {
    if (!appliedCoupon) return 0;
    let d = appliedCoupon.type === 'percent'
      ? Math.round(subtotal * (appliedCoupon.value / 100))
      : appliedCoupon.value;
    return Math.min(d, subtotal);
  };

  const getSelectedPayment = () =>
    document.querySelector('input[name="payment"]:checked')?.value || 'cod';

  const getDeliveryFee = (subtotal, paymentMethod) => {
    if (paymentMethod === 'bank_deposit') return subtotal >= 2000 ? 0 : 200;
    return subtotal >= 5000 ? 0 : 200;
  };

  /* ── Populate summary sidebar ── */
  const renderSummary = () => {
    const cart = JSON.parse(localStorage.getItem('golnisa_cart') || '[]');
    const itemsEl = document.getElementById('ck-summary-items');
    const subtotalEl = document.getElementById('ck-subtotal');
    const totalEl    = document.getElementById('ck-total');
    const delivEl    = document.getElementById('ck-delivery-fee');
    if (!itemsEl) return;

    if (cart.length === 0) {
      itemsEl.innerHTML = '<p style="color:var(--muted);font-size:.8rem">Your bag is empty.</p>';
      if (subtotalEl) subtotalEl.textContent = 'PKR 0';
      if (delivEl) delivEl.textContent = 'FREE';
      if (totalEl) totalEl.textContent = 'PKR 0';
      return;
    }

    itemsEl.innerHTML = cart.map(item => `
      <div class="ck-item">
        <span class="ck-item-emoji" style="${item.image ? 'display:flex;align-items:center;justify-content:center;' : ''}">
          ${item.image ? `<img src="${item.image}" alt="${item.name.replace(/"/g, '&quot;')}" style="width:36px;height:45px;object-fit:cover;border-radius:4px;">` : (item.emoji || '🛍️')}
        </span>
        <div class="ck-item-info">
          <span class="ck-item-name">${item.name}</span>
          ${item.variant && item.variant !== 'Standard' ? `<span class="ck-item-variant" style="font-size:0.75rem;color:var(--gold);display:block;margin:1px 0;">${item.variant}</span>` : ''}
          <span class="ck-item-qty">Qty: ${item.qty}</span>
        </div>
        <span class="ck-item-price">PKR ${(item.price * item.qty).toLocaleString()}</span>
      </div>`).join('');

    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const payMethod = getSelectedPayment();
    const delivery = getDeliveryFee(subtotal, payMethod);
    const discount = computeDiscount(subtotal);

    const discountRow = document.getElementById('ck-discount-row');
    if (discountRow) discountRow.style.display = discount > 0 ? 'flex' : 'none';
    const discountEl = document.getElementById('ck-discount');
    if (discountEl) discountEl.textContent = '− PKR ' + discount.toLocaleString();

    if (subtotalEl) subtotalEl.textContent  = 'PKR ' + subtotal.toLocaleString();
    if (delivEl)    delivEl.textContent     = delivery === 0 ? 'FREE' : 'PKR ' + delivery.toLocaleString();
    if (totalEl)    totalEl.textContent     = 'PKR ' + Math.max(0, subtotal - discount + delivery).toLocaleString();
  };

  renderSummary();

  // Track InitiateCheckout on checkout page load (with session deduplication)
  const cartForInit = JSON.parse(localStorage.getItem('golnisa_cart') || '[]');
  if (cartForInit.length > 0 && !sessionStorage.getItem('pixel_initiate_checkout_page')) {
    sessionStorage.setItem('pixel_initiate_checkout_page', '1');
    const subtotal = cartForInit.reduce((s, i) => s + (Number(i.price) * (Number(i.qty) || 1)), 0);
    window.MetaPixel?.trackInitiateCheckout(cartForInit, subtotal);
  }

  /* ── Payment method toggle ── */
  document.querySelectorAll('input[name="payment"]').forEach(r => {
    r.addEventListener('change', () => {
      const bf = document.getElementById('bank-deposit-fields');
      if (bf) bf.style.display = r.value === 'bank_deposit' ? 'block' : 'none';
      renderSummary();
    });
  });

  /* ── Coupon apply/clear ── */
  const couponInput    = document.getElementById('ck-coupon-input');
  const couponApplyBtn = document.getElementById('ck-coupon-apply-btn');
  const couponMsgEl    = document.getElementById('ck-coupon-msg');

  couponInput?.addEventListener('input', () => {
    couponInput.value = couponInput.value.toUpperCase();
    if (appliedCoupon) {
      appliedCoupon = null;
      if (couponMsgEl) couponMsgEl.style.display = 'none';
      renderSummary();
    }
  });

  couponApplyBtn?.addEventListener('click', async () => {
    const code = couponInput?.value.trim();
    if (!code) return;
    const cart = JSON.parse(localStorage.getItem('golnisa_cart') || '[]');
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

    const origLabel = couponApplyBtn.textContent;
    couponApplyBtn.textContent = '…';
    couponApplyBtn.disabled = true;

    try {
      const result = await apiValidateCoupon(code, subtotal);
      if (result.ok && result.data.valid) {
        appliedCoupon = { code: result.data.code, type: result.data.type, value: result.data.value };
        if (couponMsgEl) {
          couponMsgEl.style.color = 'var(--gold)';
          couponMsgEl.textContent = `✓ "${result.data.code}" applied — ${result.data.type === 'percent' ? result.data.value + '% off' : 'PKR ' + result.data.value.toLocaleString() + ' off'}`;
          couponMsgEl.style.display = 'block';
        }
      } else {
        appliedCoupon = null;
        if (couponMsgEl) {
          couponMsgEl.style.color = '#c0392b';
          couponMsgEl.textContent = result.data?.error || 'Invalid coupon code.';
          couponMsgEl.style.display = 'block';
        }
      }
    } catch {
      appliedCoupon = null;
      if (couponMsgEl) {
        couponMsgEl.style.color = '#c0392b';
        couponMsgEl.textContent = 'Network error — could not check coupon.';
        couponMsgEl.style.display = 'block';
      }
    }

    couponApplyBtn.textContent = origLabel;
    couponApplyBtn.disabled = false;
    renderSummary();
  });

  /* ── Auto-fill form if customer is logged in ── */
  const loggedInUser = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
  if (loggedInUser) {
    const nameEl = document.getElementById('ck-name');
    const emailEl = document.getElementById('ck-email');
    const phoneEl = document.getElementById('ck-phone');
    if (nameEl && !nameEl.value) {
      nameEl.value = `${loggedInUser.fname || ''} ${loggedInUser.lname || ''}`.trim();
    }
    if (emailEl && !emailEl.value && loggedInUser.email) emailEl.value = loggedInUser.email;
    if (phoneEl && !phoneEl.value && loggedInUser.phone) phoneEl.value = loggedInUser.phone;
  }

  /* ── Real-time non-blocking abandoned checkout save ── */
  const recordAbandoned = () => {
    const name    = document.getElementById('ck-name')?.value.trim();
    const phone   = document.getElementById('ck-phone')?.value.trim();
    const email   = document.getElementById('ck-email')?.value.trim();
    const address = document.getElementById('ck-address')?.value.trim();
    const city    = document.getElementById('ck-city')?.value.trim();
    if (!phone && !email) return;

    const cart = JSON.parse(localStorage.getItem('golnisa_cart') || '[]');
    if (!cart.length) return;
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

    const parts = (name || '').split(/\s+/);
    const fname = parts[0] || '';
    const lname = parts.slice(1).join(' ') || '';

    const existingId = sessionStorage.getItem('golnisa_abandoned_id');
    fetch(`${GOLNISÀ_API}/abandoned`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: existingId || null,
        delivery: { name, fname, lname, phone, email, address, city },
        items: cart.map(i => ({ ...i })),
        total: subtotal,
      }),
      keepalive: true,
    }).then(r => r.json()).then(data => {
      if (data?.id) sessionStorage.setItem('golnisa_abandoned_id', data.id);
    }).catch(() => {});
  };

  ['ck-name', 'ck-phone', 'ck-email', 'ck-city', 'ck-address'].forEach(id => {
    document.getElementById(id)?.addEventListener('blur', recordAbandoned);
  });

  /* ── Show "send screenshot to WhatsApp" note on success ── */
  const showBankDepositSuccessNote = (payMethod, orderRef) => {
    const note = document.getElementById('order-success-bank-note');
    if (!note) return;
    if (payMethod !== 'bank_deposit') { note.style.display = 'none'; return; }
    const num = window.GOLNISÀ_CONFIG?.whatsapp?.number;
    const msg = encodeURIComponent(`Hi! I just placed order ${orderRef} on Golnisà and paid via Bank Deposit. Here is my payment screenshot:`);
    note.innerHTML = `
      <p style="font-size:.85rem;color:var(--muted);margin-bottom:12px">
        Please send a screenshot of your payment to our WhatsApp so we can confirm and ship your order.
      </p>
      <a href="https://wa.me/${num}?text=${msg}" target="_blank" rel="noopener" class="btn-whatsapp">
        <i class="fa-brands fa-whatsapp"></i> Send Payment Screenshot
      </a>`;
    note.style.display = 'block';
  };

  /* ── Single-Step Form Submission / Place Order ── */
  const form = document.getElementById('single-checkout-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    await window.placeOrder();
  });

  window.placeOrder = async () => {
    const btn = document.getElementById('ck-place-order-btn');
    const cart = JSON.parse(localStorage.getItem('golnisa_cart') || '[]');
    if (!cart.length) {
      toast('Your bag is empty. Please add items before checking out.', 'error');
      return;
    }

    const fullName = document.getElementById('ck-name')?.value.trim();
    const phone    = document.getElementById('ck-phone')?.value.trim();
    const email    = document.getElementById('ck-email')?.value.trim();
    const address  = document.getElementById('ck-address')?.value.trim();
    const city     = document.getElementById('ck-city')?.value.trim();
    const notes    = document.getElementById('ck-notes')?.value.trim() || '';

    if (!fullName) { toast('Please enter your full name.', 'error'); document.getElementById('ck-name')?.focus(); return; }
    if (!phone)    { toast('Please enter your phone number.', 'error'); document.getElementById('ck-phone')?.focus(); return; }
    if (!email)    { toast('Please enter your email address.', 'error'); document.getElementById('ck-email')?.focus(); return; }
    if (!city)     { toast('Please enter your city.', 'error'); document.getElementById('ck-city')?.focus(); return; }
    if (!address)  { toast('Please enter your complete street address.', 'error'); document.getElementById('ck-address')?.focus(); return; }

    const nameParts = fullName.split(/\s+/);
    const fname = nameParts[0] || fullName;
    const lname = nameParts.slice(1).join(' ') || '';

    const delivery = {
      name: fullName,
      fname: fname,
      lname: lname,
      phone: phone,
      email: email,
      city: city,
      address: address,
      notes: notes,
      delivery: 'standard'
    };

    const payMethod = getSelectedPayment();

    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner" style="display:inline-block;width:18px;height:18px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:8px;"></span> Placing Order…';
    }

    try {
      const result = await apiPlaceOrder({
        items:          cart,
        delivery:       delivery,
        paymentMethod:  payMethod,
        deliveryMethod: 'standard',
        couponCode:     appliedCoupon?.code || null,
      });

      if (result.ok) {
        /* Order placed successfully — mark abandoned record converted */
        const abId = sessionStorage.getItem('golnisa_abandoned_id');
        if (abId) {
          fetch(`${GOLNISÀ_API}/abandoned/${abId}/converted`, { method: 'PATCH' }).catch(() => {});
          sessionStorage.removeItem('golnisa_abandoned_id');
        }

        const ref = result.data.orderRef;
        const finalOrder = result.data.order;
        const orderTotal = Number(finalOrder?.total != null ? finalOrder.total : Math.max(0, subtotal - discount + fee));

        // Fire Meta Pixel Purchase Event ONLY after backend order confirmation
        window.MetaPixel?.trackPurchase(ref, finalOrder, cart, orderTotal);

        document.getElementById('order-ref-num').textContent = 'Order Reference: ' + ref;
        showBankDepositSuccessNote(payMethod, ref);
        localStorage.removeItem('golnisa_cart');
        localStorage.removeItem('golnisa_cart_stashed');

        document.getElementById('ck-main-panel')?.classList.add('hidden');
        document.getElementById('ck-panel-success')?.classList.remove('hidden');
        const summaryCol = document.getElementById('checkout-summary-sidebar');
        if (summaryCol) summaryCol.style.display = 'none';

        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast(result.data?.error || 'Failed to place order. Please try again.', 'error');
        if (btn) { btn.disabled = false; btn.innerHTML = '<span>Place Order ✓</span>'; }
      }
    } catch (err) {
      console.warn('Backend unavailable, using fallback:', err);
      const abId = sessionStorage.getItem('golnisa_abandoned_id');
      if (abId) { fetch(`${GOLNISÀ_API}/abandoned/${abId}/converted`, { method: 'PATCH' }).catch(() => {}); sessionStorage.removeItem('golnisa_abandoned_id'); }
      const ref = 'VLR-' + Date.now().toString().slice(-8);
      document.getElementById('order-ref-num').textContent = 'Order Reference: ' + ref;
      showBankDepositSuccessNote(payMethod, ref);
      localStorage.removeItem('golnisa_cart');
      localStorage.removeItem('golnisa_cart_stashed');
      document.getElementById('ck-main-panel')?.classList.add('hidden');
      document.getElementById('ck-panel-success')?.classList.remove('hidden');
      const summaryCol = document.getElementById('checkout-summary-sidebar');
      if (summaryCol) summaryCol.style.display = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  /* ── Bank Deposit: copy to clipboard ── */
  document.querySelectorAll('.bank-copy-val').forEach(el => {
    el.addEventListener('click', () => {
      const val = el.dataset.copy;
      if (!val) return;
      navigator.clipboard?.writeText(val).then(() => {
        toast('Copied: ' + val, 'success');
      }).catch(() => {});
    });
  });

  /* ── Bank Deposit: WhatsApp screenshot link ── */
  const waBtn = document.getElementById('bank-whatsapp-btn');
  if (waBtn && window.GOLNISÀ_CONFIG) {
    const num = window.GOLNISÀ_CONFIG.whatsapp?.number;
    const msg = encodeURIComponent('Hi! I just placed an order on Golnisà and paid via Bank Deposit. Here is my payment screenshot:');
    waBtn.href = `https://wa.me/${num}?text=${msg}`;
  }

  /* ── Backward compatibility stub ── */
  window.goToStep = () => {};

  /* ── Three.js background particles ── */
  initCheckoutThree();
});

function initCheckoutThree() {
  const canvas = document.getElementById('checkout-canvas');
  if (!canvas || typeof THREE === 'undefined') return;
  const scene    = new THREE.Scene();
  const camera   = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
  camera.position.z = 8;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  const count = 180;
  const pos   = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i*3]   = (Math.random()-0.5)*20;
    pos[i*3+1] = (Math.random()-0.5)*14;
    pos[i*3+2] = (Math.random()-0.5)*10;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color: 0xc9a84c, size: 0.04, transparent: true, opacity: 0.55 });
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  const clock = new THREE.Clock();
  (function animate() {
    requestAnimationFrame(animate);
    pts.rotation.y = clock.getElapsedTime() * 0.04;
    pts.rotation.x = clock.getElapsedTime() * 0.02;
    renderer.render(scene, camera);
  })();
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

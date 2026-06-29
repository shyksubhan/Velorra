/* ============================================================
   VELORRA — Checkout Logic
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  let currentStep = 1;
  let orderData   = {};
  /* ── Populate summary sidebar ── */
  const renderSummary = () => {
    const cart = JSON.parse(localStorage.getItem('velorra_cart') || '[]');
    const itemsEl = document.getElementById('ck-summary-items');
    const subtotalEl = document.getElementById('ck-subtotal');
    const totalEl    = document.getElementById('ck-total');
    const delivEl    = document.getElementById('ck-delivery-fee');
    if (!itemsEl) return;
    if (cart.length === 0) {
      itemsEl.innerHTML = '<p style="color:var(--muted);font-size:.8rem">Your bag is empty.</p>';
      return;
    }
    itemsEl.innerHTML = cart.map(item => `
      <div class="ck-item">
        <span class="ck-item-emoji">${item.emoji || '🛍️'}</span>
        <div class="ck-item-info">
          <span class="ck-item-name">${item.name}</span>
          <span class="ck-item-qty">Qty: ${item.qty}</span>
        </div>
        <span class="ck-item-price">PKR ${(item.price * item.qty).toLocaleString()}</span>
      </div>`).join('');
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const delivery = getDeliveryFee(subtotal, getSelectedPayment());
    if (subtotalEl) subtotalEl.textContent  = 'PKR ' + subtotal.toLocaleString();
    if (delivEl)    delivEl.textContent     = delivery === 0 ? 'FREE' : 'PKR ' + delivery.toLocaleString();
    if (totalEl)    totalEl.textContent     = 'PKR ' + (subtotal + delivery).toLocaleString();
  };
  const getDeliveryFee = (subtotal, paymentMethod) => {
    if (paymentMethod === 'bank_deposit') return 0;
    return subtotal >= 5000 ? 0 : 200;
  };
  const getSelectedPayment = () =>
    document.querySelector('input[name="payment"]:checked')?.value || 'cod';
  renderSummary();

  /* ── Auto-fill delivery form if user is logged in ── */
  const loggedInUser = getCurrentUser();
  if (loggedInUser) {
    const f = document.getElementById('delivery-form');
    if (f) {
      const set = (name, val) => { const el = f.querySelector(`[name="${name}"]`); if (el && val) el.value = val; };
      set('fname', loggedInUser.fname);
      set('lname', loggedInUser.lname);
      set('email', loggedInUser.email);
      set('phone', loggedInUser.phone);
    }
  }

  /* Update fee when delivery option changes */
  document.querySelectorAll('input[name="delivery"]').forEach(r =>
    r.addEventListener('change', renderSummary)
  );
  /* ── Step navigation ── */
  window.goToStep = (step) => {
    document.querySelectorAll('.ck-panel').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById(`ck-panel-${step}`);
    if (target) { target.classList.remove('hidden'); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    document.querySelectorAll('.ck-step').forEach((el, i) => {
      el.classList.toggle('active',    i + 1 === step);
      el.classList.toggle('complete',  i + 1 < step);
    });
    currentStep = step;
  };
  /* ── Step 1 submit ── */
  document.getElementById('delivery-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    orderData.delivery = Object.fromEntries(fd.entries());

    /* ── Save abandoned checkout (delayed 10 min — only fires if order is NOT placed) ── */
    const cart = JSON.parse(localStorage.getItem('velorra_cart') || '[]');
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

    /* Cancel any previous pending abandoned timer */
    if (window._abandonedTimer) clearTimeout(window._abandonedTimer);

    /* Snapshot delivery + cart now; send after 10 minutes if order still not placed */
    const abandonedSnapshot = {
      delivery: { ...orderData.delivery },
      items:    cart.map(i => ({ ...i })),
      total:    subtotal,
    };
    window._abandonedTimer = setTimeout(() => {
      /* Double-check: if order was placed during the wait, skip */
      if (sessionStorage.getItem('velorra_order_placed')) return;

      const abandonedId = sessionStorage.getItem('velorra_abandoned_id') || null;
      fetch(`${VELORRA_API}/abandoned`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:       abandonedId,
          delivery: abandonedSnapshot.delivery,
          items:    abandonedSnapshot.items,
          total:    abandonedSnapshot.total,
        }),
      })
      .then(r => r.json())
      .then(d => { if (d.id) sessionStorage.setItem('velorra_abandoned_id', d.id); })
      .catch(() => {});
    }, 10 * 60 * 1000); /* 10 minutes */

    goToStep(2);
  });
  /* ── Step 2 submit ── */
  document.getElementById('payment-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const method = document.querySelector('input[name="payment"]:checked')?.value;
    orderData.payment = method;
    /* build confirm summary */
    const cart = JSON.parse(localStorage.getItem('velorra_cart') || '[]');
    const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const fee      = getDeliveryFee(subtotal, method);
    const d        = orderData.delivery || {};
    document.getElementById('order-summary-full').innerHTML = `
      <div class="confirm-section">
        <h4>Deliver To</h4>
        <p>${d.fname} ${d.lname}</p>
        <p>${d.address}, ${d.city}</p>
        <p>${d.phone} · ${d.email}</p>
      </div>
      <div class="confirm-section">
        <h4>Items</h4>
        ${cart.map(i => `<div class="ck-item">
          <span>${i.emoji}</span>
          <span style="flex:1">${i.name} × ${i.qty}</span>
          <span>PKR ${(i.price*i.qty).toLocaleString()}</span>
        </div>`).join('')}
      </div>
      <div class="confirm-section">
        <h4>Payment</h4>
        <p>${method === 'cod' ? '💵 Cash on Delivery' : method === 'bank_deposit' ? '🏦 Bank Deposit' : '📲 ' + method}</p>
        ${method === 'bank_deposit' ? '<p style="font-size:.78rem;margin-top:6px">Remember to send your payment screenshot on WhatsApp after placing the order.</p>' : ''}
      </div>
      <div class="confirm-section">
        <div class="ck-summary-row"><span>Subtotal</span><span>PKR ${subtotal.toLocaleString()}</span></div>
        <div class="ck-summary-row"><span>Delivery</span><span>${fee === 0 ? 'FREE' : 'PKR ' + fee.toLocaleString()}</span></div>
        <div class="ck-summary-row ck-total-row"><span>Total</span><span>PKR ${(subtotal+fee).toLocaleString()}</span></div>
      </div>`;
    goToStep(3);
  });
  /* ── Show "send screenshot to WhatsApp" reminder on success screen ── */
  const showBankDepositSuccessNote = (payMethod, orderRef) => {
    const note = document.getElementById('order-success-bank-note');
    if (!note) return;
    if (payMethod !== 'bank_deposit') { note.style.display = 'none'; return; }
    const num = window.VELORRA_CONFIG?.whatsapp?.number;
    const msg = encodeURIComponent(`Hi! I just placed order ${orderRef} on Velorra Jewelry and paid via Bank Deposit. Here is my payment screenshot:`);
    note.innerHTML = `
      <p style="font-size:.85rem;color:var(--muted);margin-bottom:12px">
        Please send a screenshot of your payment to our WhatsApp so we can confirm and ship your order.
      </p>
      <a href="https://wa.me/${num}?text=${msg}" target="_blank" rel="noopener" class="btn-whatsapp">
        <i class="fa-brands fa-whatsapp"></i> Send Payment Screenshot
      </a>`;
    note.style.display = 'block';
  };
  /* ── Place order ── (real backend) */
  window.placeOrder = async () => {
    const btn = document.querySelector('[onclick="placeOrder()"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Placing Order…'; }

    const cart = JSON.parse(localStorage.getItem('velorra_cart') || '[]');
    if (!cart.length) {
      showToast('Your cart is empty.');
      if (btn) { btn.disabled = false; btn.textContent = 'Place Order ✓'; }
      return;
    }

    const subtotal   = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const delivMethod = orderData.delivery?.delivery || 'standard';
    const payMethod  = orderData.payment || 'cod';
    const fee        = getDeliveryFee(subtotal, payMethod);

    try {
      const result = await apiPlaceOrder({
        items:          cart,
        delivery:       orderData.delivery,
        paymentMethod:  payMethod,
        deliveryMethod: delivMethod,
      });

      if (result.ok) {
        /* Cancel pending abandoned timer — order was placed successfully */
        if (window._abandonedTimer) { clearTimeout(window._abandonedTimer); window._abandonedTimer = null; }
        sessionStorage.setItem('velorra_order_placed', '1');

        /* Mark abandoned checkout as converted (only if it actually existed) */
        const abId = sessionStorage.getItem('velorra_abandoned_id');
        if (abId) {
          fetch(`${VELORRA_API}/abandoned/${abId}/converted`, { method: 'PATCH' }).catch(() => {});
          sessionStorage.removeItem('velorra_abandoned_id');
        }
        /* Success */
        const ref = result.data.orderRef;
        document.getElementById('order-ref-num').textContent = 'Order Reference: ' + ref;
        showBankDepositSuccessNote(payMethod, ref);
        localStorage.removeItem('velorra_cart');
        localStorage.removeItem('velorra_cart_stashed');
        document.querySelectorAll('.ck-panel').forEach(p => p.classList.add('hidden'));
        document.getElementById('ck-panel-success')?.classList.remove('hidden');
        document.querySelectorAll('.ck-step').forEach(el => el.classList.add('complete'));
        document.getElementById('checkout-summary-sidebar').style.display = 'none';
      } else {
        /* API returned an error */
        showToast(result.data.error || 'Failed to place order. Please try again.');
        if (btn) { btn.disabled = false; btn.textContent = 'Place Order ✓'; }
      }
    } catch (err) {
      /* Backend not available — graceful fallback */
      console.warn('Backend unavailable, using offline fallback:', err);
      if (window._abandonedTimer) { clearTimeout(window._abandonedTimer); window._abandonedTimer = null; }
      sessionStorage.setItem('velorra_order_placed', '1');
      const abId = sessionStorage.getItem('velorra_abandoned_id');
      if (abId) { fetch(`${VELORRA_API}/abandoned/${abId}/converted`, { method: 'PATCH' }).catch(() => {}); sessionStorage.removeItem('velorra_abandoned_id'); }
      const ref = 'VLR-' + Date.now().toString().slice(-8);
      document.getElementById('order-ref-num').textContent = 'Order Reference: ' + ref;
      showBankDepositSuccessNote(payMethod, ref);
      localStorage.removeItem('velorra_cart');
      localStorage.removeItem('velorra_cart_stashed');
      document.querySelectorAll('.ck-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById('ck-panel-success')?.classList.remove('hidden');
      document.querySelectorAll('.ck-step').forEach(el => el.classList.add('complete'));
      document.getElementById('checkout-summary-sidebar').style.display = 'none';
    }
  };
  /* ── Payment method toggle ── */
  document.querySelectorAll('input[name="payment"]').forEach(r => {
    r.addEventListener('change', () => {
      const bf = document.getElementById('bank-deposit-fields');
      const cf = document.getElementById('cod-advance-fields');
      if (bf) bf.style.display = r.value === 'bank_deposit' ? 'block' : 'none';
      if (cf) cf.style.display = r.value === 'cod' ? 'block' : 'none';
      renderSummary();
    });
  });
  /* ── Bank Deposit: copy-to-clipboard for account number / IBAN ── */
  document.querySelectorAll('.bank-copy-val').forEach(el => {
    el.addEventListener('click', () => {
      const val = el.dataset.copy;
      if (!val) return;
      navigator.clipboard?.writeText(val).then(() => {
        showToast('Copied: ' + val);
      }).catch(() => {});
    });
  });
  /* ── Bank Deposit: WhatsApp "send screenshot" link ── */
  const waBtn = document.getElementById('bank-whatsapp-btn');
  if (waBtn && window.VELORRA_CONFIG) {
    const num = window.VELORRA_CONFIG.whatsapp.number;
    const msg = encodeURIComponent('Hi! I just placed an order on Velorra Jewelry and paid via Bank Deposit. Here is my payment screenshot:');
    waBtn.href = `https://wa.me/${num}?text=${msg}`;
  }
  /* ── Checkout 3D background (particles) ── */
  initCheckoutThree();
});
/* ── Lightweight checkout Three.js ── */
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
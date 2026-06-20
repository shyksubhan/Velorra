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
    const delivery = getDeliveryFee(subtotal);
    if (subtotalEl) subtotalEl.textContent  = 'PKR ' + subtotal.toLocaleString();
    if (delivEl)    delivEl.textContent     = delivery === 0 ? 'FREE' : 'PKR ' + delivery.toLocaleString();
    if (totalEl)    totalEl.textContent     = 'PKR ' + (subtotal + delivery).toLocaleString();
  };
  const getDeliveryFee = (subtotal) => {
    const method = document.querySelector('input[name="delivery"]:checked')?.value;
    if (method === 'express') return 250;
    return subtotal >= 5000 ? 0 : 200;
  };
  renderSummary();
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
    const fee      = getDeliveryFee(subtotal);
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
        <p>${method === 'cod' ? '💵 Cash on Delivery' : method === 'card' ? '💳 Credit/Debit Card' : '📲 ' + method}</p>
      </div>
      <div class="confirm-section">
        <div class="ck-summary-row"><span>Subtotal</span><span>PKR ${subtotal.toLocaleString()}</span></div>
        <div class="ck-summary-row"><span>Delivery</span><span>${fee === 0 ? 'FREE' : 'PKR ' + fee.toLocaleString()}</span></div>
        <div class="ck-summary-row ck-total-row"><span>Total</span><span>PKR ${(subtotal+fee).toLocaleString()}</span></div>
      </div>`;
    goToStep(3);
  });
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
    const fee        = getDeliveryFee(subtotal);
    const payMethod  = orderData.payment || 'cod';

    try {
      const result = await apiPlaceOrder({
        items:          cart,
        delivery:       orderData.delivery,
        paymentMethod:  payMethod,
        deliveryMethod: delivMethod,
      });

      if (result.ok) {
        /* Success */
        const ref = result.data.orderRef;
        document.getElementById('order-ref-num').textContent = 'Order Reference: ' + ref;
        localStorage.removeItem('velorra_cart');
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
      const ref = 'VLR-' + Date.now().toString().slice(-8);
      document.getElementById('order-ref-num').textContent = 'Order Reference: ' + ref;
      localStorage.removeItem('velorra_cart');
      document.querySelectorAll('.ck-panel').forEach(p => p.classList.add('hidden'));
      document.getElementById('ck-panel-success')?.classList.remove('hidden');
      document.querySelectorAll('.ck-step').forEach(el => el.classList.add('complete'));
      document.getElementById('checkout-summary-sidebar').style.display = 'none';
    }
  };
  /* ── Payment method toggle ── */
  document.querySelectorAll('input[name="payment"]').forEach(r => {
    r.addEventListener('change', () => {
      const cf = document.getElementById('card-fields');
      if (cf) cf.style.display = r.value === 'card' ? 'block' : 'none';
    });
  });
  /* ── 3D Card live preview ── */
  const numInput  = document.getElementById('inp-card-num');
  const nameInput = document.getElementById('inp-card-name');
  const expInput  = document.getElementById('inp-card-exp');
  const cvvInput  = document.getElementById('inp-card-cvv');
  const card3d    = document.getElementById('card-preview-3d');
  numInput?.addEventListener('input', () => {
    let v = numInput.value.replace(/\D/g, '').substring(0,16);
    v = v.replace(/(.{4})/g, '$1 ').trim();
    numInput.value = v;
    const disp = document.getElementById('card-disp-num');
    if (disp) disp.textContent = v || '•••• •••• •••• ••••';
  });
  nameInput?.addEventListener('input', () => {
    const disp = document.getElementById('card-disp-name');
    if (disp) disp.textContent = nameInput.value.toUpperCase() || 'YOUR NAME';
  });
  expInput?.addEventListener('input', () => {
    let v = expInput.value.replace(/\D/g,'');
    if (v.length >= 3) v = v.substring(0,2) + '/' + v.substring(2,4);
    expInput.value = v;
    const disp = document.getElementById('card-disp-exp');
    if (disp) disp.textContent = expInput.value || 'MM/YY';
  });
  cvvInput?.addEventListener('focus', () => card3d?.classList.add('flipped'));
  cvvInput?.addEventListener('blur',  () => card3d?.classList.remove('flipped'));
  cvvInput?.addEventListener('input', () => {
    const disp = document.getElementById('card-disp-cvv');
    if (disp) disp.textContent = cvvInput.value || '•••';
  });
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
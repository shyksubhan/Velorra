/* ============================================================
   VELORRA — Dynamic Product Rendering
   Fetches products from the live backend (/api/products) and
   renders them into .products-grid containers on shop.html and
   index.html. This replaces the old hardcoded sample cards so
   that admin add/edit/delete actions actually show up live.
   ============================================================ */

/* ── Category slug → Display name map ── */
const VELORRA_CAT_LABELS = {
  'clips':       'Hair Clips',
  'catchers':    'Hair Clips',
  'scrunchies':  'Scrunchies',
  'hair-bands':  'Hair Bands',
  'pins':        'Pins',
  'ponies':      'Ponies',
  'fancy':       'Fancy Accessories',
  'bracelets':   'Bracelets',
  'rings':       'Rings',
  'earrings':    'Earrings',
  'necklace':    'Necklace',
  'gift-items':  'Gift Items',
};
function velorCatLabel(cat) {
  if (!cat) return '';
  return VELORRA_CAT_LABELS[cat.toLowerCase()] || cat;
}

/* ── Build the HTML for a single product card ── */
function velorraProductCardHTML(p) {
  const badge = p.badge ? `<span class="product-badge${p.badge === 'New' ? ' new' : ''}">${p.badge}</span>` : '';
  const oldPrice = p.priceOld
    ? `<span class="product-price-old">PKR ${Number(p.priceOld).toLocaleString()}</span>`
    : '';
  const emoji = p.emoji || '🛍️';
  const variant = (p.colors && p.colors[0]) || (p.sizes && p.sizes[0]) || 'Standard';
  const safeName = p.name.replace(/'/g, "\\'");
  const mainImage = (p.images && p.images.length) ? p.images[0] : null;
  const hasVideo  = !!p.video;

  const cat = p.category === 'catchers' ? 'clips' : p.category;
  const subcat = p.subcategory === 'catchers' ? 'clips' : p.subcategory;

  const mediaHTML = mainImage
    ? `<img src="${mainImage}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;" loading="lazy"/>`
    : hasVideo
      ? `<video src="${p.video}#t=0.1" muted preload="metadata" playsinline style="width:100%;height:100%;object-fit:cover;"></video>`
      : `<div class="product-img-placeholder">
           <div class="pi-icon">${emoji}</div>
           <div class="pi-label">${velorCatLabel(subcat || cat)}</div>
         </div>`;

  return `
    <div class="product-card reveal" data-category="${cat}" data-id="${p.id}">
      <a href="product?id=${encodeURIComponent(p.id)}&name=${p.name ? p.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') : ''}">
        <div class="product-img-wrap">
          ${badge}
          ${mediaHTML}
        </div>
      </a>
      <div class="product-info">
        <p class="product-category">${velorCatLabel(subcat || cat)}</p>
        <h3 class="product-name">${p.name}</h3>
        <div class="product-pricing">
          <span class="product-price">PKR ${Number(p.price).toLocaleString()}</span>
          ${oldPrice}
        </div>
      </div>
      <div class="product-actions">
        <button onclick="addToCart('${safeName}',${Number(p.price)},'${emoji}','${variant}')">Add to Bag</button>
        <button class="buy-now-btn" onclick="buyNow('${safeName}',${Number(p.price)},'${emoji}','${variant}')">Buy It Now</button>
        <button class="wishlist-btn"><i class="fa-regular fa-heart"></i></button>
      </div>
    </div>`;
}

/* ── Render a "no products" empty state ── */
function velorraEmptyState(msg) {
  return `<p style="grid-column:1/-1;text-align:center;padding:60px 0;opacity:0.6;">${msg}</p>`;
}

/* ── Re-apply scroll reveal + filter-button listeners to freshly injected cards ── */
function velorraReInitCards(grid) {
  /* Scroll reveal */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.12 });
  grid.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  /* Re-apply currently active filter (shop page) */
  const activeBtn = document.querySelector('.filter-btn.active');
  if (activeBtn) {
    const cat = activeBtn.dataset.filter;
    grid.querySelectorAll('.product-card').forEach(card => {
      const show = cat === 'all' || card.dataset.category === cat ||
        (cat === 'sale' && card.querySelector('.product-price-old'));
      card.style.display = show ? '' : 'none';
    });
  }
}

/* ── Load & render the full shop grid (shop.html) ── */
async function velorraRenderShopGrid() {
  const grid = document.querySelector('#shop-products-grid, .products-grid');
  if (!grid) return;

  try {
    const data = await apiGet('/products');
    const products = data.products || [];
    if (!products.length) {
      grid.innerHTML = velorraEmptyState('No products available right now. Please check back soon.');
      return;
    }
    grid.innerHTML = products.map(velorraProductCardHTML).join('');
    velorraReInitCards(grid);
  } catch (err) {
    console.error('Failed to load products:', err);
    grid.innerHTML = velorraEmptyState('Unable to load products. Please refresh the page.');
  }
}

/* ── Load & render featured products only (index.html homepage) ── */
async function velorraRenderFeaturedGrid() {
  const grid = document.querySelector('#featured .products-grid');
  if (!grid) return;

  try {
    const data = await apiGet('/products?featured=true&limit=4');
    let products = data.products || [];
    if (!products.length) {
      /* fall back to first 4 products if nothing is marked featured */
      const all = await apiGet('/products?limit=4');
      products = all.products || [];
    }
    if (!products.length) {
      grid.innerHTML = velorraEmptyState('No products available right now.');
      return;
    }
    grid.innerHTML = products.map(velorraProductCardHTML).join('');
    velorraReInitCards(grid);
  } catch (err) {
    console.error('Failed to load featured products:', err);
    grid.innerHTML = velorraEmptyState('Unable to load products right now.');
  }
}

/* ── Auto-run on page load ── */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('shop-products-grid') || document.querySelector('.filter-bar')) {
    velorraRenderShopGrid();
  }
  if (document.querySelector('#featured .products-grid')) {
    velorraRenderFeaturedGrid();
  }
});

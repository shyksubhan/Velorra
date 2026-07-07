/* ============================================================
   VELORRA — Dynamic Product Rendering
   ============================================================ */

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
  'fancy-wear':  'Fancy Wear',
  'casual':      'Casual',
  'party-wear':  'Party Wear',
  'summer-collection': 'Summer Collection',
  'winter-collection': 'Winter Collection',
  'daily-pret':  'Daily Pret Ready to Wear'
};

const CATEGORY_HIERARCHY = {
  'jewelry': ['bracelets', 'rings', 'earrings', 'necklace'],
  'hair-accessories': ['scrunchies', 'clips', 'hair-bands', 'pins', 'ponies', 'fancy', 'gift-items'],
  'clothing': ['fancy-wear', 'casual', 'party-wear', 'summer-collection', 'winter-collection', 'daily-pret']
};

function velorCatLabel(cat) {
  if (!cat) return '';
  return VELORRA_CAT_LABELS[cat.toLowerCase()] || cat;
}

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
      : `<div style="width:100%;height:100%;background:var(--gold-light);display:flex;align-items:center;justify-content:center;font-size:2rem;color:var(--gold);">${emoji}</div>`;

  return `
    <div class="product-card" data-cat="${subcat || cat}">
      <div class="product-img-wrap">
        ${badge}
        <a href="product.html?id=${p.id}">${mediaHTML}</a>
        <button class="product-action-btn" onclick="openQuickView('${p.id}')" aria-label="Quick View"><i class="fa-regular fa-eye"></i></button>
      </div>
      <div class="product-info">
        <p class="product-cat">${velorCatLabel(subcat || cat)}</p>
        <h3 class="product-name"><a href="product.html?id=${p.id}">${p.name}</a></h3>
        <div class="product-price">PKR ${Number(p.price).toLocaleString()} ${oldPrice}</div>
        <button class="btn-primary product-add" onclick="cart.add('${p.id}','${safeName}',${p.price},'${mainImage||''}','${variant}')">Add to Bag</button>
      </div>
    </div>
  `;
}

function velorraEmptyState(msg) {
  return `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;background:#fcfbf9;border-radius:12px;border:1px dashed #e5d5c5;color:var(--muted);"><i class="fa-solid fa-box-open" style="font-size:2rem;color:var(--gold);margin-bottom:16px;"></i><p>${msg}</p></div>`;
}

function velorraReInitCards(container) {
  container.querySelectorAll('.product-img-wrap').forEach(wrap => {
    const vid = wrap.querySelector('video');
    if (vid) {
      wrap.addEventListener('mouseenter', () => vid.play().catch(e=>e));
      wrap.addEventListener('mouseleave', () => { vid.pause(); vid.currentTime=0; });
    }
  });
}

function velorraSetupShopFilters(products, grid, mainCat) {
  const urlParams = new URLSearchParams(window.location.search);
  let initialCat = urlParams.get('cat') || 'all';

  // If this page belongs to a main category, 'all' means all subcats inside this mainCat
  const validSubcats = mainCat ? CATEGORY_HIERARCHY[mainCat] : null;

  const btns = document.querySelectorAll('.filter-bar .filter-btn');
  btns.forEach(b => {
    b.addEventListener('click', () => {
      btns.forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const f = b.getAttribute('data-filter');
      
      const cards = grid.querySelectorAll('.product-card');
      let visibleCount = 0;
      cards.forEach(card => {
        const c = card.getAttribute('data-cat');
        let show = false;
        
        if (f === 'all') {
          // If on a specific main category page, "all" means everything in that hierarchy
          if (validSubcats) {
            show = validSubcats.includes(c);
          } else {
            show = true;
          }
        } else if (f === 'sale') {
          const bdg = card.querySelector('.product-badge');
          show = bdg && bdg.innerText.toLowerCase().includes('sale');
        } else {
          show = (c === f);
        }

        card.style.display = show ? '' : 'none';
        if (show) visibleCount++;
      });
      
      const emptyMsg = grid.querySelector('.empty-state-filter');
      if (visibleCount === 0) {
        if (!emptyMsg) grid.insertAdjacentHTML('beforeend', '<div class="empty-state-filter" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted);">No products found in this category.</div>');
      } else {
        if (emptyMsg) emptyMsg.remove();
      }
      
      window.history.replaceState(null, '', f === 'all' ? window.location.pathname : window.location.pathname + '?cat=' + f);
    });
  });

  if (initialCat && initialCat !== 'all') {
    const btn = document.querySelector(`.filter-btn[data-filter="${initialCat}"]`);
    if (btn) btn.click();
    else {
      const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
      if (allBtn) allBtn.click();
    }
  } else {
    const allBtn = document.querySelector('.filter-btn[data-filter="all"]');
    if (allBtn) allBtn.click();
  }
}

async function velorraRenderShopGrid() {
  const grid = document.querySelector('#shop-products-grid, .products-grid');
  if (!grid) return;

  const mainCat = grid.getAttribute('data-main-cat');

  try {
    const data = await apiGet('/products');
    let products = data.products || [];
    
    // If a main category is specified, pre-filter the products list
    if (mainCat && CATEGORY_HIERARCHY[mainCat]) {
      const allowed = CATEGORY_HIERARCHY[mainCat];
      products = products.filter(p => {
        const c = p.subcategory === 'catchers' ? 'clips' : p.subcategory;
        return allowed.includes(c) || allowed.includes(p.category);
      });
    }

    if (!products.length) {
      grid.innerHTML = velorraEmptyState('No products available right now. Please check back soon.');
      return;
    }
    grid.innerHTML = products.map(velorraProductCardHTML).join('');
    velorraReInitCards(grid);
    velorraSetupShopFilters(products, grid, mainCat);
  } catch (err) {
    console.error('Failed to load products:', err);
    grid.innerHTML = velorraEmptyState('Unable to load products. Please refresh the page.');
  }
}

/* ── Load & render featured and pinned grids (index.html homepage) ── */
async function velorraRenderHomepageGrids() {
  const isHome = document.getElementById('featured-jewelry');
  if (!isHome) return;

  try {
    const data = await apiGet('/products');
    let allProducts = data.products || [];

    // --- 1. Render Pinned Collections ---
    const pinnedRes = await apiGet('/admin/pinned').catch(e => null);
    const pinnedData = pinnedRes && pinnedRes.pinned ? pinnedRes.pinned : [];
    const pinnedContainer = document.getElementById('pinned-collections-wrapper');
    if (pinnedContainer && pinnedData.length > 0) {
      pinnedContainer.innerHTML = '';
      pinnedData.forEach(pin => {
        const pinProducts = allProducts.filter(p => (p.subcategory === pin.id || p.category === pin.id));
        if (pinProducts.length > 0) {
          const section = document.createElement('section');
          section.className = 'collection-section';
          section.style.padding = '40px 0 0 0';
          section.innerHTML = `
            <div class="container">
              <div class="section-header" style="text-align:left; margin-bottom:20px;">
                <h2 style="font-size:2rem;">${pin.name}</h2>
              </div>
              <div class="horizontal-scroll-grid" style="display:flex; overflow-x:auto; gap:20px; padding-bottom:20px; scroll-snap-type:x mandatory;">
                ${pinProducts.map(p => {
                  let html = velorraProductCardHTML(p);
                  return html.replace('class="product-card"', 'class="product-card" style="flex: 0 0 280px; scroll-snap-align: start;"');
                }).join('')}
              </div>
            </div>
          `;
          pinnedContainer.appendChild(section);
          velorraReInitCards(section);
        }
      });
    }

    // --- 2. Render Featured Rows (grouped by Main Category) ---
    const featuredProducts = allProducts.filter(p => p.featured);
    
    // Jewelry
    const jewGrid = document.getElementById('featured-jewelry-grid');
    if (jewGrid) {
      const jProds = featuredProducts.filter(p => CATEGORY_HIERARCHY['jewelry'].includes(p.subcategory || p.category));
      jewGrid.innerHTML = jProds.length ? jProds.map(p => velorraProductCardHTML(p).replace('class="product-card"', 'class="product-card" style="flex: 0 0 280px; scroll-snap-align: start;"')).join('') : velorraEmptyState('More coming soon.');
      velorraReInitCards(jewGrid);
    }

    // Hair Accessories
    const hairGrid = document.getElementById('featured-hair-grid');
    if (hairGrid) {
      const hProds = featuredProducts.filter(p => CATEGORY_HIERARCHY['hair-accessories'].includes(p.subcategory || p.category));
      hairGrid.innerHTML = hProds.length ? hProds.map(p => velorraProductCardHTML(p).replace('class="product-card"', 'class="product-card" style="flex: 0 0 280px; scroll-snap-align: start;"')).join('') : velorraEmptyState('More coming soon.');
      velorraReInitCards(hairGrid);
    }

    // Clothing
    const clothGrid = document.getElementById('featured-clothing-grid');
    if (clothGrid) {
      const cProds = featuredProducts.filter(p => CATEGORY_HIERARCHY['clothing'].includes(p.subcategory || p.category));
      clothGrid.innerHTML = cProds.length ? cProds.map(p => velorraProductCardHTML(p).replace('class="product-card"', 'class="product-card" style="flex: 0 0 280px; scroll-snap-align: start;"')).join('') : velorraEmptyState('More coming soon.');
      velorraReInitCards(clothGrid);
    }

  } catch (err) {
    console.error('Failed to load homepage products:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('shop-products-grid') || document.querySelector('.filter-bar')) {
    velorraRenderShopGrid();
  }
  if (document.getElementById('featured-jewelry')) {
    velorraRenderHomepageGrids();
  }
});

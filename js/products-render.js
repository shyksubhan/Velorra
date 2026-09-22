/* ============================================================
   GOLNISÀ — Dynamic Product Rendering
   ============================================================ */

const GOLNISÀ_CAT_LABELS = {
  'bracelets':   'Bracelets',
  'rings':       'Rings',
  'earrings':    'Earrings',
  'necklace':    'Necklaces',
  'couple-items':'Couple Items',
  'jewelry-sets':'Jewelry Sets',
  'gift-items':  'Gift Items',
  'new-arrivals':'New Arrivals',
  'trending-now':'Trending Now',
  'sale':        'Sale'
};

const CATEGORY_HIERARCHY = {
  'jewelry': ['bracelets', 'rings', 'earrings', 'necklace', 'couple-items', 'jewelry-sets']
};

function velorCatLabel(cat) {
  if (!cat) return '';
  return GOLNISÀ_CAT_LABELS[cat.toLowerCase()] || cat;
}

function golnisaProductCardHTML(p) {
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
  const resolvedCat = subcat || cat;

  let mainCat = 'unknown';
  for (const [mc, subs] of Object.entries(CATEGORY_HIERARCHY)) {
    if (subs.includes(resolvedCat)) {
      mainCat = mc;
      break;
    }
  }

  const mediaHTML = mainImage
    ? `<img src="${mainImage}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;" loading="lazy"/>`
    : hasVideo
      ? `<video src="${p.video}#t=0.1" muted preload="metadata" playsinline style="width:100%;height:100%;object-fit:cover;"></video>`
      : `<div style="width:100%;height:100%;background:var(--gold-light);display:flex;align-items:center;justify-content:center;font-size:2rem;color:var(--gold);">${emoji}</div>`;

  return `
    <div class="product-card" data-cat="${resolvedCat}" data-main-cat="${mainCat}" data-additional-cats="${(p.additionalCategories || []).join(',')}">
      <div class="product-img-wrap">
        ${badge}
        <a href="product.html?id=${p.id}">${mediaHTML}</a>
        <button class="product-action-btn" onclick="openQuickView('${p.id}')" aria-label="Quick View"><i class="fa-regular fa-eye"></i></button>
      </div>
      <div class="product-info">
        <p class="product-cat">${velorCatLabel(subcat || cat)}</p>
        <h3 class="product-name"><a href="product.html?id=${p.id}">${p.name}</a></h3>
        <div class="product-price">PKR ${Number(p.price).toLocaleString()} ${oldPrice}</div>
        <div class="product-action-row" style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
          <button class="btn-primary product-add" style="flex:1;font-size:0.8rem;padding:8px;min-width:80px;" onclick="addToCart('${safeName}', ${p.price}, '${emoji}', '${variant}', '${mainImage || ''}')">Add to Bag</button>
          <button class="btn-outline product-buy" style="flex:1;font-size:0.8rem;padding:8px;min-width:80px;" onclick="buyNow('${safeName}', ${p.price}, '${emoji}', '${variant}', '${mainImage || ''}')">Buy it Now</button>
        </div>
        <a href="https://wa.me/923014617844?text=${encodeURIComponent(`Hi! I'd like to order this item from Golnisà:\n\n`)}%F0%9F%93%A6${encodeURIComponent(` Product: ${p.name}\n`)}%F0%9F%92%B0${encodeURIComponent(` Price: PKR ${Number(p.price).toLocaleString()}\n`)}%F0%9F%94%97${encodeURIComponent(` Link: ${window.location.origin}/product.html?id=${p.id}\n\nPlease confirm availability and delivery details.`)}" target="_blank" rel="noopener" class="wa-order-btn" style="display:flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:8px;margin-top:4px;background:#25D366;color:#fff;border-radius:8px;font-size:0.78rem;font-weight:600;text-decoration:none;transition:opacity 0.2s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'"><i class="fa-brands fa-whatsapp" style="font-size:1rem;"></i> Order on WhatsApp</a>
      </div>
    </div>
  `;
}

function golnisaEmptyState(msg) {
  return `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;background:#fcfbf9;border-radius:12px;border:1px dashed #e5d5c5;color:var(--muted);"><i class="fa-solid fa-box-open" style="font-size:2rem;color:var(--gold);margin-bottom:16px;"></i><p>${msg}</p></div>`;
}

function golnisaReInitCards(container) {
  container.querySelectorAll('.product-img-wrap').forEach(wrap => {
    const vid = wrap.querySelector('video');
    if (vid) {
      wrap.addEventListener('mouseenter', () => vid.play().catch(e=>e));
      wrap.addEventListener('mouseleave', () => { vid.pause(); vid.currentTime=0; });
    }
  });
}

function golnisaSetupShopFilters(products, grid, mainCat) {
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
      
      const urlParams = new URLSearchParams(window.location.search);
      const maxPrice = urlParams.get('maxprice');
      
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
          const additional = card.dataset.additionalCats ? card.dataset.additionalCats.split(',') : [];
          show = (c === f) || additional.includes(f);
        }

        // Apply price filter if present in URL
        if (show && maxPrice) {
           const priceText = card.querySelector('.product-price')?.innerText.replace(/[^0-9]/g, '');
           if (priceText && Number(priceText) > Number(maxPrice)) {
               show = false;
           }
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
      
      let newUrl = f === 'all' ? window.location.pathname : window.location.pathname + '?cat=' + f;
      if (maxPrice) {
         newUrl = newUrl.includes('?') ? newUrl + '&maxprice=' + maxPrice : newUrl + '?maxprice=' + maxPrice;
      }
      window.history.replaceState(null, '', newUrl);
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

async function golnisaRenderShopGrid() {
  const grid = document.querySelector('#shop-products-grid, .products-grid');
  if (!grid) return;

  const mainCat = grid.getAttribute('data-main-cat');

  try {
    const data = await apiGet('/products');
    let products = data.products || [];
    
    if (mainCat && CATEGORY_HIERARCHY[mainCat]) {
      const allowed = CATEGORY_HIERARCHY[mainCat];
      products = products.filter(p => {
        const cat = p.category === 'catchers' ? 'clips' : p.category;
        const subcat = p.subcategory === 'catchers' ? 'clips' : p.subcategory;
        const additional = p.additionalCategories || [];
        return allowed.includes(subcat) || allowed.includes(cat) || additional.some(a => allowed.includes(a));
      });
    }

    if (!products.length) {
      grid.innerHTML = golnisaEmptyState('No products available right now. Please check back soon.');
      return;
    }
    grid.innerHTML = products.map(golnisaProductCardHTML).join('');
    golnisaReInitCards(grid);
    golnisaSetupShopFilters(products, grid, mainCat);
  } catch (err) {
    console.error('Failed to load products:', err);
    grid.innerHTML = golnisaEmptyState('Unable to load products. Please refresh the page.');
  }
}

/* ── Load & render featured and pinned grids (index.html homepage) ── */
async function golnisaRenderHomepageGrids() {
  const isHome = document.getElementById('featured-jewelry');
  if (!isHome) return;

  try {
    const data = await apiGet('/products');
    let allProducts = data.products || [];

    // --- 1. Render Pinned Collections as GRID ---
    const pinnedRes = await apiGet('/admin/pinned').catch(e => null);
    let pinnedData = pinnedRes && pinnedRes.pinned ? pinnedRes.pinned : [];
    pinnedData = pinnedData.filter(pin => typeof GOLNISÀ_CAT_LABELS !== 'undefined' && GOLNISÀ_CAT_LABELS[pin.id]);
    
    const pinnedContainer = document.getElementById('pinned-collections-wrapper');
    if (pinnedContainer && pinnedData.length > 0) {
      pinnedContainer.innerHTML = '';
      pinnedData.forEach(pin => {
        const pinProducts = allProducts.filter(p => {
          const c = p.category === 'catchers' ? 'clips' : p.category;
          const s = p.subcategory === 'catchers' ? 'clips' : p.subcategory;
          const additional = p.additionalCategories || [];
          return (c === pin.id || s === pin.id || additional.includes(pin.id));
        });
        if (pinProducts.length > 0) {
          const section = document.createElement('section');
          section.className = 'collection-section';
          section.style.padding = '40px 0 10px 0';

          const catUrl = (() => {
            if (CATEGORY_HIERARCHY['jewelry'].includes(pin.id)) return `jewelry.html?cat=${pin.id}`;
            return `jewelry.html?cat=${pin.id}`;
          })();

          const limitedProducts = pinProducts.slice(0, 8);
          section.innerHTML = `
            <div class="container">
              <h2 class="section-title" style="text-align:center;margin-bottom:24px;">${pin.name}</h2>
              <div class="products-grid" style="grid-template-columns: repeat(4, 1fr);">
                ${limitedProducts.map(p => golnisaProductCardHTML(p)).join('')}
              </div>
              ${pinProducts.length > 8 ? `<div style="text-align:center;margin-top:20px;"><a href="${catUrl}" class="btn-see-all">See All →</a></div>` : ''}
            </div>
          `;
          pinnedContainer.appendChild(section);
          golnisaReInitCards(section);
        }
      });
    }

    // --- 2. Render Featured Products as GRID ---
    const featuredProducts = allProducts.filter(p => p.featured);
    const jewGrid = document.getElementById('featured-jewelry-grid');
    if (jewGrid) {
      const jProds = featuredProducts.filter(p => CATEGORY_HIERARCHY['jewelry'].includes(p.subcategory || p.category));
      const limitedFeatured = jProds.slice(0, 8);
      jewGrid.innerHTML = limitedFeatured.length ? limitedFeatured.map(p => golnisaProductCardHTML(p)).join('') : golnisaEmptyState('More coming soon.');
      golnisaReInitCards(jewGrid);
    }

  } catch (err) {
    console.error('Failed to load homepage products:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('shop-products-grid') || document.querySelector('.filter-bar')) {
    golnisaRenderShopGrid();
  }
  if (document.getElementById('featured-jewelry')) {
    golnisaRenderHomepageGrids();
  }
});

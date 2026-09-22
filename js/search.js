/* ============================================================
   VELORRA — Search System
   Searches all products, pages, categories, keywords
   ============================================================ */
let VELORRA_SEARCH_INDEX = [
  /* Categories */
  { type: 'category', title: 'All Collections',                 keywords: 'all shop products catalog', url: 'shop',     badge: 'Category' },
  { type: 'category', title: 'Jewelry',                         keywords: 'jewelry rings bracelets necklaces earrings bangles sets', url: 'jewelry', badge: 'Category' },
  { type: 'category', title: 'Sale Items',                      keywords: 'sale discount offer reduced price',        url: 'jewelry.html?cat=sale',      badge: 'Sale' },
  /* Pages */
  { type: 'page', title: 'Our Story',        keywords: 'about velorra story brand lahore founded history',   url: 'about',                    badge: 'Page' },
  { type: 'page', title: 'Contact Us',       keywords: 'contact email phone whatsapp address location',     url: 'contact',                  badge: 'Page' },
  { type: 'page', title: 'Shipping Info',    keywords: 'shipping delivery days free standard',      url: 'policy?page=shipping',     badge: 'Policy' },
  { type: 'page', title: 'Returns Policy',   keywords: 'returns refund exchange 14 day policy',             url: 'policy?page=returns',      badge: 'Policy' },
  { type: 'page', title: 'Size Guide',       keywords: 'size guide xs s m l xl xxl measurements chart fit', url: 'policy?page=sizeguide',    badge: 'Guide'  },
  { type: 'page', title: 'FAQs',            keywords: 'faq questions answers help support',                 url: 'policy?page=faqs',         badge: 'Help'   },
  { type: 'page', title: 'Track Your Order', keywords: 'track order tracking status delivery shipment',     url: 'policy?page=track',        badge: 'Tool'   },
  { type: 'page', title: 'My Account',       keywords: 'account login signin signup register profile',      url: 'account',                  badge: 'Account'}
];

// Fetch real products dynamically
(async function() {
  try {
    const res = await fetch('/api/products');
    if (!res.ok) return;
    const data = await res.json();
    if (data.products && data.products.length > 0) {
      const productIndex = data.products.map(p => ({
        type: 'product',
        id: p.id,
        title: p.name,
        keywords: `${p.name} ${p.category} ${p.subcategory} ${p.additionalCategories?.join(' ')} PKR ${p.price}`,
        url: `product.html?id=${p.id}`,
        badge: `PKR ${Number(p.price).toLocaleString()}`,
        image: p.images && p.images.length > 0 ? p.images[0] : null
      }));
      VELORRA_SEARCH_INDEX = [...productIndex, ...VELORRA_SEARCH_INDEX];
    }
  } catch (e) {
    console.error("Search index failed to load products", e);
  }
})();
/* ── Icons per type ── */
const TYPE_ICON = { product: '🛍️', category: '✦', page: '📄' };
document.addEventListener('DOMContentLoaded', () => {
  const overlay   = document.getElementById('search-overlay');
  const closeBtn  = document.getElementById('search-close');
  const input     = document.getElementById('search-input');
  const results   = document.getElementById('search-results');
  
  // Also hook up the new header search input
  const headerInput = document.getElementById('header-search-input');
  
  if (!overlay && !headerInput) return;

  /* close */
  const closeSearch = () => {
    if (overlay) overlay.classList.remove('active');
    if (input) input.value = '';
    if (results) results.innerHTML = '';
  };
  if (closeBtn) closeBtn.addEventListener('click', closeSearch);
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSearch(); });

  /* search logic */
  const performSearch = (q, resultsContainer) => {
    if (!q || q.length < 2) { resultsContainer.innerHTML = ''; return; }
    const matches = VELORRA_SEARCH_INDEX.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q)
    );
    if (matches.length === 0) {
      resultsContainer.innerHTML = `<div class="search-no-results">No results for "<em>${q}</em>"</div>`;
      return;
    }
    resultsContainer.innerHTML = matches.map(item => {
      let iconHtml = `<span class="sr-icon">${TYPE_ICON[item.type] || '🔍'}</span>`;
      if (item.image) {
        iconHtml = `<img src="${item.image}" alt="${item.title}" style="width:36px; height:36px; object-fit:cover; border-radius:4px; margin-right:12px;" />`;
      }
      return `
      <a href="${item.url}" class="search-result-item" onclick="closeSearchOverlay()" style="display:flex; align-items:center; padding:10px; border-bottom:1px solid #eee; text-decoration:none; color:inherit;">
        ${iconHtml}
        <span class="sr-info" style="flex:1; display:flex; justify-content:space-between; align-items:center;">
          <span class="sr-title" style="font-weight:500;">${highlight(item.title, q)}</span>
          <span class="sr-badge" style="font-size:0.75rem; color:#888;">${item.badge}</span>
        </span>
      </a>`
    }).join('');
  };

  if (input && results) {
    input.addEventListener('input', () => performSearch(input.value.trim().toLowerCase(), results));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const first = results.querySelector('.search-result-item');
        if (first) first.click();
      }
    });
  }

  // Header search suggestions dropdown logic
  if (headerInput) {
    // Create a container for header search results
    const headerResults = document.createElement('div');
    headerResults.className = 'header-search-results';
    headerResults.style.cssText = 'position:absolute;top:100%;left:0;right:0;background:#fff;border-radius:8px;box-shadow:0 12px 32px rgba(0,0,0,0.1);z-index:1001;max-height:400px;overflow-y:auto;display:none;margin-top:8px;';
    headerInput.parentNode.style.position = 'relative';
    headerInput.parentNode.appendChild(headerResults);

    headerInput.addEventListener('input', () => {
      const q = headerInput.value.trim().toLowerCase();
      if (q.length < 2) {
        headerResults.style.display = 'none';
        return;
      }
      headerResults.style.display = 'block';
      performSearch(q, headerResults);
    });

    headerInput.addEventListener('blur', () => {
      setTimeout(() => headerResults.style.display = 'none', 200);
    });
    headerInput.addEventListener('focus', () => {
      if (headerInput.value.trim().length >= 2) headerResults.style.display = 'block';
    });
  }
});
/* highlight matched text */
function highlight(text, query) {
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(re, '<mark>$1</mark>');
}
/* called from onclick in results */
function closeSearchOverlay() {
  document.getElementById('search-overlay')?.classList.remove('active');
}
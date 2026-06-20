/* ============================================================
   VELORRA — Search System
   Searches all products, pages, categories, keywords
   ============================================================ */
const VELORRA_SEARCH_INDEX = [
  /* Products */
  { type: 'product', id: 'ivory-silk-maxi-gown',       title: 'Ivory Silk Maxi Gown',       keywords: 'women dress silk maxi gown ivory formal PKR 12500 VLR-001', url: 'product.html?id=ivory-silk-maxi-gown',        badge: 'PKR 12,500' },
  { type: 'product', id: 'noir-rose-gold-timepiece',   title: 'Noir Rose Gold Timepiece',   keywords: 'watch timepiece rose gold noir unisex PKR 28000 VLR-002', url: 'product.html?id=noir-rose-gold-timepiece',    badge: 'PKR 28,000' },
  { type: 'product', id: 'obsidian-slim-suit',         title: 'Obsidian Slim Suit',         keywords: 'men suit slim formal obsidian black PKR 35000 VLR-003',   url: 'product.html?id=obsidian-slim-suit',          badge: 'PKR 35,000' },
  { type: 'product', id: 'aurora-gold-necklace',       title: 'Aurora Gold Necklace',       keywords: 'jewellery necklace gold aurora women accessories PKR 8500 VLR-004', url: 'product.html?id=aurora-gold-necklace', badge: 'PKR 8,500' },
  { type: 'product', id: 'velvet-noir-lip-kit',        title: 'Velvet Noir Lip Kit',        keywords: 'cosmetics lips lipstick velvet noir beauty PKR 3500 VLR-005', url: 'product.html?id=velvet-noir-lip-kit',      badge: 'PKR 3,500' },
  { type: 'product', id: 'champagne-leather-tote',     title: 'Champagne Leather Tote',     keywords: 'women bags handbag tote champagne leather PKR 18000 VLR-006 sale', url: 'product.html?id=champagne-leather-tote', badge: 'PKR 18,000' },
  /* Categories */
  { type: 'category', title: 'Women\'s Collection',             keywords: 'women dresses tops fashion female ladies', url: 'shop.html?cat=women',     badge: 'Category' },
  { type: 'category', title: 'Men\'s Collection',               keywords: 'men suits formal shirts male',             url: 'shop.html?cat=men',       badge: 'Category' },
  { type: 'category', title: 'Jewellery & Accessories',         keywords: 'jewellery jewelry necklace ring earring hair accessories bracelet', url: 'shop.html?cat=jewellery', badge: 'Category' },
  { type: 'category', title: 'Watches',                         keywords: 'watches timepiece wristwatch unisex',      url: 'shop.html?cat=watches',   badge: 'Category' },
  { type: 'category', title: 'Cosmetics',                       keywords: 'cosmetics makeup beauty lips foundation', url: 'shop.html?cat=cosmetics', badge: 'Category' },
  { type: 'category', title: 'Sale Items',                      keywords: 'sale discount offer reduced price',        url: 'shop.html?cat=sale',      badge: 'Sale' },
  /* Pages */
  { type: 'page', title: 'Our Story',        keywords: 'about velorra story brand lahore founded history',   url: 'about.html',                    badge: 'Page' },
  { type: 'page', title: 'Contact Us',       keywords: 'contact email phone whatsapp address location',     url: 'contact.html',                  badge: 'Page' },
  { type: 'page', title: 'Shipping Info',    keywords: 'shipping delivery days free express standard',      url: 'policy.html?page=shipping',     badge: 'Policy' },
  { type: 'page', title: 'Returns Policy',   keywords: 'returns refund exchange 14 day policy',             url: 'policy.html?page=returns',      badge: 'Policy' },
  { type: 'page', title: 'Size Guide',       keywords: 'size guide xs s m l xl xxl measurements chart fit', url: 'policy.html?page=sizeguide',    badge: 'Guide'  },
  { type: 'page', title: 'FAQs',            keywords: 'faq questions answers help support',                 url: 'policy.html?page=faqs',         badge: 'Help'   },
  { type: 'page', title: 'Track Your Order', keywords: 'track order tracking status delivery shipment',     url: 'policy.html?page=track',        badge: 'Tool'   },
  { type: 'page', title: 'My Account',       keywords: 'account login signin signup register profile',      url: 'account.html',                  badge: 'Account'},
];
/* ── Icons per type ── */
const TYPE_ICON = { product: '🛍️', category: '✦', page: '📄' };
document.addEventListener('DOMContentLoaded', () => {
  const toggle    = document.getElementById('search-toggle');
  const overlay   = document.getElementById('search-overlay');
  const closeBtn  = document.getElementById('search-close');
  const input     = document.getElementById('search-input');
  const results   = document.getElementById('search-results');
  if (!toggle || !overlay) return;
  /* open */
  toggle.addEventListener('click', () => {
    overlay.classList.add('active');
    setTimeout(() => input?.focus(), 120);
  });
  /* close */
  const closeSearch = () => {
    overlay.classList.remove('active');
    if (input) input.value = '';
    if (results) results.innerHTML = '';
  };
  closeBtn?.addEventListener('click', closeSearch);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSearch(); });
  /* search */
  input?.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (!q || q.length < 2) { results.innerHTML = ''; return; }
    const matches = VELORRA_SEARCH_INDEX.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q)
    );
    if (matches.length === 0) {
      results.innerHTML = `<div class="search-no-results">No results for "<em>${q}</em>"</div>`;
      return;
    }
    results.innerHTML = matches.map(item => `
      <a href="${item.url}" class="search-result-item" onclick="closeSearchOverlay()">
        <span class="sr-icon">${TYPE_ICON[item.type] || '🔍'}</span>
        <span class="sr-info">
          <span class="sr-title">${highlight(item.title, q)}</span>
          <span class="sr-badge">${item.badge}</span>
        </span>
      </a>`).join('');
  });
  /* Enter key navigation */
  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const first = results.querySelector('.search-result-item');
      if (first) first.click();
    }
  });
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
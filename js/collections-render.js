const COLLECTIONS_DATA = {
  'jewelry': {
    title: 'Jewelry <em style="color: var(--gold);">Collection</em>',
    desc: 'Discover our elegant jewelry collection featuring beautiful bracelets, rings, earrings, and necklaces.',
    subcats: [
      { id: 'bracelets', name: 'Bracelets', img: 'images/categories/bracelets.jpg' },
      { id: 'rings', name: 'Rings', img: 'images/categories/rings.jpg' },
      { id: 'earrings', name: 'Earrings', img: 'images/categories/earrings.jpg' },
      { id: 'necklace', name: 'Necklace', img: 'images/categories/necklace.jpg' }
    ]
  },
  'hair-accessories': {
    title: 'Hair Accessories <em style="color: var(--gold);">Collection</em>',
    desc: 'Shop our premium hair accessories including scrunchies, clips, hair bands, and more.',
    subcats: [
      { id: 'scrunchies', name: 'Scrunchies', img: 'images/categories/scrunchies.jpg' },
      { id: 'clips', name: 'Hair Clips', img: 'images/categories/catchers.jpg' },
      { id: 'hair-bands', name: 'Hair Bands', img: 'images/categories/hair-bands.jpg' },
      { id: 'pins', name: 'Pins', img: 'images/categories/pins.jpg' },
      { id: 'ponies', name: 'Ponies', img: 'images/categories/ponies.jpg' },
      { id: 'fancy', name: 'Fancy Accessories', img: 'images/categories/fancy.jpg' },
      { id: 'gift-items', name: 'Gift Items', img: 'images/categories/gift-items.jpg' }
    ]
  },
  'clothing': {
    title: 'Clothing <em style="color: var(--gold);">Collection</em>',
    desc: 'Explore our latest clothing collections featuring fancy wear, casuals, and daily pret.',
    subcats: [
      { id: 'fancy-wear', name: 'Fancy Wear', img: null },
      { id: 'casual', name: 'Casual', img: null },
      { id: 'party-wear', name: 'Party Wear', img: null },
      { id: 'summer-collection', name: 'Summer Collection', img: null },
      { id: 'winter-collection', name: 'Winter Collection', img: null },
      { id: 'daily-pret', name: 'Daily Pret Ready to Wear', img: null }
    ]
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const mainCat = params.get('main');
  
  const titleEl = document.getElementById('shop-hero-title');
  const descEl = document.getElementById('shop-hero-desc');
  const gridEl = document.getElementById('collections-grid');
  
  if (!mainCat || !COLLECTIONS_DATA[mainCat]) {
    window.location.href = 'shop';
    return;
  }
  
  const data = COLLECTIONS_DATA[mainCat];
  
  if (titleEl) titleEl.innerHTML = data.title;
  if (descEl) descEl.innerHTML = data.desc;
  
  if (gridEl) {
    gridEl.innerHTML = '';
    data.subcats.forEach(sub => {
      const a = document.createElement('a');
      a.href = 'shop?cat=' + sub.id;
      a.className = 'cat-card cat-img-card';
      
      let imgHTML = '';
      if (sub.img) {
        imgHTML = `<img src="${sub.img}" alt="${sub.name} — Velorra" loading="lazy"/>
                   <div class="cat-img-overlay"></div>`;
      } else {
        imgHTML = `<div class="cat-img-overlay" style="background:var(--gold-light);"></div>`;
      }
      
      a.innerHTML = `
        <div class="cat-img-wrap">
          ${imgHTML}
        </div>
        <div class="cat-img-info">
          <p class="cat-name">${sub.name}</p>
          <span class="cat-cta-pill">Shop Now</span>
        </div>
      `;
      gridEl.appendChild(a);
    });
  }
});

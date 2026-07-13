/* ============================================================
   Velorra — Sitemap Generator
   Run: node generate-sitemap.js
   Fetches all products from live API and writes sitemap.xml
   ============================================================ */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const DOMAIN  = 'https://golnisa.com';
const API_URL = 'https://velorra-vvp3.onrender.com/api/products';
const TODAY   = new Date().toISOString().slice(0, 10);

/* Static pages */
const STATIC = [
  { loc: `${DOMAIN}/`,         changefreq: 'weekly',  priority: '1.0' },
  { loc: `${DOMAIN}/shop`,     changefreq: 'daily',   priority: '0.9' },
  { loc: `${DOMAIN}/clothing`, changefreq: 'daily',   priority: '0.9' },
  { loc: `${DOMAIN}/jewelry`,  changefreq: 'daily',   priority: '0.9' },
  { loc: `${DOMAIN}/hair-accessories`, changefreq: 'daily', priority: '0.9' },
  { loc: `${DOMAIN}/about`,    changefreq: 'monthly', priority: '0.7' },
  { loc: `${DOMAIN}/contact`,  changefreq: 'monthly', priority: '0.6' },
  { loc: `${DOMAIN}/policy`,   changefreq: 'monthly', priority: '0.5' },
  { loc: `${DOMAIN}/reseller`, changefreq: 'monthly', priority: '0.6' },
];

/* Category pages hierarchy */
const CATEGORY_MAP = {
  'jewelry': ['bracelets','rings','earrings','necklace'],
  'hair-accessories': ['scrunchies','clips','hair-bands','pins','ponies','fancy','gift-items'],
  'clothing': ['winter-collection','daily-pret','unstitched','g-prints','new-arrivals','trending-now'],
  'shop': ['sale']
};

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

function urlEntry(loc, changefreq, priority) {
  const escapedLoc = loc.replace(/&/g, '&amp;');
  return `  <url>\n    <loc>${escapedLoc}</loc>\n    <lastmod>${TODAY}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

async function generate() {
  console.log('Fetching products from API...');
  
  let products = [];
  try {
    const data = await fetchJSON(API_URL);
    products = data.products || data || [];
    console.log(`Found ${products.length} products`);
  } catch(e) {
    console.error('Could not fetch products:', e.message);
    console.log('Generating sitemap with static pages only...');
  }

  const entries = [];

  // Static pages
  STATIC.forEach(p => entries.push(urlEntry(p.loc, p.changefreq, p.priority)));

  // Category pages
  Object.keys(CATEGORY_MAP).forEach(page => {
    CATEGORY_MAP[page].forEach(cat => {
      entries.push(urlEntry(`${DOMAIN}/${page}?cat=${cat}`, 'weekly', '0.8'));
    });
  });

  // Product pages
  products.forEach(p => {
    const id   = p._id || p.id || p.slug || '';
    const name = p.name || '';
    // slug = lowercase, spaces to hyphens
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (!slug) return;
    const loc = `${DOMAIN}/product?id=${encodeURIComponent(slug)}&name=${encodeURIComponent(slug)}`;
    entries.push(urlEntry(loc, 'weekly', '0.7'));
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

${entries.join('\n')}

</urlset>`;

  const outPath = path.join(__dirname, 'sitemap.xml');
  fs.writeFileSync(outPath, xml, 'utf8');
  let catCount = 0;
  Object.values(CATEGORY_MAP).forEach(arr => catCount += arr.length);

  console.log(`\nDone! sitemap.xml updated with ${entries.length} URLs`);
  console.log(`  - ${STATIC.length} static pages`);
  console.log(`  - ${catCount} category pages`);
  console.log(`  - ${products.length} product pages`);
}

generate();

const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(f => {
  let p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');

  // General text replacements
  content = content.replace(/Pakistan's premier destination for fine clothing, jewelry, and hair accessories\./g, "Pakistan's premier destination for premium jewelry.");
  content = content.replace(/clothing, jewelry, and hair accessory/gi, "premium jewelry piece");
  content = content.replace(/clothing, jewelry, and accessories/gi, "premium jewelry");
  content = content.replace(/stunning dresses and fine jewelry to the perfect hair accessories/gi, "stunning necklaces, rings, earrings, and bracelets");
  content = content.replace(/beautiful accessories/gi, "beautiful jewelry");
  content = content.replace(/Fashion & Accessories Brand/gi, "Premium Jewelry Brand");
  content = content.replace(/Fashion and Accessories Brand/gi, "Premium Jewelry Brand");
  content = content.replace(/fashion and accessories/gi, "fine jewelry");
  content = content.replace(/fashion & accessories/gi, "fine jewelry");
  content = content.replace(/Jewelry <em style="color: var\(--gold\);">&amp;<\/em> Accessories/gi, 'Premium <em style="color: var(--gold);">&amp;</em> Elegant Jewelry');
  
  // Hero descriptions
  content = content.replace(/Discover Pakistan's finest online selection of premium scrunchies, elegant clips, and beautifully crafted jewelry pieces for every occasion\./gi, "Discover Pakistan's finest online selection of beautifully crafted, premium jewelry pieces for every occasion.");
  
  // Meta tags and titles
  content = content.replace(/Shop Hair Accessories & Jewelry/gi, "Shop Premium Jewelry");
  content = content.replace(/Browse 200\+ hair accessories & jewelry pieces online in Pakistan\. Scrunchies, pins, hair clips, necklaces/gi, "Browse our exclusive jewelry collection online in Pakistan. Necklaces");
  content = content.replace(/Shop hair accessories & jewelry online in Pakistan\./gi, "Shop premium jewelry online in Pakistan.");
  content = content.replace(/Search hair accessories, scrunchies, pins/gi, "Search jewelry, necklaces, rings");
  
  // Stats
  content = content.replace(/<div class="stat-num">200\+<\/div><div class="stat-label">Accessories<\/div>/g, '<div class="stat-num">200+</div><div class="stat-label">Jewelry Pieces</div>');

  // Footer removal of old categories (in case not applied to all)
  content = content.replace(/<li><a href="hair-accessories\.html">Hair Accessories<\/a><\/li>/g, "");
  content = content.replace(/<li><a href="clothing\.html">Clothing<\/a><\/li>/g, "");

  fs.writeFileSync(p, content, 'utf8');
});
console.log("Done");

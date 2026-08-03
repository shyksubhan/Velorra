const fs = require('fs');
const path = require('path');

const dir = __dirname;
const filesToProcess = [
  'index.html', 'about.html', 'account.html', 'checkout.html',
  'clothing.html', 'contact.html', 'jewelry.html', 'policy.html',
  'product.html', 'shop.html', 'hair-accessories.html'
];

filesToProcess.forEach(file => {
  const filepath = path.join(dir, file);
  if (fs.existsSync(filepath)) {
    let content = fs.readFileSync(filepath, 'utf8');

    // Branding
    content = content.replace(/Golnisà/g, 'Zarin-e-Husn');
    content = content.replace(/Golnisa/g, 'Zarin-e-Husn');
    content = content.replace(/golnisajewelry/g, 'zarinehusn');
    content = content.replace(/golnisa\.store/g, 'zarinehusn.com');
    content = content.replace(/golnisa\.com/g, 'zarinehusn.com');
    content = content.replace(/Pakistan's premier online store for hair accessories and jewelry/g, 'Premium luxury beauty and jewelry destination');
    content = content.replace(/Hair Accessories, Jewelry &amp; Women's Clothing/g, 'High-Quality Cosmetics & Premium Jewelry');
    content = content.replace(/Hair Accessories, Jewelry & Women's Clothing/g, 'High-Quality Cosmetics & Premium Jewelry');
    
    // Nav & Categories Text
    content = content.replace(/>Hair Accessories</g, '>Skincare<');
    content = content.replace(/>Clothing</g, '>Cosmetics<');

    // The hero image was named hero-bg.mp4. I replaced it with a .jpg in PowerShell.
    // Let's change the video tag to img tag in index.html later manually, or just here.
    if (file === 'index.html') {
      content = content.replace(
        /<video[\s\S]*?id="hero-video"[\s\S]*?<\/video>/,
        `<img id="hero-video" src="images/hero-bg.jpg" alt="Zarin-e-Husn" style="width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0; z-index:-1;" />`
      );
      content = content.replace(/Shop By Category/g, 'Discover Our Collections');
      content = content.replace(/Find Your <em>Style<\/em>/g, 'Luxury That Enhances <em>Your Natural Beauty<\/em>');
      content = content.replace(/images\/categories\/jewelry-new\.jpg/g, 'images/categories/jewelry.jpg');
      content = content.replace(/images\/categories\/scrunchies\.jpg/g, 'images/categories/skincare.jpg');
      content = content.replace(/images\/categories\/clothing-new\.jpg/g, 'images/categories/cosmetics.jpg');
      content = content.replace(/Featured <em style="color: var\(--gold\);">Hair Accessories<\/em>/g, 'Featured <em style="color: var(--gold);">Skincare</em>');
      content = content.replace(/Featured <em style="color: var\(--gold\);">Clothing<\/em>/g, 'Featured <em style="color: var(--gold);">Cosmetics</em>');
      
      // Update logo img tag
      content = content.replace(/<img src="images\/logo\.svg" alt="Zarin-e-Husn" style="height:36px;width:auto;" \/>/, '<span style="font-size:24px; font-weight:700; color:var(--gold); letter-spacing:2px; font-family:var(--font-display);">ZARIN-E-HUSN</span>');
    } else {
        content = content.replace(/<img src="images\/logo\.svg" alt="Zarin-e-Husn" style="height:36px;width:auto;" \/>/, '<span style="font-size:24px; font-weight:700; color:var(--gold); letter-spacing:2px; font-family:var(--font-display);">ZARIN-E-HUSN</span>');
        content = content.replace(/<img src="\.\.\/images\/logo\.svg" alt="Zarin-e-Husn" style="height:36px;width:auto;" \/>/, '<span style="font-size:24px; font-weight:700; color:var(--gold); letter-spacing:2px; font-family:var(--font-display);">ZARIN-E-HUSN</span>');
    }

    fs.writeFileSync(filepath, content, 'utf8');
  }
});

console.log("Rebrand script completed for HTML files.");

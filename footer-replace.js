const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = ['shop.html', 'product.html', 'account.html', 'policy.html'];

files.forEach(f => {
  let p = path.join(dir, f);
  if (!fs.existsSync(p)) return;
  let content = fs.readFileSync(p, 'utf8');

  content = content.replace(/<li><a href="jewelry\.html">Jewelry<\/a><\/li>/g, '<li><a href="jewelry.html">All Jewelry</a></li>\n            <li><a href="jewelry.html?cat=necklace">Necklaces</a></li>\n            <li><a href="jewelry.html?cat=earrings">Earrings</a></li>\n            <li><a href="jewelry.html?cat=bracelets">Bracelets</a></li>\n            <li><a href="jewelry.html?cat=rings">Rings</a></li>');

  fs.writeFileSync(p, content, 'utf8');
});
console.log("Done footers");

const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

html = html.replace(/\/\* Toggle between product-search mode and custom free-text mode per item row \*\/\s+const searchInput/g, 
  '/* Toggle between product-search mode and custom free-text mode per item row */\n  function toggleSocCustomItem(idx) {\n    const searchInput');

fs.writeFileSync('admin/index.html', html);
console.log('Fixed signature with regex');

const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

html = html.replace('/* Toggle between product-search mode and custom free-text mode per item row */\n  \n  const searchInput', '/* Toggle between product-search mode and custom free-text mode per item row */\n  function toggleSocCustomItem(idx) {\n  const searchInput');

html = html.replace(/onclick="toggleSocItemCustom/g, 'onclick="toggleSocCustomItem');

fs.writeFileSync('admin/index.html', html);
console.log('Fixed toggleSocCustomItem signature');

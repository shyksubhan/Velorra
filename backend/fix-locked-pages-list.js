const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const regex = /const lockedPages = \['dashboard', 'subscribers', 'roles', 'settings', 'coupons', 'spendings', 'invoices', 'abandoned', 'visitors', 'reviews', 'stock', 'stock-needed'\];/;
const newCode = `const lockedPages = ['dashboard', 'roles', 'spendings'];`;

html = html.replace(regex, newCode);
fs.writeFileSync('admin/index.html', html);
console.log('Updated lockedPages list');

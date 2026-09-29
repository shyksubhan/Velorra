const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const regex = /function openProductModal\(product = null\) \{/;
const newFunc = `function openProductModal(product = null) {
    if (typeof isSupportStaff === 'function' && isSupportStaff()) {
      toast('Access Denied. You do not have permission to add or edit products.', 'error');
      return;
    }`;

html = html.replace(regex, newFunc);
fs.writeFileSync('admin/index.html', html);
console.log('Blocked openProductModal for Support Staff');

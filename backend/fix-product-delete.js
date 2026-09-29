const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const regex = /async function deleteProduct\(id\) \{/;
const newFunc = `async function deleteProduct(id) {
    if (typeof isSupportStaff === 'function' && isSupportStaff()) {
      toast('Access Denied. You do not have permission to delete products.', 'error');
      return;
    }`;

html = html.replace(regex, newFunc);
fs.writeFileSync('admin/index.html', html);
console.log('Blocked deleteProduct for Support Staff');

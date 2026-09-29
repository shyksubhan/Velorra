const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

// 1. Declare let productVariants globally
html = html.replace(/let productSizes = \[\];/, "let productVariants = [];\nlet productSizes = [];");

// 2. Initialize it in openProductModal
html = html.replace(/productSizes\s*=\s*\[\.\.\.\(product\?\.sizes\s*\|\|\s*\[\]\)\];/, 
"productVariants = [...(product?.variants || [])];\n    productSizes  = [...(product?.sizes  || [])];");

// 3. Reset input and render chips in openProductModal
html = html.replace(/document\.getElementById\('p-sizes-text'\)\.value\s*=\s*'';/,
"document.getElementById('p-variants-text').value = '';\n    document.getElementById('p-sizes-text').value  = '';");

html = html.replace(/renderTagChips\('sizes'\);/,
"renderTagChips('variants');\n    renderTagChips('sizes');");

// 4. Save it in saveProduct payload
const sizesPayloadRegex = /sizes:\s*\(\(\) => \{ const t=document\.getElementById\('p-sizes-text'\)\.value\.trim\(\); if\(t\) addTag\('sizes',t\); return productSizes; \}\)\(\),/;
const newSizesPayload = `variants: (() => { const t=document.getElementById('p-variants-text')?.value.trim(); if(t) addTag('variants',t); return productVariants; })(),
      sizes:       (() => { const t=document.getElementById('p-sizes-text')?.value.trim(); if(t) addTag('sizes',t); return productSizes; })(),`;

html = html.replace(sizesPayloadRegex, newSizesPayload);

fs.writeFileSync('admin/index.html', html);
console.log('Fixed Variants JS variables and payload in admin UI');

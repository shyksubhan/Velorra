const fs = require('fs');
let js = fs.readFileSync('routes/products.js', 'utf8');

const badLine = `sizes:       Array.isArray(sizes) ? sizes : (sizes || '').split(',').map(s => s.trim()).filter(Boolean),').map(s => s.trim()).filter(Boolean),`;
const goodLine = `sizes:       Array.isArray(sizes) ? sizes : (sizes || '').split(',').map(s => s.trim()).filter(Boolean),`;

js = js.replace(badLine, goodLine);

fs.writeFileSync('routes/products.js', js);
console.log('Fixed syntax error in products.js');

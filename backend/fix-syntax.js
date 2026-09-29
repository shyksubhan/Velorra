const fs = require('fs');
let js = fs.readFileSync('server.js', 'utf8');
js = js.replace(/T\0?o\0?u\0?c\0?h\0?e\0?d\0?/g, ''); // Remove the garbled touched string
js = js.replace(/Touched/g, '');
fs.writeFileSync('server.js', js.trim());
console.log('Fixed syntax error');

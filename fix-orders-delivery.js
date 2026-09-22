const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'backend/routes/orders.js');
let content = fs.readFileSync(p, 'utf8');

content = content.replace(/subtotal >= 1000 \? 0 : 200/g, "subtotal >= 2000 ? 0 : 200");

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed delivery threshold in backend orders route');

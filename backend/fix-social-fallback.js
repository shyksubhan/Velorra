const fs = require('fs');
let code = fs.readFileSync('routes/socialOrders.js', 'utf8');

const regex = /if \(orders\.length === 0 && store\.socialOrders\.length > 0\) \{[\s\S]*?if \(source\) orders = orders\.filter\(o => o\.source === source\);\n\s*\}/;
code = code.replace(regex, "/* Removed fallback to memory when Firebase returns 0, so deletions reflect properly */");

fs.writeFileSync('routes/socialOrders.js', code);
console.log('Removed memory fallback in socialOrders.js');

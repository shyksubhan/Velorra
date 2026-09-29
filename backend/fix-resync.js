const fs = require('fs');
let code = fs.readFileSync('routes/admin.js', 'utf8');

code = code.replace(/db\.collection\('socialOrders'\)\.get\(\)/g, "db.collection('social_orders').get()");

fs.writeFileSync('routes/admin.js', code);
console.log('Fixed socialOrders collection typo in resync endpoint');

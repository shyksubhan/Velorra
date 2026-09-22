const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'backend/routes/socialOrders.js');
let content = fs.readFileSync(p, 'utf8');

content = content.replace(/deliveryFee = payMethod === 'bank_deposit' \? \(subtotal >= 1000 \? 0 : 200\) : \(subtotal >= 5000 \? 0 : 200\);/g,
"deliveryFee = payMethod === 'bank_deposit' ? (subtotal >= 2000 ? 0 : 200) : (subtotal >= 5000 ? 0 : 200);");

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed delivery threshold in backend social orders route');

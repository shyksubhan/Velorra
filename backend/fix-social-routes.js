const fs = require('fs');
let js = fs.readFileSync('routes/socialOrders.js', 'utf8');

const oldReturn = `return {
        productId:     String(i.productId || '').trim(),
        name:          String(i.name || '').trim(),
        qty:           Number(i.qty)   || 1,
        price:         Number(i.price) || 0,
        purchasePrice: pp,
      };`;

const newReturn = `return {
        productId:     String(i.productId || '').trim(),
        name:          String(i.name || '').trim(),
        variant:       String(i.variant || '').trim(),
        qty:           Number(i.qty)   || 1,
        price:         Number(i.price) || 0,
        purchasePrice: pp,
      };`;

js = js.replace(new RegExp(oldReturn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newReturn);

fs.writeFileSync('routes/socialOrders.js', js);
console.log('Fixed socialOrders.js variants');

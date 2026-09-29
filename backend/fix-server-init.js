const fs = require('fs');
let js = fs.readFileSync('server.js', 'utf8');

const regex = /if \(invoicesSnap\.docs\.length > 0\) {([\s\S]*?)store\.invoices = invoicesSnap\.docs\.map\(d => d\.data\(\)\);([\s\S]*?)}/g;

const replacement = `store.invoices = invoicesSnap.docs.map(d => d.data());`;
js = js.replace(regex, replacement);

const oRegex = /if \(ordersSnap\.docs\.length > 0\) {([\s\S]*?)store\.orders = ordersSnap\.docs\.map\(d => \(\{ id: d\.id, \.\.\.d\.data\(\) \}\)\);([\s\S]*?)}/g;
js = js.replace(oRegex, `store.orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));`);

const sRegex = /if \(socialSnap\.docs\.length > 0\) {([\s\S]*?)store\.socialOrders = socialSnap\.docs\.map\(d => \(\{ id: d\.id, \.\.\.d\.data\(\), isSocial: true \}\)\);([\s\S]*?)}/g;
js = js.replace(sRegex, `store.socialOrders = socialSnap.docs.map(d => ({ id: d.id, ...d.data(), isSocial: true }));`);

fs.writeFileSync('server.js', js);
console.log('Fixed server.js initialization');

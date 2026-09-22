const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'backend/admin/index.html');
let content = fs.readFileSync(p, 'utf8');

// Fix `Items:` string in CSV export
content = content.replace(/Items:\s*\(o\.items\|\|\[\]\)\.map\(i => `\$\{i\.name\}[^`]+`\)\.join\([^)]+\),/g, 
"Items:          (o.items||[]).map(i => `${i.name}${i.variant && i.variant !== 'Standard' ? ' ('+i.variant+')' : ''} (x${i.qty})`).join(', '),");

// Fix `Items:` string in Social CSV export
content = content.replace(/Items:\s*\(a\.items\|\|\[\]\)\.map\(i => `\$\{i\.name\}[^`]+`\)\.join\([^)]+\),/g, 
"Items:   (a.items||[]).map(i => `${i.name}${i.variant && i.variant !== 'Standard' ? ' ('+i.variant+')' : ''} (x${i.qty})`).join(' | '),");

// Fix render HTML for Social Order Modal
content = content.replace(/\(i => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var\(--border\);font-size:0\.85rem"><span>\$\{i\.emoji\|\|'[^']+'\} \$\{i\.name\} \([^)]+\)<\/span><span>PKR \$\{\(i\.price\*i\.qty\)\.toLocaleString\(\)\}<\/span><\/div>`\)/g,
"(i => `<div style=\"display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem\"><span>${i.emoji||'🛍️'} ${i.name}${i.variant && i.variant !== 'Standard' ? ' ('+i.variant+')' : ''} (x${i.qty})</span><span>PKR ${(i.price*i.qty).toLocaleString()}</span></div>`)");

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed admin items mapping');

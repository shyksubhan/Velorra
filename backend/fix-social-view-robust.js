const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

// The line is: ${(o.items||[]).map(i => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem"><span>...</span><span>PKR ${(i.price*i.qty).toLocaleString()}</span></div>`).join('')}

html = html.replace(/\$\(o\.items\|\|\[\]\)\.map\(i => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var\(--border\);font-size:0\.85rem"><span>.*?<\/span><span>PKR \$\{\(i\.price\*i\.qty\)\.toLocaleString\(\)\}<\/span><\/div>`\)\.join\(''\)/g, 
"$(o.items||[]).map(i => `<div style=\"display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem\"><span>?? ${esc(i.name)}${i.variant && i.variant !== 'Standard' ? ' ('+esc(i.variant)+')' : ''} (x${i.qty})</span><span>PKR ${(i.price*i.qty).toLocaleString()}</span></div>`).join('')");

fs.writeFileSync('admin/index.html', html);
console.log('Fixed variants display robustly');

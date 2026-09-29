const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

// Header for web orders
html = html.replace('<th>Total</th><th>Profit</th><th>Payment</th>', '<th>Total</th><th class="profit-col">Profit</th><th>Payment</th>');
// Header for social orders
html = html.replace('<th>Total</th>\n          <th>Profit</th>\n          <th>Payment</th>', '<th>Total</th>\n          <th class="profit-col">Profit</th>\n          <th>Payment</th>');

// Data for web orders
// <td style="color:${profitColor};font-weight:600">${profitLabel}</td>
html = html.replace(/<td style="color:\$\{profitColor\};font-weight:600">\$\{profitLabel\}<\/td>/g, '<td class="profit-col" style="color:${profitColor};font-weight:600">${profitLabel}</td>');

// Details modal for web orders (viewOrder)
// <div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:600;color:${pft>=0?'var(--green)':'var(--red)'}"><span>Profit</span><span>${pft>=0?'+':''}PKR ${pft.toLocaleString()}</span></div>
html = html.replace(/<div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:600;color:\$\{pft>=0\?'var\(--green\)':'var\(--red\)'\}"><span>Profit<\/span><span>\$\{pft>=0\?'\+':''\}PKR \$\{pft\.toLocaleString\(\)\}<\/span><\/div>/g, 
  `<div class="profit-col" style="display:flex;justify-content:space-between;padding:10px 0;font-weight:600;color:\$\{pft>=0?'var(--green)':'var(--red)'\}"><span>Profit</span><span>\$\{pft>=0?'+':''\}PKR \$\{pft.toLocaleString()\}</span></div>`);

// Details modal for social orders (viewSocialOrder)
// <div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:600;color:${pft>=0?'var(--green)':'var(--red)'}"><span>Profit</span><span>${pft>=0?'+':''}PKR ${pft.toLocaleString()}</span></div>
// Wait, is it the exact same? Yes.

fs.writeFileSync('admin/index.html', html);
console.log('Fixed Roles part 2');

const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

// The line is: ${p.purchasePrice != null ? `<span style="color:var(--muted);font-size:0.72rem">Cost: PKR ${p.purchasePrice.toLocaleString()}</span>` : ''}
html = html.replace(/\$\{p\.purchasePrice != null \? `<span style="color:var\(--muted\);font-size:0\.72rem">Cost: PKR \$\{p\.purchasePrice\.toLocaleString\(\)\}<\/span>` : ''\}/g, 
  "${p.purchasePrice != null ? `<span class=\"cost-cell\" style=\"color:var(--muted);font-size:0.72rem\">Cost: PKR ${p.purchasePrice.toLocaleString()}</span>` : ''}");

fs.writeFileSync('admin/index.html', html);
console.log('Fixed Roles part 4');

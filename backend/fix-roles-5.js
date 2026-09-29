const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

// The header in the social orders modal:
html = html.replace('<span style="font-size:0.68rem;color:var(--muted);text-transform:uppercase">Cost</span>', '<span class="cost-cell" style="font-size:0.68rem;color:var(--muted);text-transform:uppercase">Cost</span>');

// The input in addSocialItem:
html = html.replace(/<input type="number" min="0" id="si-cost-\$\{idx\}" value="\$\{cost\}" style="width:75px" \/>/g, 
  '<input type="number" min="0" id="si-cost-${idx}" class="cost-cell" value="${cost}" style="width:75px" />');

fs.writeFileSync('admin/index.html', html);
console.log('Fixed Roles part 5');

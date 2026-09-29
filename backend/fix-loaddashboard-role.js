const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

// Create a generic robust role normalizer
const regex = /if \(\['ceo', 'super_admin', 'investor'\]\.includes\(currentUser\?\.role\)\) \{/;
const newCode = `const roleId = String(currentUser?.role || '').toLowerCase().trim();
  if (['ceo', 'super_admin', 'investor'].includes(roleId)) {`;
html = html.replace(regex, newCode);

fs.writeFileSync('admin/index.html', html);
console.log('Fixed loadDashboard role check for CEO');

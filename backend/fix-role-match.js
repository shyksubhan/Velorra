const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

// Change how isSupportStaff is calculated to be 100% immune to casing/exact strings
const regex = /const isSupportStaff = role === 'supervisor' \|\| role === 'support_staff' \|\| role === 'Support Staff';/g;
html = html.replace(regex, "const isSupportStaff = role === 'supervisor' || role === 'support_staff' || (role || '').toLowerCase().trim().replace(/_/g, ' ') === 'support staff';");

fs.writeFileSync('admin/index.html', html);
console.log('Fixed isSupportStaff string matching');

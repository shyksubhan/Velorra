const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

// We need to use the isSupportStaff logic in onLoginSuccess
const oldCode = /if \(currentUser\.role !== 'supervisor' && currentUser\.role !== 'support_staff' && currentUser\.role !== 'Support Staff'\) loadDashboard\(\);/;
const newCode = `const isSupportStaff = currentUser.role === 'supervisor' || currentUser.role === 'support_staff' || (currentUser.role || '').toLowerCase().trim().replace(/_/g, ' ') === 'support staff';
    if (!isSupportStaff) loadDashboard();`;

html = html.replace(oldCode, newCode);

fs.writeFileSync('admin/index.html', html);
console.log('Fixed onLoginSuccess dashboard loading condition');

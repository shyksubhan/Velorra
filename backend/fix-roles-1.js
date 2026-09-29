const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

// 1. Update formatRole to handle 'support_staff'
html = html.replace("supervisor:'Support Staff'", "supervisor:'Support Staff', support_staff:'Support Staff'");

// 2. Define isSupportStaff in applyRolePermissions
const applyRegex = /function applyRolePermissions\(role\) {([\s\S]*?)if \(\['ceo', 'super_admin'\]\.includes\(role\)\)/;
html = html.replace(applyRegex, `function applyRolePermissions(role) {
    const isSupportStaff = role === 'supervisor' || role === 'support_staff' || role === 'Support Staff';
    $1if (['ceo', 'super_admin'].includes(role))`);

// 3. Update the condition
html = html.replace(/if \(role === 'supervisor'\)/g, `if (isSupportStaff)`);

// 4. Update the condition inside onLoginSuccess
html = html.replace(/if \(currentUser\.role !== 'supervisor'\) loadDashboard\(\);/g, 
  `if (currentUser.role !== 'supervisor' && currentUser.role !== 'support_staff' && currentUser.role !== 'Support Staff') loadDashboard();`);

// 5. Hide Profit and Cost
// For Profit columns, I need to add a 'profit-col' class to all Profit th/td
// Wait, I can just do this in applyRolePermissions:
const permHideCode = `      document.querySelectorAll('.cost-cell').forEach(el => el.style.display = 'none');`;
const newPermHideCode = `      document.querySelectorAll('.cost-cell, .profit-col').forEach(el => el.style.display = 'none');
      document.getElementById('nav-spendings')?.style.setProperty('display', 'none');
      document.getElementById('nav-invoices')?.style.setProperty('display', 'none');
      document.getElementById('nav-abandoned')?.style.setProperty('display', 'none');
      document.getElementById('nav-live')?.style.setProperty('display', 'none');
      document.getElementById('nav-reviews')?.style.setProperty('display', 'none');
`;
html = html.replace(permHideCode, newPermHideCode);

fs.writeFileSync('admin/index.html', html);
console.log('Fixed Roles part 1');

const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

// Remove the logic that hides the add-social-order-btn for support staff
html = html.replace(/const socBtn = document\.getElementById\('add-social-order-btn'\);\s*if \(socBtn\) socBtn\.style\.display = 'none';/, "/* add-social-order-btn is now visible for support staff */");

// Reset the button at the top of applyRolePermissions just to clear any lingering inline styles
const applyRoleTop = /function applyRolePermissions\(role\) \{[\s\S]*?const existingStyle = document\.getElementById\('investor-styles'\);/;
html = html.replace(applyRoleTop, `function applyRolePermissions(role) {
    role = String(role || '').toLowerCase().trim();
    document.getElementById('add-social-order-btn')?.style.removeProperty('display');
    const existingStyle = document.getElementById('investor-styles');`);

fs.writeFileSync('admin/index.html', html);
console.log('Fixed add-social-order-btn visibility');

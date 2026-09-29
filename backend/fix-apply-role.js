const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const applyFuncStart = /function applyRolePermissions\(role\) \{/;
const newApplyFuncStart = `function applyRolePermissions(role) {
  role = String(role || '').toLowerCase().trim();`;

html = html.replace(applyFuncStart, newApplyFuncStart);

fs.writeFileSync('admin/index.html', html);
console.log('Fixed applyRolePermissions role check for CEO');

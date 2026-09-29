const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const oldStr = `function formatRole(role) {
  return { ceo: 'CEO', super_admin:'Super Admin', admin:'Admin', supervisor:'Support Staff', support_staff:'Support Staff', investor: 'Investor' }[String(role||'').toLowerCase().trim()] || role;
}[role] || role;
}`;
const newStr = `function formatRole(role) {
  return { ceo: 'CEO', super_admin:'Super Admin', admin:'Admin', supervisor:'Support Staff', support_staff:'Support Staff', investor: 'Investor' }[String(role||'').toLowerCase().trim()] || role;
}`;

html = html.replace(oldStr, newStr);

fs.writeFileSync('admin/index.html', html);
console.log('Fixed dangling formatRole syntax error');

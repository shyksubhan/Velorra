const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

html = html.replace(/function formatRole\(role\) \{\n  return \{ ceo: 'CEO', super_admin:'Super Admin', admin:'Admin', supervisor:'Support Staff', support_staff:'Support Staff', investor: 'Investor' \}\[String\(role\|\|''\)\.toLowerCase\(\)\.trim\(\)\] \|\| role;\n\}\[role\] \|\| role;\n\}/, 
`function formatRole(role) {
  return { ceo: 'CEO', super_admin:'Super Admin', admin:'Admin', supervisor:'Support Staff', support_staff:'Support Staff', investor: 'Investor' }[String(role||'').toLowerCase().trim()] || role;
}`);

fs.writeFileSync('admin/index.html', html);
console.log('Fixed dangling formatRole syntax error');

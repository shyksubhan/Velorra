const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const regexRoles = /if \(!\['ceo', 'super_admin'\]\.includes\(currentUser\?\.role\)\) \{/;
const newRoles = `const r = String(currentUser?.role || '').toLowerCase().trim();
  if (!['ceo', 'super_admin'].includes(r)) {`;
html = html.replace(regexRoles, newRoles);

const regexLaunch = /if \(\['ceo', 'super_admin'\]\.includes\(currentUser\?\.role\)\) loadLaunchDate\(\);/;
const newLaunch = `const r2 = String(currentUser?.role || '').toLowerCase().trim();
  if (['ceo', 'super_admin'].includes(r2)) loadLaunchDate();`;
html = html.replace(regexLaunch, newLaunch);

const regexFormat = /return \{ ceo: 'CEO', super_admin:'Super Admin', admin:'Admin', supervisor:'Support Staff', support_staff:'Support Staff', investor: 'Investor' \}size\[role\] \|\| role;/;
// wait, the formatRole is fine since it returns `|| role` if not found, but it might not format correctly if uppercase.
const regexFormat2 = /return \{ ceo: 'CEO', super_admin:'Super Admin', admin:'Admin', supervisor:'Support Staff', support_staff:'Support Staff', investor: 'Investor' \}size\[role\]/;
html = html.replace(/return \{ ceo: 'CEO', super_admin:'Super Admin', admin:'Admin', supervisor:'Support Staff', support_staff:'Support Staff', investor: 'Investor' \}size\[role\] \|\| role;/, "return { ceo: 'CEO', super_admin:'Super Admin', admin:'Admin', supervisor:'Support Staff', support_staff:'Support Staff', investor: 'Investor' }[String(role||'').toLowerCase().trim()] || role;");

// Fix the typo in formatRole replace
html = html.replace(/return \{ ceo: 'CEO', super_admin:'Super Admin', admin:'Admin', supervisor:'Support Staff', support_staff:'Support Staff', investor: 'Investor' \}size\[role\] \|\| role;/, "");
// Let's just rewrite formatRole
html = html.replace(/function formatRole\(role\) \{[\s\S]*?\}/, `function formatRole(role) {
  return { ceo: 'CEO', super_admin:'Super Admin', admin:'Admin', supervisor:'Support Staff', support_staff:'Support Staff', investor: 'Investor' }[String(role||'').toLowerCase().trim()] || role;
}`);

fs.writeFileSync('admin/index.html', html);
console.log('Fixed all other role case-sensitivity checks');

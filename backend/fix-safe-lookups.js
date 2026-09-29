const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

// Use a regex replace with a function to target all document.getElementById(...).style.display = ...
// ONLY inside applyRolePermissions

const matchRegex = /(function applyRolePermissions\(role\) \{[\s\S]*?\/\* Investor - 100% read-only \*\/)/;

let updatedBlock = html.match(matchRegex)[1];

updatedBlock = updatedBlock.replace(/document\.getElementById\('([^']+)'\)\.style\.display = '([^']+)';/g, "document.getElementById('$1')?.style.setProperty('display', '$2');");

html = html.replace(matchRegex, updatedBlock);

fs.writeFileSync('admin/index.html', html);
console.log('Made all element lookups in applyRolePermissions completely safe');

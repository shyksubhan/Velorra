const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

// 1. Fix the error in JS
html = html.replace(/document\.getElementById\('add-user-btn'\)\.style\.display = 'none';/g, "document.getElementById('add-user-btn')?.style.setProperty('display', 'none');");

// 2. Add the ID to the HTML just in case
html = html.replace(/<button class="btn btn-gold" onclick="openRoleModal\(\)">/, '<button id="add-user-btn" class="btn btn-gold" onclick="openRoleModal()">');

fs.writeFileSync('admin/index.html', html);
console.log('Fixed the silent JS crash causing applyRolePermissions to fail');

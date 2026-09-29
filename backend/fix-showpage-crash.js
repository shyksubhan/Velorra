const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const oldShowPageCore = /document\.getElementById\('page-' \+ name\)\.style\.display = 'block';\s*document\.getElementById\('nav-' \+ name\)\.classList\.add\('active'\);/;
const newShowPageCore = `document.getElementById('page-' + name).style.display = 'block';
    const navItem = document.getElementById('nav-' + name);
    if (navItem) navItem.classList.add('active');`;

html = html.replace(oldShowPageCore, newShowPageCore);
fs.writeFileSync('admin/index.html', html);
console.log('Fixed navItem crash in showPage');

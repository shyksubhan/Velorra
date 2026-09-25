const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/poster="\$\{bgImg \|\| \(p\.images && p\.images\[0\]\) \|\| ''\}"/g, 'poster=""');
fs.writeFileSync('index.html', html);
console.log('Fixed ReferenceError: bgImg is not defined');

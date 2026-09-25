const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// First, fix any empty posters if they got corrupted
html = html.replace(/poster=""/g, 'poster="${(p.images && p.images[0]) || \'\'}"');

// Second, fix the bgImg issue if it's still there
html = html.replace(/poster="\$\{bgImg \|\| \(p\.images && p\.images\[0\]\) \|\| ''\}"/g, 'poster="${(p.images && p.images[0]) || \'\'}"');

fs.writeFileSync('index.html', html);
console.log('Fixed ReferenceError properly with raw string');

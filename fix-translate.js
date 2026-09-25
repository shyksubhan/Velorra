const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(/translate\(15%, -50%\) scale\(0\.8\)/g, 'translate(35%, -50%) scale(0.8)');
html = html.replace(/translate\(-115%, -50%\) scale\(0\.8\)/g, 'translate(-135%, -50%) scale(0.8)');

fs.writeFileSync('index.html', html);
console.log('Fixed translate overlaps');

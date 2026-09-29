const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

// The current values in index.html are translate(35%, -50%) and translate(-135%, -50%)
html = html.replace(/translate\(35%, -50%\) scale\(0\.8\)/g, 'translate(-5%, -50%) scale(0.8)');
html = html.replace(/translate\(-135%, -50%\) scale\(0\.8\)/g, 'translate(-95%, -50%) scale(0.8)');

fs.writeFileSync('index.html', html);
console.log('Fixed translations');

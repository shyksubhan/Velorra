const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/<video src="" poster="" autoplay muted loop playsinline><\/video>/g, '<video src="${p.video}" poster="${bgImg || (p.images && p.images[0]) || \'\'}" autoplay muted loop playsinline></video>');
fs.writeFileSync('index.html', html);
console.log('Fixed index.html video tags permanently');

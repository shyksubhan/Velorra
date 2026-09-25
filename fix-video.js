const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

html = html.replace(/autoplay muted loop playsinline/g, 'autoplay muted loop playsinline preload="auto"');

fs.writeFileSync('index.html', html);
console.log('Added preload=auto to videos');

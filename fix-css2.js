const fs = require('fs');
let css = fs.readFileSync('css/style.css', 'utf8');

// Change 5% to 20px for absolute minimum left/right gap
css = css.replace(/padding: 60px 5% !important;/g, 'padding: 60px 20px !important;');

fs.writeFileSync('css/style.css', css);
console.log('Fixed padding to push text absolutely full left');

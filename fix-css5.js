const fs = require('fs');
let css = fs.readFileSync('css/style.css', 'utf8');

// Update Height (Revision 18)
css = css.replace(/height: 650px !important; \/\* Increased from 580px \*\//, 'height: 680px !important; /* Increased from 650px */');
css = css.replace(/height: 600px !important; \/\* Increased from 540px \*\//, 'height: 630px !important; /* Increased from 600px */');

// Update Position (Revision 19)
css = css.replace(/left: 60% !important;/g, 'left: 63% !important;');

fs.writeFileSync('css/style.css', css);
console.log('Updated height and left positioning');

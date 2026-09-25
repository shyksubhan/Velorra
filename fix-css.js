const fs = require('fs');
let css = fs.readFileSync('css/style.css', 'utf8');

// Replace the max-width and margins to force full-left alignment
css = css.replace(/max-width: 1500px !important;/g, 'max-width: 100% !important;');
css = css.replace(/margin: 0 auto !important;/g, 'margin: 0 !important;');
css = css.replace(/padding: 60px 40px !important;/g, 'padding: 60px 5% !important;');

// Change the dark background of the cards to white so they don't flash black
css = css.replace(/background: #111 !important;/g, 'background: transparent !important;');

fs.writeFileSync('css/style.css', css);
console.log('Fixed CSS layout and black background flash');

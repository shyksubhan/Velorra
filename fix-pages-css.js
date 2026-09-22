const fs = require('fs');
const path = require('path');
const cssPath = path.join(__dirname, 'css/pages.css');
let css = fs.readFileSync(cssPath, 'utf8');

css = css.replace(/padding: calc\(var\(--nav-h\) \+ 40px\)/g, 'padding: 60px');
css = css.replace(/top: calc\(var\(--nav-h\) \+ 24px\)/g, 'top: 150px'); // policy sticky sidebar

fs.writeFileSync(cssPath, css, 'utf8');
console.log('Fixed pages.css paddings');

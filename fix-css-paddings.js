const fs = require('fs');
const path = require('path');
const cssPath = path.join(__dirname, 'css/style.css');
let css = fs.readFileSync(cssPath, 'utf8');

// 1. Fix header spacing
css = css.replace(/padding: 18px 48px; gap: 20px;/g, 'padding: 24px 48px 18px 48px; gap: 20px;');
css = css.replace(/\.header-cats-inner \{/g, '.header-cats-inner { padding-bottom: 24px !important; margin-bottom: 0; ');
css = css.replace(/\.header-cats-inner a \{ font-size: 0\.72rem;/g, '.header-cats-inner a { font-size: 0.8rem;');

// 2. Fix invalid calc(var(--nav-h) + 60px) which makes padding 0
css = css.replace(/padding: calc\(var\(--nav-h\) \+ 60px\) 0 60px;/g, 'padding: 80px 0 60px;');
css = css.replace(/padding: calc\(var\(--nav-h\) \+ 80px\) 0 80px;/g, 'padding: 100px 0 80px;');
css = css.replace(/padding-top: calc\(var\(--nav-h\) \+ 48px\);/g, 'padding-top: 64px;');
css = css.replace(/padding-top: calc\(var\(--nav-h\) \+ 120px\);/g, 'padding-top: 100px;'); // checkout etc

fs.writeFileSync(cssPath, css, 'utf8');
console.log('Fixed CSS paddings');

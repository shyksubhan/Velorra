const fs = require('fs');
let js = fs.readFileSync('js/main.js', 'utf8');

js = js.replace(/ham\?\.addEventListener\('click', \(\) => {/g, 'ham?.addEventListener(\'click\', () => {\n      if(!navLinks) return;');

fs.writeFileSync('js/main.js', js);
console.log('Fixed js/main.js for missing navLinks');

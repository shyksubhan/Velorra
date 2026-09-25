const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, '..', 'index.html');
const newScriptFile = path.join(__dirname, 'hero-script.js');

let html = fs.readFileSync(indexFile, 'utf8');
const newScript = fs.readFileSync(newScriptFile, 'utf8');

const regex = /<script>\s*\(async function\(\)\s*\{\s*const wrapper = document\.getElementById\('hero-slides-wrapper'\);[\s\S]*?\}\)\(\);\s*<\/script>/;

html = html.replace(regex, '<script>\n' + newScript + '\n  </script>');

fs.writeFileSync(indexFile, html);
console.log('Successfully replaced script in index.html');

const fs = require('fs');
let js = fs.readFileSync('server.js', 'utf8');
const exportIndex = js.indexOf('module.exports = app;');
if (exportIndex !== -1) {
    js = js.substring(0, exportIndex + 'module.exports = app;'.length) + '\n';
    fs.writeFileSync('server.js', js);
    console.log('Stripped trailing invalid bytes');
}

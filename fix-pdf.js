const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'backend/utils/pdfGenerator.js');
let content = fs.readFileSync(p, 'utf8');

content = content.replace(/const nameHeight = doc\.heightOfString\(item\.name, \{ width: 230 \}\);/g, 
"const displayName = item.name + (item.variant && item.variant !== 'Standard' ? ' (' + item.variant + ')' : '');\n      const nameHeight = doc.heightOfString(displayName, { width: 230 });");

content = content.replace(/doc\.text\(item\.name, 60, y \+ 10, \{ width: 230 \}\);/g,
"doc.text(displayName, 60, y + 10, { width: 230 });");

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed PDF items mapping');

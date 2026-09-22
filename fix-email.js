const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'backend/utils/email.js');
let content = fs.readFileSync(p, 'utf8');

content = content.replace(/const itemRows = items\.map\(i =>\s*`<tr>\s*<td style="padding:10px 0;border-bottom:1px solid #2a2a2a;">\$\{i\.emoji \|\| '[^']+'\} \$\{i\.name\} [^<]+<\/td>/g, 
"const itemRows = items.map(i =>\n    `<tr>\n      <td style=\"padding:10px 0;border-bottom:1px solid #2a2a2a;\">${i.emoji || '🛍️'} ${i.name}${i.variant && i.variant !== 'Standard' ? ' ('+i.variant+')' : ''} (x${i.qty})</td>");

content = content.replace(/const itemList = items\.map\(i => `<li>\$\{i\.name\} [^ ]+ \$\{i\.qty\} /g,
"const itemList = items.map(i => `<li>${i.name}${i.variant && i.variant !== 'Standard' ? ' ('+i.variant+')' : ''} (x${i.qty}) ");

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed email items mapping');

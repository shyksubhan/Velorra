const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

// Undo
html = html.replace(/if \(totalProfitCard\) totalProfitCard\.style\.display = 'none';\s*showPage\('orders'\);\s*\}/, 
`if (totalProfitCard) totalProfitCard.style.display = 'none';
  }`);

// Apply to Support Staff specifically
const regex = /\/\* Support Staff \*\/[\s\S]*?if \(totalProfitCard\) totalProfitCard\.style\.display = 'none';\s*\}/;
const match = html.match(regex);
if (match) {
    const newBlock = match[0].replace(/if \(totalProfitCard\) totalProfitCard\.style\.display = 'none';\s*\}/, 
`if (totalProfitCard) totalProfitCard.style.display = 'none';
    showPage('orders');
  }`);
    html = html.replace(regex, newBlock);
}

fs.writeFileSync('admin/index.html', html);
console.log('Fixed showPage routing to apply only to Support Staff');

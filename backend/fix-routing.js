const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const regex = /if \(totalProfitCard\) totalProfitCard\.style\.display = 'none';\s*\}/;
const newCode = `if (totalProfitCard) totalProfitCard.style.display = 'none';
    showPage('orders');
  }`;

html = html.replace(regex, newCode);
fs.writeFileSync('admin/index.html', html);
console.log('Added showPage(orders) to Support Staff init');

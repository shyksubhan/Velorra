const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

// Revert the wrong injection in admin block
html = html.replace(`document.querySelectorAll('.cost-cell, .profit-col').forEach(el => el.style.display = 'none');
        document.getElementById('nav-spendings')?.style.setProperty('display', 'none');
        document.getElementById('nav-invoices')?.style.setProperty('display', 'none');
        document.getElementById('nav-abandoned')?.style.setProperty('display', 'none');
        document.getElementById('nav-live')?.style.setProperty('display', 'none');
        document.getElementById('nav-reviews')?.style.setProperty('display', 'none');`, 
`document.querySelectorAll('.cost-cell').forEach(el => el.style.display = 'none');`);

// Find the correct injection spot inside isSupportStaff
const targetRegex = /if \(totalProfitCard\) totalProfitCard\.style\.display = 'none';\s*document\.querySelectorAll\('\.cost-cell'\)\.forEach\(el => el\.style\.display = 'none'\);/;
html = html.replace(targetRegex, `if (totalProfitCard) totalProfitCard.style.display = 'none';
      document.querySelectorAll('.cost-cell, .profit-col').forEach(el => el.style.display = 'none');
      document.getElementById('nav-spendings')?.style.setProperty('display', 'none');
      document.getElementById('nav-invoices')?.style.setProperty('display', 'none');
      document.getElementById('nav-abandoned')?.style.setProperty('display', 'none');
      document.getElementById('nav-live')?.style.setProperty('display', 'none');
      document.getElementById('nav-reviews')?.style.setProperty('display', 'none');`);

fs.writeFileSync('admin/index.html', html);
console.log('Fixed Roles part 7 (Targeted newPermHideCode)');

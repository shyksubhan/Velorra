const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

html = html.replace(/document\.querySelectorAll\('\.cost-cell'\)\.forEach\(el => el\.style\.display = 'none'\);/, 
`document.querySelectorAll('.cost-cell, .profit-col').forEach(el => el.style.display = 'none');
      document.getElementById('nav-spendings')?.style.setProperty('display', 'none');
      document.getElementById('nav-invoices')?.style.setProperty('display', 'none');
      document.getElementById('nav-abandoned')?.style.setProperty('display', 'none');
      document.getElementById('nav-live')?.style.setProperty('display', 'none');
      document.getElementById('nav-reviews')?.style.setProperty('display', 'none');`);

fs.writeFileSync('admin/index.html', html);
console.log('Fixed Roles part 6 (newPermHideCode)');

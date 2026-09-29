const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

// Ensure admin also dynamically hides cost-cell
html = html.replace(/document\.querySelectorAll\('\.cost-cell'\)\.forEach\(el => el\.style\.display = 'none'\);/, 
`const adminStyle = document.createElement('style');
    adminStyle.innerHTML = '.cost-cell { display: none !important; }';
    document.head.appendChild(adminStyle);`);

fs.writeFileSync('admin/index.html', html);
console.log('Fixed dynamic cost-cell hiding for regular admins');

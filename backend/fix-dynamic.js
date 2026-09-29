const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const regex = /document\.querySelectorAll\('\.cost-cell, \.profit-col'\)\.forEach\(el => el\.style\.display = 'none'\);/g;

// We need to replace the static querySelectorAll with a dynamic style block!
// Wait, I will just append a <style id="support-staff-styles"> block to the head.

const newCode = `
      // Add global CSS to permanently hide these columns even when tables dynamically re-render
      if (!document.getElementById('support-staff-styles')) {
        const style = document.createElement('style');
        style.id = 'support-staff-styles';
        style.innerHTML = '.cost-cell, .profit-col { display: none !important; }';
        document.head.appendChild(style);
      }
`;

html = html.replace(regex, newCode);

fs.writeFileSync('admin/index.html', html);
console.log('Fixed dynamic hiding for cost and profit');

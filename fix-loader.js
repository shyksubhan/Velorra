const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const oldLoader = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#000000;background:#ffffff;">Loading collections...</div>';
const newLoader = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;background:#ffffff;">
      <img src="images/logo.svg" alt="Loading" style="height:40px;animation:pulse 1.5s infinite ease-in-out;" />
      <style>@keyframes pulse { 0% { opacity: 0.4; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } 100% { opacity: 0.4; transform: scale(0.95); } }</style>
    </div>`;

html = html.replace(new RegExp(oldLoader.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newLoader);

fs.writeFileSync('index.html', html);
console.log('Loader updated');

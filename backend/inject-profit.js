const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

// Inject the HTML for the Profit row
const subtotalHtml = `<div style="display:none;justify-content:space-between;font-weight:700;font-size:1rem;margin-top:6px" id="soc-due-row"><span>Amount Due</span><span id="soc-due-display" style="color:var(--red)">PKR 200</span></div>`;
const newSubtotalHtml = subtotalHtml + `\n          <div class="profit-col" style="display:flex;justify-content:space-between;margin-top:6px;border-top:1px dashed var(--border);padding-top:6px"><span style="color:var(--muted)">Est. Profit</span><span id="soc-profit-display" style="color:var(--gold);font-weight:600">PKR 0</span></div>`;
html = html.replace(subtotalHtml, newSubtotalHtml);

// Inject the JS into recalcSocialTotal
const jsTarget = `    if (document.getElementById('soc-due-display')) document.getElementById('soc-due-display').textContent = 'PKR ' + due.toLocaleString();`;
const newJs = jsTarget + `\n\n    let totalCost = 0;
    document.querySelectorAll('#soc-items-container .soc-item-row').forEach(row => {
      const rowId   = row.id.replace('soc-item-row-', '');
      const qty     = Number(document.getElementById(\`si-qty-\${rowId}\`)?.value) || 0;
      const cost    = Number(document.getElementById(\`si-cost-\${rowId}\`)?.value) || 0;
      totalCost += qty * cost;
    });
    const estProfit = Math.max(0, subtotal - discount - totalCost);
    if (document.getElementById('soc-profit-display')) document.getElementById('soc-profit-display').textContent = 'PKR ' + estProfit.toLocaleString();`;
html = html.replace(jsTarget, newJs);

fs.writeFileSync('admin/index.html', html);
console.log('Injected Profit calculation to Social Order Modal');

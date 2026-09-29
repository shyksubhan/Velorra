const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const oldAdd = `function addSocialItem(prefill = null) {
  const idx = _socItemCount++;
  const row = document.createElement('div');
  row.className = 'soc-item-row';
  const pid = prefill ? prefill.productId : '';
  const name = prefill ? prefill.name : '';
  const qty = prefill ? prefill.qty : 1;
  const cost = prefill ? prefill.purchasePrice : 0;
  const sale = prefill ? prefill.price : 0;
  const total = qty * sale;

  row.id = \`soc-item-row-\${idx}\`;
  /* A row is custom if: it was explicitly saved as custom (productId==='custom'),
     or it has no productId at all but has a name (old custom item saved as productId=''). 
     Regular catalog products always have a real productId string. */
  const isCustom = prefill
    ? (prefill.productId === 'custom' || (prefill.productId === '' && !!prefill.name))
    : false;
  row.innerHTML = \`
    <div class="soc-product-search-wrap" style="flex: 2;">
      <input type="hidden" id="si-pid-\${idx}" value="\${pid}"/>
      <input placeholder="Search product..." id="si-search-\${idx}" value="\${esc(name)}"
             oninput="handleSocItemSearch(\${idx})"
             onfocus="handleSocItemSearch(\${idx})"
             autocomplete="off"
             style="display:\${isCustom ? 'none' : 'block'}"/>
      <input placeholder="Custom item name..." id="si-custom-name-\${idx}" value="\${esc(name)}"
             style="display:\${isCustom ? 'block' : 'none'}" oninput="recalcSocialTotal()"/>
      <div class="soc-search-results" id="si-results-\${idx}"></div>
    </div>
    <input type="number" min="1" id="si-qty-\${idx}" value="\${qty}" oninput="recalcSocialTotal()" style="width:55px" />
    <input type="number" min="0" id="si-cost-\${idx}" value="\${cost}" style="width:75px" />
    <input type="number" min="0" id="si-price-\${idx}" value="\${sale}" oninput="recalcSocialTotal()" style="width:75px" />
    <div style="width:90px;font-size:0.8rem;text-align:right" id="si-row-total-\${idx}">PKR \${total.toLocaleString()}</div>
    <button type="button" class="btn btn-outline btn-sm" onclick="toggleSocItemCustom(\${idx})" title="Toggle custom item" style="width:36px;padding:0"><i class="fa-solid fa-cube"></i></button>
    <button type="button" class="btn btn-outline btn-sm" onclick="removeSocialItem(\${idx})" style="color:var(--orange);width:36px;padding:0"><i class="fa-solid fa-trash"></i></button>
  \`;
  document.getElementById('soc-items-container').appendChild(row);
}`;

const newAdd = `function addSocialItem(prefill = null) {
  const idx = _socItemCount++;
  const row = document.createElement('div');
  row.className = 'soc-item-row';
  row.style.display = 'flex';
  row.style.flexDirection = 'column';
  row.style.gap = '4px';
  row.style.borderBottom = '1px solid var(--border)';
  row.style.paddingBottom = '8px';
  row.style.marginBottom = '8px';
  const pid = prefill ? prefill.productId : '';
  const name = prefill ? prefill.name : '';
  const variant = prefill ? prefill.variant : '';
  const qty = prefill ? prefill.qty : 1;
  const cost = prefill ? prefill.purchasePrice : 0;
  const sale = prefill ? prefill.price : 0;
  const total = qty * sale;

  row.id = \`soc-item-row-\${idx}\`;
  const isCustom = prefill ? (prefill.productId === 'custom' || (prefill.productId === '' && !!prefill.name)) : false;
  
  row.innerHTML = \`
    <div style="display:flex; gap:8px; align-items:center; width:100%;">
      <div class="soc-product-search-wrap" style="flex: 2;">
        <input type="hidden" id="si-pid-\${idx}" value="\${pid}"/>
        <input placeholder="Search product..." id="si-search-\${idx}" value="\${esc(name)}"
               oninput="handleSocItemSearch(\${idx})"
               onfocus="handleSocItemSearch(\${idx})"
               autocomplete="off"
               style="display:\${isCustom ? 'none' : 'block'}"/>
        <input placeholder="Custom item name..." id="si-custom-name-\${idx}" value="\${esc(name)}"
               style="display:\${isCustom ? 'block' : 'none'}" oninput="recalcSocialTotal()"/>
        <div class="soc-search-results" id="si-results-\${idx}"></div>
      </div>
      <input type="number" min="1" id="si-qty-\${idx}" value="\${qty}" oninput="recalcSocialTotal()" style="width:55px" />
      <input type="number" min="0" id="si-cost-\${idx}" value="\${cost}" style="width:75px" />
      <input type="number" min="0" id="si-price-\${idx}" value="\${sale}" oninput="recalcSocialTotal()" style="width:75px" />
      <div style="width:90px;font-size:0.8rem;text-align:right" id="si-row-total-\${idx}">PKR \${total.toLocaleString()}</div>
      <button type="button" class="btn btn-outline btn-sm" onclick="toggleSocItemCustom(\${idx})" title="Toggle custom item" style="width:36px;padding:0"><i class="fa-solid fa-cube"></i></button>
      <button type="button" class="btn btn-outline btn-sm" onclick="removeSocialItem(\${idx})" style="color:var(--orange);width:36px;padding:0"><i class="fa-solid fa-trash"></i></button>
    </div>
    <div style="width: 100%;">
      <input placeholder="Variant, Size, Color (e.g. Design 1 - Large - Pink)" id="si-variant-\${idx}" value="\${esc(variant)}" style="width:100%; font-size:0.8rem; padding:6px; background:var(--bg); border:1px solid var(--border); border-radius:4px;" />
    </div>
  \`;
  document.getElementById('soc-items-container').appendChild(row);
}`;

const cleanOldAdd = oldAdd.replace(/[\r\n\s]+/g, ' ').trim();
const cleanHtml = html.replace(/[\r\n\s]+/g, ' ').trim();

let startMatch = html.indexOf('function addSocialItem(prefill');
let endMatch = html.indexOf('}', html.indexOf('document.getElementById(\'soc-items-container\').appendChild(row);')) + 1;

if(startMatch > -1) {
  html = html.substring(0, startMatch) + newAdd + html.substring(endMatch);
}

const oldSave = `const effectivelyCustom = isCustom || (!pid && name && price > 0);
    if (!effectivelyCustom && !pid) { hasUnselectedRow = true; return; } /* typed name but never picked */
    items.push({ productId: effectivelyCustom ? '' : pid, name, qty, price, purchasePrice });`;

const newSave = `const effectivelyCustom = isCustom || (!pid && name && price > 0);
    if (!effectivelyCustom && !pid) { hasUnselectedRow = true; return; } /* typed name but never picked */
    const variant = document.getElementById(\`si-variant-\${rowId}\`)?.value.trim() || '';
    items.push({ productId: effectivelyCustom ? '' : pid, name, variant, qty, price, purchasePrice });`;

html = html.replace(new RegExp(oldSave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newSave);

const oldItemView = `\${(o.items||[]).map(i => \`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem"><span>dY>?,? \${esc(i.name)} (A-\${i.qty})</span><span>PKR \${(i.price*i.qty).toLocaleString()}</span></div>\`).join('')}`;
const newItemView = `\${(o.items||[]).map(i => \`<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem"><span>dY>?,? \${esc(i.name)}\${i.variant && i.variant !== 'Standard' ? ' ('+esc(i.variant)+')' : ''} (A-\${i.qty})</span><span>PKR \${(i.price*i.qty).toLocaleString()}</span></div>\`).join('')}`;

html = html.replace(oldItemView, newItemView);

fs.writeFileSync('admin/index.html', html);
console.log('Fixed addSocialItem logic');

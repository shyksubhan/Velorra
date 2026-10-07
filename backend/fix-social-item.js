const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const oldHtml = `      row.innerHTML = \`
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
          <input type="number" min="0" id="si-cost-\${idx}" class="cost-cell" value="\${cost}" style="width:75px" />
          <input type="number" min="0" id="si-price-\${idx}" value="\${sale}" oninput="recalcSocialTotal()" style="width:75px" />
          <div style="width:90px;font-size:0.8rem;text-align:right" id="si-row-total-\${idx}">PKR \${total.toLocaleString()}</div>
          <button type="button" class="btn btn-outline btn-sm" onclick="toggleSocCustomItem(\${idx})" title="Toggle custom item" style="width:36px;padding:0"><i class="fa-solid fa-cube"></i></button>
          <button type="button" class="btn btn-outline btn-sm" onclick="removeSocialItem(\${idx})" style="color:var(--orange);width:36px;padding:0"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div style="width: 100%;">
          <input placeholder="Variant, Size, Color (e.g. Design 1 - Large - Pink)" id="si-variant-\${idx}" value="\${esc(variant)}" style="width:100%; font-size:0.8rem; padding:6px; background:var(--bg); border:1px solid var(--border); border-radius:4px;" />
        </div>
      \`;`;

const newHtml = `      row.innerHTML = \`
        <div style="display:grid; grid-template-columns:2.2fr 55px 75px 75px 90px 36px 36px; gap:8px; align-items:center; width:100%;">
          <div class="soc-product-search-wrap" style="position:relative; width:100%;">
            <input type="hidden" id="si-pid-\${idx}" value="\${pid}"/>
            <input placeholder="Search product..." id="si-search-\${idx}" value="\${esc(name)}"
                   oninput="handleSocItemSearch(\${idx})"
                   onfocus="handleSocItemSearch(\${idx})"
                   autocomplete="off"
                   style="display:\${isCustom ? 'none' : 'block'}; width:100%;"/>
            <input placeholder="Custom item name..." id="si-custom-name-\${idx}" value="\${esc(name)}"
                   style="display:\${isCustom ? 'block' : 'none'}; width:100%;" oninput="recalcSocialTotal()"/>
            <div class="soc-product-dropdown" id="si-dropdown-\${idx}" style="display:none;"></div>
          </div>
          <input type="number" min="1" id="si-qty-\${idx}" value="\${qty}" oninput="recalcSocialTotal()" style="width:100%" />
          <input type="number" min="0" id="si-cost-\${idx}" class="cost-cell" value="\${cost}" style="width:100%" />
          <input type="number" min="0" id="si-price-\${idx}" value="\${sale}" oninput="recalcSocialTotal()" style="width:100%" />
          <div style="font-size:0.8rem;text-align:right" id="si-row-total-\${idx}">PKR \${total.toLocaleString()}</div>
          <button type="button" class="btn btn-outline btn-sm" onclick="toggleSocCustomItem(\${idx})" title="Toggle custom item" style="padding:0; height:32px;"><i class="fa-solid fa-cube"></i></button>
          <button type="button" class="btn btn-outline btn-sm" onclick="removeSocialItem(\${idx})" style="color:var(--orange);padding:0; height:32px;"><i class="fa-solid fa-trash"></i></button>
        </div>
        <div style="width: 100%; margin-top: 6px;">
          <input placeholder="Variant, Size, Color (e.g. Design 1 - Large - Pink)" id="si-variant-\${idx}" value="\${esc(variant)}" style="width:100%; font-size:0.8rem; padding:6px; background:var(--bg); border:1px solid var(--border); border-radius:4px;" />
        </div>
      \`;`;

html = html.replace(oldHtml, newHtml);
fs.writeFileSync('admin/index.html', html);
console.log('Fixed addSocialItem HTML logic');

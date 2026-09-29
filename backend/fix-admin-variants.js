const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const oldFormRow = `<div class="form-row">
          <div class="form-group">
            <label>Sizes <span style="color:var(--muted);font-weight:400">(type a size, press Enter to add)</span></label>
            <div class="tag-input-wrap" id="p-sizes-wrap">
              <div class="tag-chips" id="p-sizes-chips"></div>
              <input id="p-sizes-text" placeholder="e.g. Small, then press Enter" onkeydown="handleTagKeydown(event,'sizes')"/>
            </div>
          </div>
          <div class="form-group">
            <label>Colors <span style="color:var(--muted);font-weight:400">(type a color, press Enter to add)</span></label>
            <div class="tag-input-wrap" id="p-colors-wrap">
              <div class="tag-chips" id="p-colors-chips"></div>
              <input id="p-colors-text" placeholder="e.g. Black, then press Enter" onkeydown="handleTagKeydown(event,'colors')"/>
            </div>
          </div>
        </div>`;

const newFormRow = `<div class="form-row">
          <div class="form-group">
            <label>Variants <span style="color:var(--muted);font-weight:400">(e.g. Design 1)</span></label>
            <div class="tag-input-wrap" id="p-variants-wrap">
              <div class="tag-chips" id="p-variants-chips"></div>
              <input id="p-variants-text" placeholder="e.g. Design 1, press Enter" onkeydown="handleTagKeydown(event,'variants')"/>
            </div>
          </div>
          <div class="form-group">
            <label>Sizes <span style="color:var(--muted);font-weight:400">(Click tag to mark Out of Stock)</span></label>
            <div class="tag-input-wrap" id="p-sizes-wrap">
              <div class="tag-chips" id="p-sizes-chips"></div>
              <input id="p-sizes-text" placeholder="e.g. Small, press Enter" onkeydown="handleTagKeydown(event,'sizes')"/>
            </div>
          </div>
          <div class="form-group">
            <label>Colors <span style="color:var(--muted);font-weight:400">(Click tag to toggle Stock)</span></label>
            <div class="tag-input-wrap" id="p-colors-wrap">
              <div class="tag-chips" id="p-colors-chips"></div>
              <input id="p-colors-text" placeholder="e.g. Black, press Enter" onkeydown="handleTagKeydown(event,'colors')"/>
            </div>
          </div>
        </div>`;

html = html.replace(oldFormRow, newFormRow);

const oldInit = `productSizes  = [...(product?.sizes  || [])];
    productColors = [...(product?.colors || [])];
    document.getElementById('p-sizes-text').value  = '';
    document.getElementById('p-colors-text').value = '';
    renderTagChips('sizes');
    renderTagChips('colors');`;

const newInit = `productSizes  = [...(product?.sizes  || [])];
    productColors = [...(product?.colors || [])];
    productVariants = [...(product?.variants || [])];
    document.getElementById('p-sizes-text').value  = '';
    document.getElementById('p-colors-text').value = '';
    document.getElementById('p-variants-text').value = '';
    renderTagChips('sizes');
    renderTagChips('colors');
    renderTagChips('variants');`;

html = html.replace(oldInit, newInit);

const oldVars = `let productSizes = [];
let productColors = [];`;
const newVars = `let productSizes = [];
let productColors = [];
let productVariants = [];`;
html = html.replace(oldVars, newVars);

const oldRender = `const arr  = field === 'sizes' ? productSizes : productColors;
    wrap.innerHTML = arr.map((val, i) => \`
      <span class="tag-chip">\${val}<button type="button" onclick="removeTag('\${field}',\${i})">o </button></span>
    \`).join('');`;
    
const newRender = `const arr  = field === 'sizes' ? productSizes : (field === 'colors' ? productColors : productVariants);
    wrap.innerHTML = arr.map((val, i) => {
      const isOOS = typeof val === 'string' && val.endsWith(' (OOS)');
      return \`<span class="tag-chip" style="\${isOOS ? 'text-decoration:line-through;opacity:0.6;cursor:pointer' : 'cursor:pointer'}" onclick="toggleOOS('\${field}',\${i})" title="Click to toggle Out of Stock">\${val.replace(' (OOS)','')}\${isOOS?' <small style="color:red">[OOS]</small>':''}<button type="button" onclick="removeTag('\${field}',\${i}); event.stopPropagation();">o </button></span>\`;
    }).join('');`;
html = html.replace(oldRender, newRender);

const oldHelper1 = `const arr = field === 'sizes' ? productSizes : productColors;`;
const newHelper1 = `const arr = field === 'sizes' ? productSizes : (field === 'colors' ? productColors : productVariants);`;
html = html.replace(new RegExp(oldHelper1.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newHelper1);

const oldPayload = `sizes:       (() => { const t=document.getElementById('p-sizes-text').value.trim(); if(t) addTag('sizes',t); return productSizes; })(),
      colors:      (() => { const t=document.getElementById('p-colors-text').value.trim(); if(t) addTag('colors',t); return productColors; })(),`;

const newPayload = `variants:    (() => { const t=document.getElementById('p-variants-text').value.trim(); if(t) addTag('variants',t); return productVariants; })(),
      sizes:       (() => { const t=document.getElementById('p-sizes-text').value.trim(); if(t) addTag('sizes',t); return productSizes; })(),
      colors:      (() => { const t=document.getElementById('p-colors-text').value.trim(); if(t) addTag('colors',t); return productColors; })(),`;
html = html.replace(oldPayload, newPayload);

fs.writeFileSync('admin/index.html', html);
console.log('Fixed admin/index.html');

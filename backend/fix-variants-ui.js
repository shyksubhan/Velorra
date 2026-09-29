const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

// 1. Add productVariants global variable
html = html.replace('let productSizes = [];\n  let productColors = [];', 'let productSizes = [];\n  let productColors = [];\n  let productVariants = [];');

// 2. Fix renderTagChips
const oldRenderTagChips = `function renderTagChips(field) {
    const wrap = document.getElementById(\`p-\${field}-chips\`);
    const arr  = field === 'sizes' ? productSizes : productColors;
    wrap.innerHTML = arr.map((val, i) => \`
      <span class="tag-chip">\${val}<button type="button" onclick="removeTag('\${field}',\${i})">×</button></span>
    \`).join('');
  }`;
const newRenderTagChips = `function renderTagChips(field) {
    const wrap = document.getElementById(\`p-\${field}-chips\`);
    if (!wrap) return;
    const arr = field === 'sizes' ? productSizes : (field === 'colors' ? productColors : productVariants);
    wrap.innerHTML = arr.map((val, i) => \`
      <span class="tag-chip" style="\${val.includes('(OOS)') ? 'text-decoration:line-through;opacity:0.6' : ''}" onclick="toggleOOS('\${field}', \${i})">\${val.replace(' (OOS)', '')}\${val.includes('(OOS)') ? ' (OOS)' : ''}<button type="button" onclick="event.stopPropagation(); removeTag('\${field}',\${i})">×</button></span>
    \`).join('');
  }`;
html = html.replace(/function renderTagChips\(field\) {[\s\S]*?\.join\(''\);\s*\}/, newRenderTagChips);

// 3. Add to openProductModal
const oldOpenModal = `productSizes  = [...(product?.sizes  || [])];
    productColors = [...(product?.colors || [])];
    document.getElementById('p-sizes-text').value  = '';
    document.getElementById('p-colors-text').value = '';
    renderTagChips('sizes');
    renderTagChips('colors');`;
const newOpenModal = `productVariants = [...(product?.variants || [])];
    productSizes  = [...(product?.sizes  || [])];
    productColors = [...(product?.colors || [])];
    document.getElementById('p-variants-text').value  = '';
    document.getElementById('p-sizes-text').value  = '';
    document.getElementById('p-colors-text').value = '';
    renderTagChips('variants');
    renderTagChips('sizes');
    renderTagChips('colors');`;
html = html.replace(oldOpenModal, newOpenModal);

// 4. Add to saveProduct
const oldSave = `sizes:       (() => { const t=document.getElementById('p-sizes-text').value.trim(); if(t) addTag('sizes',t); return productSizes; })(),
    colors:      (() => { const t=document.getElementById('p-colors-text').value.trim(); if(t) addTag('colors',t); return productColors; })(),`;
const newSave = `variants:    (() => { const t=document.getElementById('p-variants-text')?.value.trim(); if(t) addTag('variants',t); return productVariants; })(),
    sizes:       (() => { const t=document.getElementById('p-sizes-text')?.value.trim(); if(t) addTag('sizes',t); return productSizes; })(),
    colors:      (() => { const t=document.getElementById('p-colors-text')?.value.trim(); if(t) addTag('colors',t); return productColors; })(),`;
html = html.replace(oldSave, newSave);

// 5. Add HTML input
const oldFormGroup = `<div class="form-row">
        <div class="form-group">
          <label>Sizes`;
const newFormGroup = `<div class="form-group">
          <label>Variants (Design Types) <span style="color:var(--muted);font-weight:400">(press Enter)</span></label>
          <div class="tag-input-wrap" id="p-variants-wrap">
            <div class="tag-chips" id="p-variants-chips"></div>
            <input id="p-variants-text" placeholder="e.g. Design 1" onkeydown="handleTagKeydown(event,'variants')"/>
          </div>
        </div>
        <div class="form-row">
        <div class="form-group">
          <label>Sizes`;
html = html.replace(oldFormGroup, newFormGroup);

fs.writeFileSync('admin/index.html', html);
console.log('Fixed Variants in Admin Product form');

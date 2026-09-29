const fs = require('fs');
let html = fs.readFileSync('product.html', 'utf8');

const regex = /const sizesHTML = \([\s\S]*?\n  const colorsHTML = \([\s\S]*?\n  const stockHTML/;

const replacement = `const parseOpts = (arr, type) => {
    if (!arr || !arr.length) return '';
    return \`<p class="pd-option-label">\${type}</p>
       <div class="\${type.toLowerCase()}-options">
         \${arr.map(item => {
           let name = typeof item === 'string' ? item : item.name;
           let isOOS = false;
           if (name.endsWith(' (OOS)')) {
             isOOS = true;
             name = name.replace(' (OOS)', '').trim();
           }
           const classes = [type.toLowerCase() + '-opt'];
           if (isOOS) classes.push('disabled');
           return \`<div class="\${classes.join(' ')}" data-\${type.toLowerCase()}="\${name}" \${isOOS ? 'style="opacity:0.4;cursor:not-allowed;text-decoration:line-through;"' : ''}>\${name}</div>\`;
         }).join('')}
       </div>\`;
  };

  const sizesHTML = parseOpts(product.sizes, 'Size');
  const colorsHTML = parseOpts(product.colors, 'Color');
  const variantsHTML = parseOpts(product.variants, 'Variant');

  const stockHTML`;

html = html.replace(regex, replacement);

const btnRegex = /const size = root\.querySelector\('\.size-opt\.active'\)\?\.dataset\.size;[\s\S]*?const color = root\.querySelector\('\.color-opt\.active'\)\?\.dataset\.color;[\s\S]*?const variant = \[size, color\]\.filter\(Boolean\)\.join\(' - '\) \|\| 'Standard';/g;

const newBtnLogic = `const size = root.querySelector('.size-opt.active')?.dataset.size;
        const color = root.querySelector('.color-opt.active')?.dataset.color;
        const variantOpt = root.querySelector('.variant-opt.active')?.dataset.variant;
        const variant = [variantOpt, size, color].filter(Boolean).join(' - ') || 'Standard';`;

html = html.replace(btnRegex, newBtnLogic);

// Add initialization logic for all options to prevent selecting disabled ones, and default select the first non-disabled one
const initRegex = /root\.querySelectorAll\('\.size-opt, \.color-opt'\)\.forEach\(opt => {[\s\S]*?\}\);/g;
const newInit = `root.querySelectorAll('.size-opt:not(.disabled)').forEach((opt, idx, arr) => { if (idx === 0) opt.classList.add('active'); });
    root.querySelectorAll('.color-opt:not(.disabled)').forEach((opt, idx, arr) => { if (idx === 0) opt.classList.add('active'); });
    root.querySelectorAll('.variant-opt:not(.disabled)').forEach((opt, idx, arr) => { if (idx === 0) opt.classList.add('active'); });

    root.querySelectorAll('.size-opt, .color-opt, .variant-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        if (opt.classList.contains('disabled')) return;
        const container = opt.parentElement;
        container.querySelectorAll('div').forEach(c => c.classList.remove('active'));
        opt.classList.add('active');
      });
    });`;

html = html.replace(initRegex, newInit);

// Inject variantsHTML into the DOM string
html = html.replace(/\$\{sizesHTML\}\s*\$\{colorsHTML\}/, '${variantsHTML}\n          ${sizesHTML}\n          ${colorsHTML}');

fs.writeFileSync('product.html', html);
console.log('Fixed product.html');

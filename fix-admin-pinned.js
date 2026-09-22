const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'backend/admin/index.html');
let content = fs.readFileSync(p, 'utf8');

content = content.replace("renderProductsTable();\n    } catch", 
`renderProductsTable();
      updatePinnedProductsDropdown();
    } catch`);

content = content.replace("async function loadUsers() {", 
`function updatePinnedProductsDropdown() {
    const sel = document.getElementById('pinned-sel');
    if (!sel) return;
    let optgroup = sel.querySelector('optgroup[label="🛍️ Spotlight Products"]');
    if (!optgroup) {
      optgroup = document.createElement('optgroup');
      optgroup.label = "🛍️ Spotlight Products";
      sel.appendChild(optgroup);
    }
    optgroup.innerHTML = '';
    allProducts.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = 'Spotlight: ' + p.name;
      optgroup.appendChild(opt);
    });
  }
  
  async function loadUsers() {`);

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed pinned dropdown JS');

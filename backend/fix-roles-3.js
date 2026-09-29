const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

// Remove nav-products from the restricted array
html = html.replace(/\[\'nav-dashboard\',\'nav-products\',\'nav-subscribers\',\'nav-roles\',\'nav-settings\',\'nav-coupons\'\]/, 
  "['nav-dashboard','nav-subscribers','nav-roles','nav-settings','nav-coupons']");

// Hide the cost input when adding/editing a product
// <div class="form-group"><label>Cost (PKR) <span style="color:var(--muted);font-weight:400">...</span></label><input type="number" id="p-cost" /></div>
const costFormGroup = `<div class="form-group cost-cell"><label>Cost (PKR) <span style="color:var(--muted);font-weight:400">(Your purchase price)</span></label><input type="number" id="p-cost" /></div>`;
html = html.replace(/<div class="form-group"><label>Cost \(PKR\) <span style="color:var\(--muted\);font-weight:400">\(Your purchase price\)<\/span><\/label><input type="number" id="p-cost" \/><\/div>/g, costFormGroup);

fs.writeFileSync('admin/index.html', html);
console.log('Fixed Roles part 3');

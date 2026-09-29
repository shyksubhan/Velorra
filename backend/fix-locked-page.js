const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const lockedPageHtml = `
<div id="page-locked" class="page" style="display:none; text-align:center; padding: 150px 20px;">
  <i class="fa-solid fa-lock" style="font-size:4rem; color:#dcdcdc; margin-bottom: 20px;"></i>
  <h2 style="color:var(--muted)">Access Denied</h2>
  <p style="color:var(--muted)">You do not have permission to view this section.</p>
</div>
`;
html = html.replace(/<div id="page-spendings" class="page" style="display:none; width: 100%;">[\s\S]*?<\/div>/, match => match + lockedPageHtml);

const showPageRegex = /function showPage\(name\) \{/;
const newShowPage = `function showPage(name) {
    if (typeof isSupportStaff === 'function' && isSupportStaff()) {
      const lockedPages = ['dashboard', 'subscribers', 'roles', 'settings', 'coupons', 'spendings', 'invoices', 'abandoned', 'visitors', 'reviews', 'stock', 'stock-needed'];
      if (lockedPages.includes(name)) {
        name = 'locked';
      }
    }
`;
html = html.replace(showPageRegex, newShowPage);

fs.writeFileSync('admin/index.html', html);
console.log('Added locked page functionality!');

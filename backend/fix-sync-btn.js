const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const regexHeader = /<a href="\/" target="_blank" class="btn btn-outline">/;
html = html.replace(regexHeader, `<button class="btn btn-outline" onclick="resyncDatabase()" id="sync-db-btn" style="display:none;margin-right:8px;"><i class="fa-solid fa-arrows-rotate"></i> Sync DB</button>\n        <a href="/" target="_blank" class="btn btn-outline">`);

const jsRegex = /async function loadDashboard\(\) \{/;
const newJS = `async function resyncDatabase() {
    const btn = document.getElementById('sync-db-btn');
    const oldHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-arrows-rotate fa-spin"></i> Syncing...';
    btn.disabled = true;
    try {
      const res = await apiFetch('/admin/resync', { method: 'POST' });
      if (res.ok) {
        toast('Database synced successfully!', 'success');
        if (typeof showPage === 'function') {
          loadDashboard();
          if (document.getElementById('page-social-orders').style.display === 'block') loadSocialOrders();
        }
      } else {
        toast('Failed to sync.', 'error');
      }
    } catch {
      toast('Network error during sync.', 'error');
    }
    btn.innerHTML = oldHtml;
    btn.disabled = false;
  }

  async function loadDashboard() {`;

html = html.replace(jsRegex, newJS);

// Show the button for CEO / Super Admin
const applyRolesRegex = /if \(\['ceo', 'super_admin'\]\.includes\(role\)\) \{/;
const newApplyRoles = `if (['ceo', 'super_admin'].includes(role)) {
    document.getElementById('sync-db-btn')?.style.setProperty('display', 'inline-flex');`;

html = html.replace(applyRolesRegex, newApplyRoles);

fs.writeFileSync('admin/index.html', html);
console.log('Added Sync DB button and logic');

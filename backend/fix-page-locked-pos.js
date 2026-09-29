const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const badCode = `<div id="page-locked" class="page" style="display:none; text-align:center; padding: 150px 20px;">
  <i class="fa-solid fa-lock" style="font-size:4rem; color:#dcdcdc; margin-bottom: 20px;"></i>
  <h2 style="color:var(--muted)">Access Denied</h2>
  <p style="color:var(--muted)">You do not have permission to view this section.</p>
</div>`;

html = html.replace(badCode, '');

const correctLockedPage = `
<!-- LOCKED PAGE -->
<div id="page-locked" class="page" style="display:none; text-align:center; padding: 150px 20px;">
  <i class="fa-solid fa-lock" style="font-size:4rem; color:#dcdcdc; margin-bottom: 20px;"></i>
  <h2 style="color:var(--muted)">Access Denied</h2>
  <p style="color:var(--muted)">You do not have permission to view this section.</p>
</div>
`;

// Insert it right before </main>
html = html.replace(/<\/main>/, correctLockedPage + '\n  </main>');

fs.writeFileSync('admin/index.html', html);
console.log('Fixed page-locked position');

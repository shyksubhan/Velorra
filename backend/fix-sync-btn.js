const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const targetBtn = `<button class="btn btn-outline" onclick="openSettingsModal()"><i class="fa-solid fa-gear"></i> Settings</button>`;
const newBtn = `<button class="btn btn-outline" onclick="syncFirebase()"><i class="fa-solid fa-rotate"></i> Sync Data</button>
      <button class="btn btn-outline" onclick="openSettingsModal()"><i class="fa-solid fa-gear"></i> Settings</button>`;

html = html.replace(targetBtn, newBtn);

const scriptToAdd = `
async function syncFirebase() {
  const ok = await bktConfirm({ title: 'Sync with Firebase?', message: 'This will force the server to reload all data from Firebase. Use this if you manually deleted collections.', confirmText: 'Sync Now', icon: 'fa-rotate' });
  if (!ok) return;
  try {
    const res = await apiFetch('/admin/resync', { method: 'POST' });
    if (res.ok) {
      toast('Server successfully synced with Firebase.', 'success');
      setTimeout(() => location.reload(), 1000);
    } else {
      toast('Failed to sync.', 'error');
    }
  } catch (e) { toast('Network error.', 'error'); }
}
`;

if (!html.includes('function syncFirebase')) {
  html = html.replace('function renderSettings', scriptToAdd + '\nfunction renderSettings');
}

fs.writeFileSync('admin/index.html', html);
console.log('Added Sync Button');

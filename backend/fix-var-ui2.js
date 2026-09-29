const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const match = html.match(/<div class="form-row">\s*<div class="form-group">\s*<label>Sizes/);
if (match) {
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
  html = html.replace(match[0], newFormGroup);
  fs.writeFileSync('admin/index.html', html);
  console.log('REPLACED VARIANTS UI HTML');
} else {
  console.log('NOT FOUND');
}

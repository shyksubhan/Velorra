const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');
if (!html.includes('function toggleOOS')) {
  const insertIndex = html.indexOf('function removeTag');
  const toggleFunc = `function toggleOOS(field, idx) {
    const arr = field === 'sizes' ? productSizes : (field === 'colors' ? productColors : productVariants);
    if (typeof arr[idx] === 'string') {
      if (arr[idx].endsWith(' (OOS)')) arr[idx] = arr[idx].replace(' (OOS)', '');
      else arr[idx] += ' (OOS)';
      renderTagChips(field);
    }
  }\n  `;
  html = html.substring(0, insertIndex) + toggleFunc + html.substring(insertIndex);
  fs.writeFileSync('admin/index.html', html);
  console.log('Added toggleOOS');
}

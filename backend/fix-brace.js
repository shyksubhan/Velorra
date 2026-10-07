const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const regex = /function handleTagKeydown\(event, field\) \{\s*if \(event\.key === 'Enter' \|\| event\.keyCode === 13 \|\| event\.key === ','\) \{\s*event\.preventDefault\(\);\s*addTag\(field, event\.target\.value\);\s*event\.target\.value = '';\s*\} else if \(event\.key === 'Backspace' && event\.target\.value === ''\) \{\s*\/\* Backspace on empty input removes the last chip \*\/\s*const arr = field === 'sizes' \? productSizes : \(field === 'colors' \? productColors : productVariants\);\s*if \(arr\.length\) \{ arr\.pop\(\); renderTagChips\(field\); \}\s*\}\s*\}\s*\}/;

const fixed = `function handleTagKeydown(event, field) {
    if (event.key === 'Enter' || event.keyCode === 13 || event.key === ',') {
      event.preventDefault();
      addTag(field, event.target.value);
      event.target.value = '';
    } else if (event.key === 'Backspace' && event.target.value === '') {
      /* Backspace on empty input removes the last chip */
      const arr = field === 'sizes' ? productSizes : (field === 'colors' ? productColors : productVariants);
      if (arr.length) { arr.pop(); renderTagChips(field); }
    }
  }`;

html = html.replace(regex, fixed);
fs.writeFileSync('admin/index.html', html);
console.log('Fixed extra brace');

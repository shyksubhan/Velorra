const fs = require('fs');
let html = fs.readFileSync('admin/index.html', 'utf8');

const regex = /function handleTagKeydown\(event, field\) \{[\s\S]*?\}\s*\}/;
const newFn = `function handleTagKeydown(event, field) {
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

html = html.replace(regex, newFn);

const blurRegex1 = /id="p-variants-text" placeholder="e\.g\. Design 1" onkeydown="handleTagKeydown\(event,'variants'\)"/;
html = html.replace(blurRegex1, `id="p-variants-text" placeholder="e.g. Design 1" onkeydown="handleTagKeydown(event,'variants')" onblur="if(this.value.trim()){ addTag('variants', this.value); this.value=''; }"`);

const blurRegex2 = /id="p-sizes-text" placeholder="e\.g\. Large" onkeydown="handleTagKeydown\(event,'sizes'\)"/;
html = html.replace(blurRegex2, `id="p-sizes-text" placeholder="e.g. Large" onkeydown="handleTagKeydown(event,'sizes')" onblur="if(this.value.trim()){ addTag('sizes', this.value); this.value=''; }"`);

const blurRegex3 = /id="p-colors-text" placeholder="e\.g\. Pink" onkeydown="handleTagKeydown\(event,'colors'\)"/;
html = html.replace(blurRegex3, `id="p-colors-text" placeholder="e.g. Pink" onkeydown="handleTagKeydown(event,'colors')" onblur="if(this.value.trim()){ addTag('colors', this.value); this.value=''; }"`);

fs.writeFileSync('admin/index.html', html);
console.log('Fixed handleTagKeydown and added onblur handlers');

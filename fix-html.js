const fs = require('fs');
const path = require('path');

const dir = __dirname;
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(dir, file);
  let html = fs.readFileSync(filePath, 'utf8');

  html = html.replace(/<!-- LINE 2: Home \| About \| Contact -->\s*<div class="header-row header-nav-main">[\s\S]*?<\/div>\s*<\/div>/g, '');

  if (!html.includes('>About Us</a>')) {
    html = html.replace(/<li><a href="contact(\.html)?">Contact Us<\/a><\/li>/g, '<li><a href="about">About Us</a></li>\n            <li><a href="contact">Contact Us</a></li>');
  }

  fs.writeFileSync(filePath, html);
  console.log('Processed ' + file);
});

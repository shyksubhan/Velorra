const fs = require('fs');
let css = fs.readFileSync('css/style.css', 'utf8');

css = css.replace(
  /\.premium-cat-grid \{\s*display: flex;\s*justify-content: center;/,
  '.premium-cat-grid {\n  display: flex;\n  justify-content: flex-start;'
);

fs.writeFileSync('css/style.css', css, 'utf8');

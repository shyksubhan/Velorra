const fs = require('fs');

let js = fs.readFileSync('js/products-render.js', 'utf8');

// Replace the filter line that drops spotlight products
js = js.replace(/pinnedData = pinnedData\.filter\(pin =>[^;]+;/g, "pinnedData = pinnedData.filter(pin => true); // keep all");

fs.writeFileSync('js/products-render.js', js, 'utf8');
console.log("Fixed products-render.js");

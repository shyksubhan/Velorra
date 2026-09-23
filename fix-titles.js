const fs = require('fs');

function updateFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  
  const toInject = `
    'new-arrivals': { title: 'New <em style="color: var(--gold);">Arrivals</em>', desc: 'Explore the latest additions to our premium jewelry collection. Fresh styles and elegant designs just for you.' },
    'trending-now': { title: 'Trending <em style="color: var(--gold);">Now</em>', desc: 'Discover our most popular and highly sought-after jewelry pieces. Shop the trends everyone is loving.' },`;
    
  if (!content.includes("'new-arrivals': {")) {
    // Inject right after const data = {
    content = content.replace(/const data = {/, "const data = {" + toInject);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Updated " + file);
  } else {
    console.log(file + " already updated.");
  }
}

updateFile('jewelry.html');
updateFile('shop.html');

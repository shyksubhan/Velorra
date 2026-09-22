const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'js/products-render.js');
let content = fs.readFileSync(p, 'utf8');

const replacement = `
        pinnedData.forEach(pin => {
          const singleProduct = allProducts.find(prod => prod.id === pin.id);

          if (singleProduct) {
            // Render Spotlight Product Block
            const section = document.createElement('section');
            section.className = 'pinned-spotlight-section';
            section.style.cssText = 'padding:80px 0; border-bottom:1px solid rgba(0,0,0,0.03);';
            
            const mainImg = singleProduct.images?.[0] || 'images/placeholder.jpg';
            const priceHtml = singleProduct.price < singleProduct.comparePrice 
              ? \`<del style="color:var(--muted);font-size:1rem;margin-right:8px">PKR \${Number(singleProduct.comparePrice).toLocaleString()}</del> PKR \${Number(singleProduct.price).toLocaleString()}\`
              : \`PKR \${Number(singleProduct.price).toLocaleString()}\`;

            section.innerHTML = \`
              <div class="container" style="display:flex; flex-wrap:wrap; gap:40px; align-items:center;">
                <div style="flex:1; min-width:300px;">
                  <a href="product.html?id=\${singleProduct.id}" style="display:block; overflow:hidden; border-radius:12px; box-shadow:0 12px 40px rgba(0,0,0,0.06);">
                    <img src="\${mainImg}" style="width:100%; display:block; transition:transform 0.5s ease;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" />
                  </a>
                </div>
                <div style="flex:1; min-width:300px; display:flex; flex-direction:column; justify-content:center;">
                  <div style="font-size:0.75rem; letter-spacing:0.2em; text-transform:uppercase; color:var(--gold); margin-bottom:12px; font-weight:700;">Featured Spotlight</div>
                  <h2 style="font-family:var(--font-display); font-size:clamp(2rem, 3vw, 2.8rem); line-height:1.2; margin-bottom:16px; color:var(--text);">\${singleProduct.name}</h2>
                  <div style="font-size:1.2rem; font-weight:600; margin-bottom:24px; color:var(--text);">\${priceHtml}</div>
                  <p style="color:var(--text-mid); line-height:1.6; margin-bottom:32px; font-size:0.95rem; max-width:90%;">\${singleProduct.description || 'Discover elegance with this exclusive piece, crafted to perfection.'}</p>
                  <a href="product.html?id=\${singleProduct.id}" class="btn-primary" style="align-self:flex-start; text-decoration:none; display:inline-block; padding:16px 40px; border-radius:4px;">Shop Now</a>
                </div>
              </div>
            \`;
            pinnedContainer.appendChild(section);
            return;
          }

          const pinProducts = allProducts.filter(p => {
`;

content = content.replace(/pinnedData\.forEach\(pin => \{\s+const pinProducts = allProducts\.filter\(p => \{/g, replacement);

fs.writeFileSync(p, content, 'utf8');
console.log('Fixed pinned renderer');

const fs = require('fs');
const cssPath = 'css/style.css';
let css = fs.readFileSync(cssPath, 'utf8');

// Fix the broken section: from "@media (max-width: 768px)" near the end through to end of file
// Find the LAST occurrence of "@media (max-width: 768px)" which is the broken one
const lastMediaIdx = css.lastIndexOf('@media (max-width: 768px) {\n  .cat-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }');
if (lastMediaIdx === -1) {
  console.log('Could not find target. Trying alternate...');
  // Try with \r\n
  const altIdx = css.lastIndexOf('@media (max-width: 768px) {\r\n  .cat-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }');
  if (altIdx === -1) {
    console.log('ERROR: Could not find the broken section');
    process.exit(1);
  }
  css = css.substring(0, altIdx);
} else {
  css = css.substring(0, lastMediaIdx);
}

// Append the corrected full section
css += `@media (max-width: 768px) {
  .cat-grid { grid-template-columns: repeat(2, 1fr); gap: 14px; }
  .cat-img-card .cat-name { font-size: 0.92rem; }
  .cat-img-info { padding: 16px 14px 14px; }
  .cat-cta-pill { display: none; }
  .cat-row-3 {
    gap: 14px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    justify-content: unset;
  }
  .cat-row-3 .cat-card { width: 100%; }
}
@media (max-width: 400px) {
  .cat-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .cat-row-3 {
    gap: 10px;
    grid-template-columns: repeat(2, 1fr);
  }
  .cat-row-3 .cat-card { width: 100%; }
}

/* 🔸 Premium Categories Grid (Home) 🔸 */
.premium-cat-grid {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  gap: 30px;
  flex-wrap: nowrap;
  overflow-x: auto;
  padding-bottom: 15px;
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.premium-cat-grid::-webkit-scrollbar {
  display: none;
}
.premium-cat-card {
  position: relative;
  flex: 0 0 auto;
  width: 150px;
  display: block;
  text-decoration: none;
  text-align: center;
  transition: transform 0.4s ease;
}
.premium-cat-card:hover {
  transform: translateY(-8px);
}
.premium-cat-card .cat-img-wrap {
  position: relative;
  overflow: hidden;
  border-radius: 50%;
  aspect-ratio: 1 / 1;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
  border: 1px solid var(--border-soft);
  background: var(--bg-deep);
  transition: box-shadow 0.4s ease, border-color 0.4s ease;
  margin: 0 auto;
}
.premium-cat-card:hover .cat-img-wrap {
  box-shadow: 0 24px 60px rgba(184,136,58,0.2);
  border-color: var(--gold);
}
.premium-cat-card .cat-img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
  transition: transform 0.8s cubic-bezier(0.25,1,0.25,1);
}
.premium-cat-card:hover .cat-img-wrap img {
  transform: scale(1.08);
}
.premium-cat-card .cat-img-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0,0,0,0) 40%, rgba(0,0,0,0.2) 100%);
  transition: opacity 0.4s;
  border-radius: 50%;
  opacity: 0;
}
.premium-cat-card:hover .cat-img-overlay {
  opacity: 1;
}
.premium-cat-card .cat-img-info {
  position: static;
  display: block;
  padding: 15px 5px 5px;
  text-align: center;
  z-index: 2;
}
.premium-cat-card .cat-name {
  font-family: var(--font-display);
  font-size: 1.3rem;
  font-weight: 500;
  color: var(--text);
  margin: 0;
  line-height: 1.2;
  letter-spacing: 0.05em;
  text-shadow: none;
}

@media (max-width: 900px) {
  .premium-cat-grid {
    justify-content: flex-start;
    padding: 0 5%;
    gap: 20px;
  }
  .premium-cat-card {
    width: 110px;
  }
}
@media (max-width: 600px) {
  .premium-cat-grid {
    gap: 15px;
  }
  .premium-cat-card {
    width: 80px;
  }
  .premium-cat-card .cat-name {
    font-size: 0.85rem;
    font-family: var(--font-ui);
    font-weight: 600;
  }
  .premium-cat-card .cat-img-info {
    padding: 10px 2px 2px;
  }
}
`;

fs.writeFileSync(cssPath, css, 'utf8');
console.log('✅ Premium categories grid CSS fully restored!');

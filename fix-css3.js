const fs = require('fs');
let css = fs.readFileSync('css/style.css', 'utf8');

const startMarker = '/* ====== USER REVISION 17: Hero Carousel';
const startIndex = css.indexOf(startMarker);

if (startIndex !== -1) {
  css = css.substring(0, startIndex);
}

// Remove previous flex overrides for desktop text wrapper and hero layout
css = css.replace(/\.hero-desktop-only \.hero-layout\s*\{[\s\S]*?\}\s*\.hero-desktop-only \.desktop-text-wrapper\s*\{[\s\S]*?\}/g, '');

const newCSS = `/* ====== USER REVISION 17: Hero Carousel Final Layout Tweaks ====== */
@media (min-width: 769px) {
  .hero-desktop-only {
    position: relative !important;
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
  }

  /* Center the layout for the carousel to keep its exact previous position */
  .hero-desktop-only .hero-layout {
    max-width: 1500px !important;
    margin: 0 auto !important;
    padding: 60px 40px !important;
    justify-content: flex-end !important; /* Keeps carousel on the right side of the 1500px box */
  }
  
  /* Rip the text out of the flex flow and nail it to the absolute left of the screen */
  .hero-desktop-only .desktop-text-wrapper {
    position: absolute !important;
    left: 4% !important; /* Full left edge */
    top: 50% !important;
    transform: translateY(-50%) !important;
    width: 500px !important;
    height: auto !important;
    padding: 0 !important;
    z-index: 20 !important;
  }

  /* Widen and heighten the 3D Carousel (same sizes as approved) */
  .hero-visual-side-3d {
    flex: 0 0 650px !important; 
    height: 580px !important;
  }
  
  .desktop-3d-card {
    width: 360px !important; 
    height: 540px !important;
    background: transparent !important; /* No more black flashes */
  }
}
`;

fs.writeFileSync('css/style.css', css + newCSS);
console.log('Fixed CSS layout completely');

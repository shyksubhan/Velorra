const fs = require('fs');
let css = fs.readFileSync('css/style.css', 'utf8');

const additions = \
/* ====== NEW SPACIOUS LAYOUT OVERRIDES ====== */
@media (min-width: 769px) {
  /* Header Spacing */
  .header-top-inner { padding: 40px 48px 25px 48px !important; }
  .header-nav-main { padding: 24px 0 !important; }
  .header-nav-main a { font-size: 0.95rem !important; letter-spacing: 0.25em !important; }
  .nav-logo-link img { height: 48px !important; transition: height 0.3s; }
  .header-search input { font-size: 0.95rem !important; padding: 12px 20px !important; }
  .header-search button { padding: 12px 20px !important; }
  
  /* Hero Section */
  .hero-layout { padding: 80px 40px !important; gap: 100px !important; }
  .hero-title-main { 
    font-size: clamp(3.5rem, 5vw, 5.5rem) !important; 
    line-height: 1.15 !important; 
    margin-bottom: 24px !important; 
  }
  .hero-title-sub { 
    font-size: 1.3rem !important; 
    letter-spacing: 0.15em !important; 
    margin-bottom: 40px !important; 
  }
  .hero-visual-side {
    height: 650px !important;
    max-height: 80vh !important;
  }
}
\;

fs.writeFileSync('css/style.css', css + '\n' + additions, 'utf8');
console.log('Spacious layout CSS appended.');

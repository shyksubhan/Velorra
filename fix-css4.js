const fs = require('fs');
let css = fs.readFileSync('css/style.css', 'utf8');

const oldRev19 = `/* ====== USER REVISION 19: Push Videos to Right Side ====== */
@media (min-width: 769px) {
  .hero-desktop-only .hero-layout {
    /* Push items apart */
    justify-content: space-between !important;
  }
  
  .hero-visual-side-3d {
    /* Stop it from stretching all the way to text, force it to the right */
    flex: 0 0 700px !important; 
    margin-left: auto !important;
  }

  .desktop-3d-card {
    /* Shift the center point of the 3D stack more to the right */
    left: 65% !important;
  }
}`;

const newRev19 = `/* ====== USER REVISION 19: Balanced Center-Right Positioning ====== */
@media (min-width: 769px) {
  .hero-desktop-only .hero-layout {
    justify-content: flex-start !important; 
    gap: 80px !important; /* Distance between text and carousel */
  }
  
  .hero-desktop-only .desktop-text-wrapper {
    flex: 0 0 450px !important; /* Fix text width */
    padding-right: 0 !important;
  }
  
  .hero-visual-side-3d {
    flex: 1 !important; /* Carousel takes all remaining space */
    margin-left: 0 !important;
  }

  .desktop-3d-card {
    /* Cluster center is pushed right enough to not bleed into text, but left enough to fill empty space */
    left: 60% !important;
  }
}`;

css = css.replace(oldRev19, newRev19);
fs.writeFileSync('css/style.css', css);
console.log('Updated CSS');

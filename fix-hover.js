const fs = require('fs');

const replacement = `if (slides.length > 1) {
          dotsContainer.innerHTML = slides.map((_, i) => \`<div class="dot \${i === 0 ? 'active' : ''}" data-idx="\${i}"></div>\`).join('');
          let currentSlide = 0;
          
          // Mobile Elements
          const mobileSlides = wrapper.querySelectorAll('.hero-mobile-only .hero-slide');
          
          // Desktop Elements
          const textCards = wrapper.querySelectorAll('.desktop-text-card');
          const visualCards = wrapper.querySelectorAll('.desktop-3d-card');
          const dotElements = dotsContainer.querySelectorAll('.dot');
          const total = slides.length;

          const update3DCarousel = (curr) => {
            visualCards.forEach((card, i) => {
              let offset = i - curr;
              if (offset > Math.floor(total / 2)) offset -= total;
              if (offset < -Math.floor(total / 2)) offset += total;
              
              if (offset === 0) {
                card.style.transform = 'translate(-50%, -50%) scale(1.2)';
                card.style.zIndex = 10;
                card.style.opacity = 1;
                card.style.filter = 'blur(0px) brightness(1)';
              } else if (offset === 1) {
                card.style.transform = 'translate(15%, -50%) scale(0.8)';
                card.style.zIndex = 5;
                card.style.opacity = 0.8;
                card.style.filter = 'blur(2px) brightness(0.6)';
              } else if (offset === -1 || (total === 2 && offset === 1)) {
                card.style.transform = 'translate(-115%, -50%) scale(0.8)';
                card.style.zIndex = 5;
                card.style.opacity = 0.8;
                card.style.filter = 'blur(2px) brightness(0.6)';
              } else {
                card.style.transform = \`translate(\${offset > 0 ? '100%' : '-200%'}, -50%) scale(0.7)\`;
                card.style.zIndex = 1;
                card.style.opacity = 0;
              }
            });
          };

          const goToSlide = (idx) => {
            mobileSlides[currentSlide]?.classList.remove('active');
            dotElements[currentSlide]?.classList.remove('active');
            textCards[currentSlide]?.classList.remove('active');
            currentSlide = idx;
            mobileSlides[currentSlide]?.classList.add('active');
            dotElements[currentSlide]?.classList.add('active');
            textCards[currentSlide]?.classList.add('active');
            update3DCarousel(currentSlide);
          };

          update3DCarousel(0);

          dotElements.forEach(d => d.addEventListener('click', () => goToSlide(Number(d.dataset.idx))));
          
          let heroInterval = setInterval(() => { goToSlide((currentSlide + 1) % slides.length); }, 4000);
          
          // Pause on hover
          const desktopVisualWrapper = document.getElementById('desktop-visual-wrapper');
          if (desktopVisualWrapper) {
            desktopVisualWrapper.addEventListener('mouseenter', () => clearInterval(heroInterval));
            desktopVisualWrapper.addEventListener('mouseleave', () => {
              heroInterval = setInterval(() => { goToSlide((currentSlide + 1) % slides.length); }, 4000);
            });
          }
        }`;

let html = fs.readFileSync('index.html', 'utf8');
const startIndex = html.indexOf('if (slides.length > 1) {');
const endIndex = html.indexOf('} catch(e) {');
if (startIndex !== -1 && endIndex !== -1) {
  html = html.substring(0, startIndex) + replacement + '\n      ' + html.substring(endIndex);
  fs.writeFileSync('index.html', html);
  console.log('Successfully applied size boost and hover pause!');
} else {
  console.error('Could not find injection boundaries');
}

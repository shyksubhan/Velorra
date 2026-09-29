const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const oldLogic = `// Pause on hover
            const desktopVisualWrapper = document.getElementById('desktop-visual-wrapper');
            if (desktopVisualWrapper) {
              desktopVisualWrapper.addEventListener('mouseenter', () => clearInterval(heroInterval));
              desktopVisualWrapper.addEventListener('mouseleave', () => {
                heroInterval = setInterval(() => { goToSlide((currentSlide + 1) % slides.length); }, 4000);
              });
            }`;

const newLogic = `// Pause on hover (only on cards)
            visualCards.forEach(card => {
              card.addEventListener('mouseenter', () => clearInterval(heroInterval));
              card.addEventListener('mouseleave', () => {
                clearInterval(heroInterval);
                heroInterval = setInterval(() => { goToSlide((currentSlide + 1) % slides.length); }, 4000);
              });
            });`;

html = html.replace(oldLogic, newLogic);
fs.writeFileSync('index.html', html);
console.log('Fixed hover logic');

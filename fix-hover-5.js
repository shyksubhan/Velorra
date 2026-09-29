const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const regex = /\/\/ Pause on hover[\s\S]*?desktopVisualWrapper\.addEventListener\('mouseleave'[\s\S]*?\}\);[\s\S]*?\}/;
const newLogic = `// Pause on hover (only on cards)
            visualCards.forEach(card => {
              card.addEventListener('mouseenter', () => clearInterval(heroInterval));
              card.addEventListener('mouseleave', () => {
                clearInterval(heroInterval);
                heroInterval = setInterval(() => { goToSlide((currentSlide + 1) % slides.length); }, 4000);
              });
            });`;

html = html.replace(regex, newLogic);
fs.writeFileSync('index.html', html);
console.log('Regex matched and replaced');

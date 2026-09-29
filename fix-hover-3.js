const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const startIndex = html.indexOf('// Pause on hover');
const endIndex = html.indexOf('}\n        } catch(e) {');

if (startIndex !== -1 && endIndex !== -1) {
  const newLogic = `// Pause on hover (only on cards)
            visualCards.forEach(card => {
              card.addEventListener('mouseenter', () => clearInterval(heroInterval));
              card.addEventListener('mouseleave', () => {
                clearInterval(heroInterval);
                heroInterval = setInterval(() => { goToSlide((currentSlide + 1) % slides.length); }, 4000);
              });
            });
          `;
  html = html.substring(0, startIndex) + newLogic + html.substring(endIndex);
  fs.writeFileSync('index.html', html);
  console.log('Successfully replaced hover logic by boundaries');
} else {
  console.log('Boundaries not found');
}

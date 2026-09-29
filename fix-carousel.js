const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const replacement = `const update3DCarousel = (curr) => {
            visualCards.forEach((card, i) => {
              let offset = i - curr;
              if (offset > Math.floor(total / 2)) offset -= total;
              if (offset < -Math.floor(total / 2)) offset += total;
              
              if (offset === 0) {
                card.style.transform = 'translate(-50%, -50%) scale(1.1)';
                card.style.zIndex = 10;
                card.style.opacity = 1;
                card.style.filter = 'blur(0px) brightness(1)';
              } else if (offset === 1) {
                card.style.transform = 'translate(10%, -50%) scale(0.85)';
                card.style.zIndex = 5;
                card.style.opacity = 0.9;
                card.style.filter = 'blur(2px) brightness(0.6)';
              } else if (offset === -1 || (total === 2 && offset === 1)) {
                card.style.transform = 'translate(-110%, -50%) scale(0.85)';
                card.style.zIndex = 5;
                card.style.opacity = 0.9;
                card.style.filter = 'blur(2px) brightness(0.6)';
              } else {
                card.style.transform = \`translate(\${offset > 0 ? '100%' : '-200%'}, -50%) scale(0.7)\`;
                card.style.zIndex = 1;
                card.style.opacity = 0;
              }
            });
          };`;

const startIndex = html.indexOf('const update3DCarousel = (curr) => {');
const endIndex = html.indexOf('const goToSlide = (idx) => {');

if (startIndex !== -1 && endIndex !== -1) {
  html = html.substring(0, startIndex) + replacement + '\n\n          ' + html.substring(endIndex);
  fs.writeFileSync('index.html', html);
  console.log('Successfully updated update3DCarousel logic');
} else {
  console.log('Failed to find boundaries');
}

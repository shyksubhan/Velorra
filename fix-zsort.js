const fs = require('fs');

const replacement = `const update3DCarousel = (curr) => {
            visualCards.forEach((card, i) => {
              let offset = i - curr;
              if (offset > Math.floor(total / 2)) offset -= total;
              if (offset < -Math.floor(total / 2)) offset += total;
              
              if (offset === 0) {
                card.style.transform = 'translate(-50%, -50%) translateZ(150px) scale(1.1)';
                card.style.opacity = 1;
                card.style.filter = 'blur(0px) brightness(1)';
              } else if (offset === 1) {
                card.style.transform = 'translate(30%, -50%) translateZ(50px) scale(0.85)';
                card.style.opacity = 0.9;
                card.style.filter = 'blur(2px) brightness(0.6)';
              } else if (offset === -1 || (total === 2 && offset === 1)) {
                card.style.transform = 'translate(-130%, -50%) translateZ(50px) scale(0.85)';
                card.style.opacity = 0.9;
                card.style.filter = 'blur(2px) brightness(0.6)';
              } else {
                card.style.transform = \`translate(\${offset > 0 ? '120%' : '-220%'}, -50%) translateZ(0px) scale(0.7)\`;
                card.style.opacity = 0;
              }
            });
          };`;

let html = fs.readFileSync('index.html', 'utf8');
const startIndex = html.indexOf('const update3DCarousel = (curr) => {');
const endIndex = html.indexOf('const goToSlide = (idx) => {');
if (startIndex !== -1 && endIndex !== -1) {
  html = html.substring(0, startIndex) + replacement + '\n\n          ' + html.substring(endIndex);
  fs.writeFileSync('index.html', html);
  console.log('Successfully applied translateZ logic for smooth Z-sorting!');
} else {
  console.error('Could not find injection boundaries');
}

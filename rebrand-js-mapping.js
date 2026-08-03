const fs = require('fs');
const path = require('path');

const dir = __dirname;
const jsFile = path.join(dir, 'js', 'products-render.js');
let jsContent = fs.readFileSync(jsFile, 'utf8');

// Update JS file
jsContent = jsContent.replace(/GOLNISÀ/g, 'ZARINEHUSN');
jsContent = jsContent.replace(/golnisa/g, 'zarinehusn');

// Modify the dictionary mapping
// Let's redefine it completely using a regex replace.
const newDict = `const ZARINEHUSN_CAT_LABELS = {
  'clips':       'Skincare',
  'catchers':    'Cleansers',
  'scrunchies':  'Serums',
  'hair-bands':  'Moisturizers',
  'pins':        'Toners',
  'ponies':      'Face Masks',
  'fancy':       'Beauty Tools',
  'gift-items':  'Gift Sets',
  
  'bracelets':   'Bracelets',
  'rings':       'Rings',
  'earrings':    'Earrings',
  'necklace':    'Necklaces',
  'bangles':     'Bangles',
  
  'winter-collection': 'Foundations',
  'daily-pret':        'Lipsticks',
  'unstitched':        'Concealers',
  'g-prints':          'Blush',
  'new-arrivals':      'Mascara',
  'trending-now':      'Eyeliner',
  'sale':              'Sale',
  'fancy-wear':        'Perfumes',
  'kaftan':            'Body Lotions',
  'casual':            'Face Powders',
  'party-wear':        'Highlighters',
  'summer-collection': 'Bronzers'
};`;

jsContent = jsContent.replace(/const ZARINEHUSN_CAT_LABELS = {[\s\S]*?};\n/, newDict + '\n');
fs.writeFileSync(jsFile, jsContent, 'utf8');

// Update Clothing HTML (Cosmetics)
const clothingHtmlPath = path.join(dir, 'clothing.html');
let clothingHtml = fs.readFileSync(clothingHtmlPath, 'utf8');
clothingHtml = clothingHtml.replace(/All Clothing/g, 'All Cosmetics');
clothingHtml = clothingHtml.replace(/>Fancy Wear</g, '>Perfumes<');
clothingHtml = clothingHtml.replace(/>Kaftan</g, '>Body Lotions<');
clothingHtml = clothingHtml.replace(/>Casual</g, '>Face Powders<');
clothingHtml = clothingHtml.replace(/>Party Wear</g, '>Highlighters<');
clothingHtml = clothingHtml.replace(/>Summer Collection</g, '>Bronzers<');
clothingHtml = clothingHtml.replace(/>Winter Collection</g, '>Foundations<');
clothingHtml = clothingHtml.replace(/>Daily Pret</g, '>Lipsticks<');
clothingHtml = clothingHtml.replace(/>Unstitched</g, '>Concealers<');
clothingHtml = clothingHtml.replace(/>G\. Prints</g, '>Blush<');
fs.writeFileSync(clothingHtmlPath, clothingHtml, 'utf8');

// Update Hair Accessories HTML (Skincare)
const hairHtmlPath = path.join(dir, 'hair-accessories.html');
let hairHtml = fs.readFileSync(hairHtmlPath, 'utf8');
hairHtml = hairHtml.replace(/All Hair Accessories/g, 'All Skincare');
hairHtml = hairHtml.replace(/>Clips</g, '>Skincare<');
hairHtml = hairHtml.replace(/>Catchers</g, '>Cleansers<');
hairHtml = hairHtml.replace(/>Scrunchies</g, '>Serums<');
hairHtml = hairHtml.replace(/>Hair Bands</g, '>Moisturizers<');
hairHtml = hairHtml.replace(/>Pins</g, '>Toners<');
hairHtml = hairHtml.replace(/>Ponies</g, '>Face Masks<');
hairHtml = hairHtml.replace(/>Fancy</g, '>Beauty Tools<');
hairHtml = hairHtml.replace(/>Gift Items</g, '>Gift Sets<');
fs.writeFileSync(hairHtmlPath, hairHtml, 'utf8');

console.log("Updated mappings.");

# VELORRA — Website Setup Guide

## Folder Structure

```
velorra/
├── index.html          ← Homepage (main entry point)
├── shop.html           ← Product listing / shop page
├── about.html          ← Brand story page
├── contact.html        ← Contact form + info page
├── css/
│   └── style.css       ← ALL styles (one file, no extras needed)
├── js/
│   ├── main.js         ← Cart, chatbot, animations, filters
│   └── three-scene.js  ← 3D hero background (Three.js)
└── images/
    └── logo.svg        ← Velorra logo (use this as favicon too)
```

## How to Run Locally
Just open `index.html` in any web browser. No server or npm install needed.

---

## How to Add Your Products

### In `shop.html` — find the comment:
```html
<!-- ADD YOUR OWN PRODUCTS BELOW THIS LINE ── -->
```

Copy this block and fill in your details:
```html
<div class="product-card" data-category="women">
  <div class="product-img-wrap">
    <img src="images/your-product.jpg" alt="Product Name"
         style="width:100%;height:100%;object-fit:cover;">
    <div class="product-actions">
      <button onclick="addToCart('Product Name', PRICE_IN_PKR, '👗', 'Size / Color')">
        Add to Bag
      </button>
      <button class="wishlist-btn"><i class="fa-regular fa-heart"></i></button>
    </div>
  </div>
  <div class="product-info">
    <p class="product-category">Women · Dresses</p>
    <h3 class="product-name">Your Product Name</h3>
    <div class="product-pricing">
      <span class="product-price">PKR 12,000</span>
      <!-- Optional old price: -->
      <span class="product-price-old">PKR 15,000</span>
    </div>
  </div>
</div>
```

### data-category options (for filter buttons):
- `women`
- `men`
- `jewellery`
- `watches`
- `cosmetics`

### To add a BADGE (New / Bestseller / Sale):
Add inside `.product-img-wrap`:
```html
<span class="product-badge new">New</span>
<span class="product-badge">Bestseller</span>
<span class="product-badge">Sale</span>
```

---

## How to Add Product Images

1. Put your images in the `images/` folder (e.g. `images/dress-1.jpg`)
2. Replace the placeholder div with an `<img>` tag:

```html
<!-- Remove this: -->
<div class="product-img-placeholder">
  <span class="pi-icon">👗</span>
  <span class="pi-label">Women's Dress</span>
</div>

<!-- Add this instead: -->
<img src="images/dress-1.jpg" alt="Ivory Silk Maxi Gown"
     style="width:100%;height:100%;object-fit:cover;">
```

Recommended image size: **600×800px** (portrait, 3:4 ratio)

---

## How to Add Category Images (Homepage)

In `index.html`, find the category cards. Replace:
```html
<div class="cat-bg"><span class="cat-icon-placeholder">W</span></div>
```
With:
```html
<img src="images/cat-women.jpg" class="cat-card-img" alt="Women's Fashion">
```

---

## Customise Your Contact Details

Search for these in all HTML files and replace:
- `hello@velorra.com` → your real email
- `+92 300 000 0000` → your WhatsApp/phone
- `https://instagram.com/velorra` → your real Instagram URL
- `https://facebook.com/velorra` → your real Facebook URL

---

## Domain & Hosting (Free Options)
- **Netlify** (recommended): Drag & drop your `velorra/` folder at netlify.com → deploy instantly → connect your domain
- **GitHub Pages**: Push to GitHub, enable Pages in settings
- **Hostinger** (paid, Pakistan-friendly): Affordable hosting, supports custom domains

## Domain Suggestion
Register `velorra.com` or `velorra.pk` at:
- Namecheap.com
- GoDaddy.com
- PKNIC.net (for .pk domains)

---

## Social Media Handles to Register
- Instagram: @velorra or @velorraofficial
- Facebook: /velorra or /velorraofficial
- TikTok: @velorra

---

## Cart / Checkout Note
The cart saves to browser localStorage. For real payments, integrate:
- **WhatsApp checkout**: Order button → opens WhatsApp with order summary
- **COD form**: Simple form that emails you the order
- **Shopify / WooCommerce**: For full e-commerce with payment gateways

For a simple WhatsApp checkout button, replace the checkout button with:
```html
<a href="javascript:void(0)" onclick="whatsappCheckout()" 
   class="btn-primary cart-checkout" style="display:block;...">
  Order via WhatsApp
</a>
```

And add this function to main.js:
```js
function whatsappCheckout() {
  const items = cart.map(i => `${i.qty}x ${i.name} — PKR ${i.price*i.qty}`).join('%0A');
  const total = cart.reduce((s,i)=>s+i.price*i.qty,0);
  window.open(`https://wa.me/923000000000?text=Hi! I'd like to order:%0A${items}%0ATotal: PKR ${total}`);
}
```

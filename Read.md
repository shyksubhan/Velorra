# Velorra Website — Complete Customization Guide
### A step-by-step tutorial for beginners

---

> **How to open and edit files:**
> Use any code editor. The best free option is **VS Code** (Visual Studio Code).
> Download it free from: https://code.visualstudio.com
> Once installed: File → Open Folder → select your `Ecommerce_fixed` folder.
> Every file mentioned below will appear in the left sidebar. Click to open.

---

## PART 1 — Connect Your WhatsApp Number

**File to open:** `js/whatsapp-config.js`

This is the MOST IMPORTANT file. It controls your WhatsApp button, social media links, and contact information across the ENTIRE website. You only edit this ONE file and it updates everywhere automatically.

---

### Step 1.1 — Add Your WhatsApp Number

Open `js/whatsapp-config.js` and go to **line 10**:

```
number:  '923000000000',
```

Replace `923000000000` with your own number.

**How to write your number correctly:**
- Start with your country code (Pakistan = 92)
- Then write your number WITHOUT the leading zero
- NO spaces, NO dashes, NO plus sign (+)

**Example:**
If your number is `0312-4567890`, you write it as `923124567890`

So line 10 becomes:
```
number:  '923124567890',
```

---

### Step 1.2 — Change the WhatsApp Welcome Message

On **line 11**:
```
message: 'Hi! I found you on Velorra and I have a question.',
```

Change the text inside the quotes to whatever message you want customers to send first.

**Example:**
```
message: 'Hi! I want to place an order.',
```

---

## PART 2 — Connect Your Instagram and Facebook

Still in `js/whatsapp-config.js`:

---

### Step 2.1 — Instagram Link

Go to **line 16**:
```
instagram: 'https://www.instagram.com/velorra',
```

Replace `velorra` with your actual Instagram username.

**Example:** If your Instagram page URL is `instagram.com/myfashionstore`
```
instagram: 'https://www.instagram.com/myfashionstore',
```

**How to find your Instagram URL:**
1. Open Instagram on your phone or computer
2. Go to your profile page
3. Copy the URL from the address bar (it will look like `https://www.instagram.com/yourusername`)

---

### Step 2.2 — Facebook Link

Go to **line 17**:
```
facebook:  'https://www.facebook.com/velorra',
```

Replace `velorra` with your Facebook page name or username.

**Example:**
```
facebook:  'https://www.facebook.com/myfashionstore',
```

**How to find your Facebook page URL:**
1. Go to your Facebook page
2. Copy the full URL from the address bar

---

### Step 2.3 — TikTok Link (Optional)

Go to **line 19**:
```
tiktok:    '',
```

If you have TikTok, add your link between the quotes:
```
tiktok:    'https://www.tiktok.com/@yourusername',
```

If you leave it as empty quotes `''`, the TikTok button simply does not appear. No problem.

---

### Step 2.4 — Update Your Contact Information

Still in `js/whatsapp-config.js`, scroll to **lines 23–26**:

```
email:    'hello@velorra.com',
phone:    '+92 300 000 0000',
location: 'Lahore, Punjab, Pakistan',
hours:    'Monday – Saturday: 10:00am – 7:00pm',
```

Replace each one with your actual details. This information shows on your Contact page.

**Example:**
```
email:    'mystore@gmail.com',
phone:    '+92 312 456 7890',
location: 'Gulberg III, Lahore, Pakistan',
hours:    'Monday – Sunday: 11:00am – 8:00pm',
```

> ✅ That's it for `whatsapp-config.js`. Save the file (press Ctrl+S).
> Your WhatsApp button, social media icons in the footer, and contact page will all update automatically.

---

## PART 3 — Adding Your Products

**File to open:** `shop.html`

Every product on your shop page is a "product card" — a block of code that controls the product image, name, price, and category.

---

### Step 3.1 — Understanding a Product Card

Go to **line 60** in `shop.html`. You will see one complete product card:

```html
<div class="product-card reveal" data-category="women">
    <div class="product-img-wrap">
        <span class="product-badge new">New</span>
        <div class="product-img-placeholder">
            <span class="pi-icon">👗</span>
            <span class="pi-label">Women's Dress</span>
        </div>
        <div class="product-actions">
            <button onclick="addToCart('Ivory Silk Maxi Gown',12500,'👗','M — Ivory')">Add to Bag</button>
            <button class="wishlist-btn"><i class="fa-regular fa-heart"></i></button>
        </div>
    </div>
    <div class="product-info">
        <p class="product-category">Women · Dresses</p>
        <h3 class="product-name">Ivory Silk Maxi Gown</h3>
        <div class="product-pricing">
            <span class="product-price">PKR 12,500</span>
            <span class="product-price-old">PKR 16,000</span>
        </div>
    </div>
</div>
```

Here is what each part means:

| Line | What it does | What you change |
|------|-------------|-----------------|
| `data-category="women"` | Which filter button shows this product | women / men / jewellery / watches / cosmetics / sale |
| `product-badge new` | The tag shown on the image | Change `New` to `Sale`, `Bestseller`, `Hot`, etc. Remove this entire line if no badge needed |
| `pi-icon` | Emoji shown as placeholder before you add a real image | Any emoji |
| `pi-label` | Text shown below emoji in placeholder | Any label |
| `addToCart('Ivory Silk Maxi Gown',12500,'👗','M — Ivory')` | What gets added to cart | Product name, price number, emoji, variant |
| `product-category` | Small text above name | e.g. `Women · Dresses` |
| `product-name` | Big product name | Your product name |
| `product-price` | Selling price | e.g. `PKR 4,500` |
| `product-price-old` | Crossed-out original price (shows Sale effect) | Remove this entire line if no sale price |

---

### Step 3.2 — Adding a Product WITH a Real Photo

Go to **line 195** in `shop.html`. You will see a commented-out template (it starts with `<!--` and ends with `-->`):

```html
<!-- ADD YOUR OWN PRODUCTS BELOW THIS LINE ── -->
<!--
<div class="product-card" data-category="women">
    <div class="product-img-wrap">
        <img src="images/your-product.jpg" alt="Product Name" style="width:100%;height:100%;object-fit:cover;">
        ...
```

**To add a real product with your photo:**

**Step 1** — Copy your product photo into the `images` folder inside your project.
Name it something simple with no spaces, like: `black-dress.jpg` or `gold-necklace.jpg`

**Step 2** — Find line 221 (the `<!-- ADD YOUR OWN PRODUCTS BELOW THIS LINE -->` comment) and type your new product ABOVE the closing `</div>` of `products-grid`. Copy this template and fill in your details:

```html
<div class="product-card reveal" data-category="women">
    <div class="product-img-wrap">
        <img src="images/black-dress.jpg" alt="Black Embroidered Dress" style="width:100%;height:100%;object-fit:cover;">
        <div class="product-actions">
            <button onclick="addToCart('Black Embroidered Dress',6500,'👗','S')">Add to Bag</button>
            <button class="wishlist-btn"><i class="fa-regular fa-heart"></i></button>
        </div>
    </div>
    <div class="product-info">
        <p class="product-category">Women · Dresses</p>
        <h3 class="product-name">Black Embroidered Dress</h3>
        <div class="product-pricing">
            <span class="product-price">PKR 6,500</span>
        </div>
    </div>
</div>
```

**The four things in addToCart you MUST match exactly:**
```
addToCart('Product Name', PriceNumber, 'emoji', 'Variant')
```
- `'Product Name'` — must match what you write in `product-name` exactly
- `PriceNumber` — just the number, no PKR, no comma. So `6,500` becomes `6500`
- `'emoji'` — any emoji that represents the product
- `'Variant'` — size, color, or anything. Just a label for the cart.

---

### Step 3.3 — Badge Options (the small label on the image)

Add this line BEFORE the `<img>` or `<div class="product-img-placeholder">` line:

For **New arrivals:**
```html
<span class="product-badge new">New</span>
```

For **Bestseller:**
```html
<span class="product-badge">Bestseller</span>
```

For **Sale:**
```html
<span class="product-badge">Sale</span>
```

If you don't want any badge, simply don't include that line.

---

### Step 3.4 — Category Values (IMPORTANT — must be exact)

The `data-category` value on your product card must exactly match one of these:

| Write this | Filter button it appears under |
|-----------|-------------------------------|
| `data-category="women"` | Women |
| `data-category="men"` | Men |
| `data-category="jewellery"` | Jewellery |
| `data-category="watches"` | Watches |
| `data-category="cosmetics"` | Cosmetics |
| `data-category="sale"` | Sale |

If you write `data-category="Women"` (capital W) it will NOT work. Must be lowercase.

---

### Step 3.5 — Adding a Sale Price (Crossed Out Price)

To show a product is on sale with the old price crossed out, add BOTH price lines:

```html
<div class="product-pricing">
    <span class="product-price">PKR 6,500</span>
    <span class="product-price-old">PKR 9,000</span>
</div>
```

`product-price` = the new lower price (shown in gold)
`product-price-old` = the original higher price (shown crossed out)

To show ONLY one price (no sale), just use one line:

```html
<div class="product-pricing">
    <span class="product-price">PKR 6,500</span>
</div>
```

---

## PART 4 — Editing the Product List on the HOME PAGE

**File to open:** `index.html`

Your home page has a "Featured Products" section. Go to approximately **line 160** and look for `<!-- Featured Products -->` or `class="featured-grid"`. The product cards here work exactly the same way as in `shop.html` — same structure, same rules from Part 3 above.

---

## PART 5 — Changing Your Store Name and Logo Text

**File to open:** `index.html` (and repeat for `shop.html`, `account.html`, `checkout.html`, etc.)

---

### Step 5.1 — The Logo Text in Navigation

In every HTML file, find this line (around line 15–20):

```html
<a href="index.html" class="nav-logo">Vel<span>orra</span></a>
```

The logo is split into two parts:
- `Vel` — shown in gold color
- `<span>orra</span>` — shown in white color

Together they spell **Velorra**. To change to your store name, for example **ZaraBoutique**:
```html
<a href="index.html" class="nav-logo">Zara<span>Boutique</span></a>
```

You must make this change in EVERY HTML file (index.html, shop.html, account.html, checkout.html, contact.html, about.html, policy.html) for consistency.

---

### Step 5.2 — The Browser Tab Title

In every HTML file, near the very top (line 6), find:
```html
<title>Velorra — Dress Your Finest Self</title>
```

Change to:
```html
<title>YourStoreName — Your Tagline Here</title>
```

---

## PART 6 — Changing the Hero Section Text on the Home Page

**File to open:** `index.html`

Look for the `<section id="hero">` section (around line 55). Inside you will find:

```html
<p class="hero-eyebrow">New Collection — 2025</p>
<h1 class="hero-title">Dress Your <em>Finest</em> Self</h1>
<p class="hero-sub">Curated fashion, jewellery & cosmetics for the modern Pakistani woman.</p>
```

- **Line with `hero-eyebrow`** — the small text above the big heading. Change to your season/collection name.
- **Line with `hero-title`** — the BIG main heading on your homepage.
- **Line with `hero-sub`** — the smaller description text below it.

Just replace the text between the tags with your own words.

---

## PART 7 — Quick Reference Card

| What you want to change | File | Approx. Line |
|------------------------|------|--------------|
| WhatsApp number | `js/whatsapp-config.js` | 10 |
| WhatsApp message | `js/whatsapp-config.js` | 11 |
| Instagram link | `js/whatsapp-config.js` | 16 |
| Facebook link | `js/whatsapp-config.js` | 17 |
| TikTok link | `js/whatsapp-config.js` | 19 |
| Contact email | `js/whatsapp-config.js` | 23 |
| Contact phone | `js/whatsapp-config.js` | 24 |
| Contact location | `js/whatsapp-config.js` | 25 |
| Business hours | `js/whatsapp-config.js` | 26 |
| Add a new product | `shop.html` | After line 221 |
| Edit existing products | `shop.html` | Lines 60–220 |
| Home page hero text | `index.html` | Around line 55 |
| Store name in nav | Every `.html` file | Around line 16 |
| Browser tab title | Every `.html` file | Line 6 |

---

## PART 8 — Saving and Testing Your Changes

After making any change:

1. Press **Ctrl+S** (Windows) or **Cmd+S** (Mac) to save
2. Open the HTML file directly in your browser (double-click `index.html`)
3. You will see your changes immediately

> **Tip:** If you don't see your changes, press **Ctrl+Shift+R** in the browser to do a hard refresh (clears the browser's memory of the old version).

---

## Common Mistakes to Avoid

| Mistake | Why it breaks | How to fix |
|---------|--------------|-----------|
| Removing a quote `'` from addToCart | JavaScript crashes, add to cart stops working | Make sure all 4 values are inside quotes and separated by commas |
| Capital letters in `data-category` | Filter won't recognize the category | Always use lowercase: `women` not `Women` |
| Space in image filename | Image won't load | Rename to `black-dress.jpg` not `black dress.jpg` |
| Wrong image folder | Image shows broken | Put all images inside the `images/` folder |
| Forgetting to save | Changes don't appear | Always Ctrl+S after editing |
| Editing the wrong file | Changes appear on wrong page | Check the filename in your editor's tab bar |

---

*Made for Velorra — your website, your rules.*

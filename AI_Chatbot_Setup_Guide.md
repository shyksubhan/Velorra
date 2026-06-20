# Velorra AI Chatbot — Activation Guide
### Complete step-by-step setup. Takes about 10–15 minutes. Both services are FREE.

---

## Why You Need This Setup

Your website is plain HTML — it runs entirely in the visitor's browser.
The AI (Claude) lives on Anthropic's servers and requires a secret API key to use.
You cannot put a secret key directly in your HTML files because anyone could steal it.

The solution: a **Cloudflare Worker** — a tiny free server that sits between your website
and the AI. Your website talks to the Worker, the Worker holds your secret key safely,
and calls the AI on your behalf.

```
Customer's browser  →  Cloudflare Worker  →  Anthropic AI
     (your site)       (holds secret key)     (Claude)
```

---

## STEP 1 — Get Your Anthropic API Key (FREE to start)

1. Open your browser and go to: **https://console.anthropic.com**
2. Click **Sign Up** and create a free account
3. After signing in, click **API Keys** in the left menu
4. Click **Create Key**
5. Give it a name like `velorra-chatbot`
6. **COPY the key immediately** — it starts with `sk-ant-...`
   ⚠️ You can only see it once. If you lose it, create a new one.
7. Save it somewhere safe (like in your phone notes temporarily)

---

## STEP 2 — Create Your Cloudflare Worker (FREE forever)

1. Go to: **https://workers.cloudflare.com**
2. Click **Sign Up** (or **Log In** if you have an account)
   - Free account: no credit card needed
3. After logging in, click **Workers & Pages** in the left menu
4. Click **Create Application**
5. Click **Create Worker**
6. Give it a name: type `velorra-chat` in the name field
7. Click **Deploy** (ignore the default code for now)

---

## STEP 3 — Paste the Worker Code

1. After deploying, click **Edit Code** (the blue button)
2. You will see a code editor with some default code
3. **Select ALL** the default code (Ctrl+A) and **delete it**
4. Open the file `js/velorra-chat-worker.js` from your Velorra project folder
5. Select all its contents (Ctrl+A) and copy (Ctrl+C)
6. Paste it into the Cloudflare editor (Ctrl+V)
7. Click **Save and Deploy** (top right)

---

## STEP 4 — Add Your Secret API Key to the Worker

1. Go back to your Worker's main page (click the worker name)
2. Click **Settings** tab
3. Click **Variables** in the left side
4. Under **Environment Variables**, click **Add variable**
5. Fill in:
   - **Variable name:** `ANTHROPIC_API_KEY`
   - **Value:** paste your key from Step 1 (the `sk-ant-...` one)
   - ✅ Click **Encrypt** (this hides it so no one can see it later)
6. Click **Save and Deploy**

---

## STEP 5 — Copy Your Worker URL

1. On your Worker page, look at the top — you will see a URL like:
   `https://velorra-chat.yourname.workers.dev`
2. **Copy that full URL**

---

## STEP 6 — Connect Your Website to the Worker

1. Open your Velorra project folder
2. Open the file: `js/main.js`
3. Near the top of the chatbot section, find this line (around line 186):

```javascript
const VELORRA_WORKER_URL = 'https://velorra-chat.yourname.workers.dev';
```

4. Replace `https://velorra-chat.yourname.workers.dev` with YOUR actual worker URL
5. Save the file (Ctrl+S)

**Example — before:**
```javascript
const VELORRA_WORKER_URL = 'https://velorra-chat.yourname.workers.dev';
```

**Example — after (with your real URL):**
```javascript
const VELORRA_WORKER_URL = 'https://velorra-chat.ahmed123.workers.dev';
```

---

## STEP 7 — Test It

1. Open `index.html` in your browser
2. Click the gold chat button (bottom right)
3. Type: `Hello` and press Enter
4. The AI should respond within 2–3 seconds ✅

If it works — congratulations! Your AI chatbot is live.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Still getting error message | Double-check the worker URL in main.js has no typos |
| Worker URL shows 404 | Make sure you clicked "Save and Deploy" in Cloudflare |
| API key not working | Go back to console.anthropic.com and create a new key |
| Response very slow | Normal on first message — Cloudflare "wakes up" the worker |

---

## How Much Does It Cost?

| Service | Free Tier | What you get free |
|---------|-----------|-------------------|
| Cloudflare Workers | Forever free | 100,000 requests/day |
| Anthropic API | Pay per use | ~$0.003 per conversation |

For a small boutique, Anthropic costs will be **less than $1–2 per month** even with hundreds of customer chats. You only pay when customers actually use the chatbot.

---

*That's it! Your Velorra chatbot is now powered by real AI.*

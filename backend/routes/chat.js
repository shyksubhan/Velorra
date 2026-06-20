/* ============================================================
   VELORRA — AI Chat Route (Claude claude-haiku-4-5-20251001)
   ============================================================ */
const express = require('express');
const router  = express.Router();

const SYSTEM_PROMPT = `You are Velorra Assistant — a helpful, friendly, and stylish AI for Velorra, Pakistan's premium fashion brand based in Lahore.

You help customers with:
- Product questions (women's fashion, men's fashion, jewellery, watches, accessories)
- Sizing and fit advice
- Shipping info: free shipping over PKR 5,000, standard 3–5 business days, express Lahore 1–2 days, fee PKR 200
- Returns: 14-day policy, items must be unworn with original tags
- Payment: Cash on Delivery, Easypaisa, JazzCash, bank transfer, credit/debit cards
- Order tracking: customers can use the Track Order page with their order reference
- General fashion advice and styling tips

Keep responses concise (2–4 sentences max), warm, and on-brand. Use a slightly elegant tone. 
If you don't know something specific, suggest contacting via WhatsApp or email hello@velorra.com.
Never make up prices or product details you don't know. Respond in the same language the customer uses (Urdu or English).`;

router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required.' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: 'AI service not configured.' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system:     SYSTEM_PROMPT,
        messages:   messages.slice(-10), // last 10 messages for context
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Anthropic error:', data);
      return res.status(500).json({ error: 'AI service error.' });
    }

    const reply = data.content?.[0]?.text || "I'm having trouble right now. Please try again.";
    return res.json({ reply });

  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: 'Chat service unavailable.' });
  }
});

module.exports = router;

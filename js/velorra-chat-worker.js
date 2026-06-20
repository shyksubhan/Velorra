/* ============================================================
   VELORRA CHAT — Cloudflare Worker
   
   ============================================================ */

export default {
  async fetch(request, env) {

    /* Allow CORS from any origin (your website) */
    const corsHeaders = {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    /* Handle preflight */
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const body = await request.json();

      /* Forward to Anthropic — API key stays safe in Worker env */
      const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: {
          'Content-Type':         'application/json',
          'x-api-key':            env.ANTHROPIC_API_KEY,
          'anthropic-version':    '2023-06-01',
        },
        body: JSON.stringify(body),
      });

      const data = await anthropicRes.json();

      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status:  anthropicRes.status,
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        status:  500,
      });
    }
  }
};

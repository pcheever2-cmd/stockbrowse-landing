// Cloudflare Worker entry point
// Handles API routes for the landing page

interface Env {
  KV_BINDING: KVNamespace;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle API routes
    if (url.pathname === '/api/waitlist') {
      return handleWaitlist(request, env);
    }

    // Serve static assets for all other routes
    return env.ASSETS.fetch(request);
  },
};

async function handleWaitlist(request: Request, env: Env): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const body = await request.json() as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Check if already signed up
    const existing = await env.KV_BINDING.get(email);
    if (existing) {
      return new Response(JSON.stringify({ message: 'Already on waitlist', alreadyExists: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Store email with metadata
    const data = {
      email,
      signedUpAt: new Date().toISOString(),
      source: request.headers.get('Referer') || 'direct',
      userAgent: request.headers.get('User-Agent') || 'unknown',
    };

    await env.KV_BINDING.put(email, JSON.stringify(data));

    // Also maintain a list of all emails for easy export
    const allEmails = await env.KV_BINDING.get('__all_emails__');
    const emailList = allEmails ? JSON.parse(allEmails) : [];
    emailList.push({ email, signedUpAt: data.signedUpAt });
    await env.KV_BINDING.put('__all_emails__', JSON.stringify(emailList));

    return new Response(JSON.stringify({ message: 'Success', email }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error) {
    console.error('Waitlist error:', error);
    return new Response(JSON.stringify({ error: 'Server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}

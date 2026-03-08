// Cloudflare Pages Function to handle waitlist signups
// Emails are stored in KV with timestamp

interface Env {
  WAITLIST: KVNamespace;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

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
    const existing = await env.WAITLIST.get(email);
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

    await env.WAITLIST.put(email, JSON.stringify(data));

    // Also maintain a list of all emails for easy export
    const allEmails = await env.WAITLIST.get('__all_emails__');
    const emailList = allEmails ? JSON.parse(allEmails) : [];
    emailList.push({ email, signedUpAt: data.signedUpAt });
    await env.WAITLIST.put('__all_emails__', JSON.stringify(emailList));

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
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};

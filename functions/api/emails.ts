// Admin endpoint to view all collected emails
// Access: /api/emails?key=YOUR_SECRET_KEY

interface Env {
  WAITLIST: KVNamespace;
}

const ADMIN_KEY = 'stockbrowse2026';  // Change this to something secret

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  // Simple auth check
  if (key !== ADMIN_KEY) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const allEmails = await env.WAITLIST.get('__all_emails__');
    const emailList = allEmails ? JSON.parse(allEmails) : [];

    // Return as formatted HTML for easy viewing
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Stockbrowse Waitlist</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 40px auto; padding: 20px; background: #0C0F14; color: #fff; }
    h1 { color: #22D3EE; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #333; }
    th { background: #161B24; color: #22D3EE; }
    tr:hover { background: #161B24; }
    .count { font-size: 48px; color: #22D3EE; }
    .export { margin-top: 20px; }
    .export a { color: #22D3EE; }
  </style>
</head>
<body>
  <h1>Stockbrowse Waitlist</h1>
  <div class="count">${emailList.length}</div>
  <p>Total signups</p>

  <table>
    <tr><th>#</th><th>Email</th><th>Signed Up</th></tr>
    ${emailList.map((e: any, i: number) => `
      <tr>
        <td>${i + 1}</td>
        <td>${e.email}</td>
        <td>${new Date(e.signedUpAt).toLocaleString()}</td>
      </tr>
    `).join('')}
  </table>

  <div class="export">
    <p>Export: <a href="/api/emails/csv?key=${key}">Download CSV</a></p>
  </div>
</body>
</html>
    `;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error) {
    return new Response('Error loading emails', { status: 500 });
  }
};

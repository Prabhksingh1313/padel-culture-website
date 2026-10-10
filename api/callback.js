// Finishes GitHub login and hands the token back to the admin panel window.
export default async function handler(req, res) {
  const code = new URL(req.url, 'http://x').searchParams.get('code');
  let status = 'error';
  let content = { error: 'Missing code' };
  if (code) {
    const r = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const data = await r.json();
    if (data.access_token) { status = 'success'; content = { token: data.access_token, provider: 'github' }; }
    else content = { error: data.error_description || 'Login failed' };
  }
  const msg = `authorization:github:${status}:${JSON.stringify(content)}`;
  res.setHeader('Content-Type', 'text/html');
  res.end(`<!doctype html><html><body><script>
    (function () {
      function receive(e) {
        window.opener.postMessage(${JSON.stringify(msg)}, e.origin);
        window.removeEventListener('message', receive, false);
      }
      window.addEventListener('message', receive, false);
      window.opener.postMessage('authorizing:github', '*');
    })();
  </script></body></html>`);
}

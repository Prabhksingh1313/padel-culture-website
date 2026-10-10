// Starts GitHub login for the admin panel (/admin).
// Needs Vercel env vars: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET.
export default function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const redirect = `https://${host}/api/callback`;
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', process.env.GITHUB_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirect);
  url.searchParams.set('scope', 'repo,user');
  res.writeHead(302, { Location: url.toString() });
  res.end();
}

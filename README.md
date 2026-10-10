# Padel Culture website

The community website for Padel Culture (@padel.culture_), which runs padel games in West Delhi.

## Editing the site (no code)

Go to **yourdomain/admin** and log in with GitHub. In the admin panel you can:

- **Games**: add, edit, mark full or cancel games. Past games hide themselves automatically.
- **Site settings → Main text & contact**: headline, about text, WhatsApp number or group link, Instagram, areas.
- **Site settings → Venues**: the courts you play at.
- **Site settings → FAQ**: the questions and answers.
- **Site settings → Photo gallery**: upload photos. The gallery section appears once there's at least one photo.

Click **Publish** and the live site updates in about a minute.

If a game has no booking link, its "Book spot" button opens WhatsApp with a message already written that names the game. This needs the WhatsApp number in settings.

## How it's built

- Astro static site: `src/pages/index.astro` and `src/layouts/Base.astro`
- Games: one Markdown file per game in `src/content/games/`
- Text and settings: JSON files in `src/data/`
- Admin panel: Decap CMS in `public/admin/`, with GitHub login handled by `api/auth.js` and `api/callback.js`
- Hosting: Vercel, which rebuilds the site on every push to `main`

## One-time setup

1. Import this repo into Vercel. The framework preset is Astro, and the defaults are fine.
2. Add your domain in Vercel under Project → Settings → Domains, then set the DNS records it shows you at your domain registrar.
3. Create a GitHub OAuth App (GitHub → Settings → Developer settings → OAuth Apps → New):
   - Homepage URL: `https://yourdomain`
   - Authorization callback URL: `https://yourdomain/api/callback`
4. In Vercel → Settings → Environment Variables, add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` from that app, then redeploy.
5. Make sure `base_url` and `site_url` in `public/admin/config.yml`, and `site` in `astro.config.mjs`, use your real domain.

## Local development

```
npm install
npm run dev
```

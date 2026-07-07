# Arknights Style Converter

A small web tool that rewrites Chinese text into an Arknights-inspired tactical terminal style. It uses a GitHub Pages static frontend and a Cloudflare Worker API proxy to call an OpenAI-compatible chat completions endpoint.

Live site:

https://huzaigong.github.io/arknights-style-converter/

Repository:

https://github.com/HuZaiGong/arknights-style-converter

## Features

- Text-to-style conversion for Chinese input.
- Arknights-inspired UI based on the local `DesignLanguage.txt` notes.
- Built-in tone presets:
  - Rhodes Island Terminal
  - Amiya-style
  - Kal'tsit-style
  - W-style
  - SilverAsh-style
  - Exusiai-style
- Style intensity slider.
- Copy-to-clipboard output.
- Local Node proxy for development.
- Cloudflare Worker proxy for GitHub Pages deployment.

## Architecture

GitHub Pages can only host static files, so the browser cannot run `server.js` in production. Direct browser requests to `https://kenari.id/v1/chat/completions` are blocked by CORS in many browsers.

The deployed flow is:

```text
Browser on GitHub Pages
  -> Cloudflare Worker /api/transform
  -> https://kenari.id/v1/chat/completions
  -> Cloudflare Worker adds CORS headers
  -> Browser receives the result
```

The local development flow is:

```text
Browser on http://127.0.0.1:4173
  -> local Node server /api/transform
  -> https://kenari.id/v1/chat/completions
  -> Browser receives the result
```

`app.js` automatically chooses the local endpoint when opened from `localhost` or `127.0.0.1`; otherwise it uses the deployed Worker endpoint.

## Files

- `index.html` - Main static page.
- `styles.css` - Tactical industrial/HUD-style UI.
- `app.js` - Browser interaction and endpoint selection.
- `server.js` - Local development static server and API proxy.
- `worker.js` - Cloudflare Worker API proxy for production.
- `wrangler.toml` - Cloudflare Worker deployment config.
- `DesignLanguage.txt` - UI design reference notes.
- `apikey.txt` - Original API note left in the workspace.

## Local Development

Requirements:

- Node.js 18 or newer.

Run locally:

```bash
npm start
```

Open:

```text
http://127.0.0.1:4173
```

The local server exposes:

```text
POST /api/transform
```

## Cloudflare Worker Deployment

Requirements:

- Cloudflare account with verified email.
- Wrangler CLI through `npx`.

Login:

```bash
npx wrangler login
```

Deploy Worker:

```bash
npx wrangler deploy
```

Current Worker URL:

```text
https://arknights-style-converter-api.1421201386.workers.dev
```

The frontend calls:

```text
https://arknights-style-converter-api.1421201386.workers.dev/api/transform
```

## GitHub Pages Deployment

The site is served from the `main` branch root through GitHub Pages.

After changing frontend files:

```bash
git add .
git commit -m "Describe the change"
git push
```

GitHub Pages URL:

```text
https://huzaigong.github.io/arknights-style-converter/
```

## Known Notes

- The API key is intentionally hardcoded because this project was created with key security explicitly out of scope.
- Publishing this repository publicly also publishes the key in source code and deployment artifacts.
- Some networks may block or poison DNS for `*.workers.dev`. If the page still fails to fetch through the Worker on a specific network, bind the Worker to a custom Cloudflare domain or test from another network.
- The style prompt is inspired by Arknights-like tactical, medical, industrial, and terminal-report language. It asks the model not to quote official text or claim official origin.

## Quick Checks

Check local JavaScript syntax:

```bash
node --check app.js
node --check server.js
node --check worker.js
```

Check GitHub Pages status:

```bash
gh api repos/HuZaiGong/arknights-style-converter/pages --jq '{html_url, status, source}'
```

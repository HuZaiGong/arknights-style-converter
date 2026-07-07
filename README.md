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
- Gear menu for API URL, API key, and model settings.
- Copy-to-clipboard output.
- Local Node proxy for development.
- Cloudflare Worker proxy for GitHub Pages deployment.

## Architecture

GitHub Pages can only host static files, so the browser cannot run `server.js` in production. Direct browser requests to the upstream chat completions API are often blocked by CORS.

The deployed flow is:

```text
Browser on GitHub Pages
  -> Cloudflare Worker /api/transform
  -> OpenAI-compatible /chat/completions API
  -> Cloudflare Worker returns controlled CORS headers
  -> Browser receives the result
```

The local development flow is:

```text
Browser on http://127.0.0.1:4173
  -> local Node server /api/transform
  -> OpenAI-compatible /chat/completions API
  -> Browser receives the result
```

`app.js` automatically chooses the local endpoint when opened from `localhost` or `127.0.0.1`; otherwise it uses the deployed Worker endpoint.

## Files

- `index.html` - Main static page.
- `styles.css` - Tactical industrial/HUD-style UI.
- `app.js` - Browser interaction, settings menu, and endpoint selection.
- `config.js` - Shared defaults, persona prompts, validation, and error messages.
- `server.js` - Local development static server and API proxy.
- `worker.js` - Cloudflare Worker API proxy for production.
- `wrangler.toml` - Cloudflare Worker deployment config.
- `DesignLanguage.txt` - UI design reference notes.

## Settings

The page has a gear menu for runtime settings:

- API URL
- API Key
- Model

The default configuration points to the Kenari OpenAI-compatible API. Settings are saved in `localStorage` and sent to the local server or Worker with each conversion request.

The Worker intentionally restricts accepted origins and API hosts so it does not become a general-purpose open proxy. To support another upstream API host, add it to `allowedApiHosts` in `config.js` and redeploy the Worker.

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

Run syntax checks:

```bash
npm run check
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

Check GitHub Pages status:

```bash
gh api repos/HuZaiGong/arknights-style-converter/pages --jq '{html_url, status, source}'
```

## Notes

- API configuration is intentionally editable in the page settings menu.
- The Worker returns normalized error codes and user-facing Chinese messages instead of raw upstream responses.
- The style prompt is inspired by Arknights-like tactical, medical, industrial, and terminal-report language. It asks the model not to quote official text or claim official origin.

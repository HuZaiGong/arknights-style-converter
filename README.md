# Arknights Style Converter

A small web tool that rewrites Chinese text into an Arknights-inspired tactical terminal style. The primary deployment target is Vercel, where the static frontend and `/api/transform` proxy run under the same origin.

Primary Vercel site:

```text
https://arknights-style-converter.vercel.app
```

Fallback GitHub Pages site:

```text
https://huzaigong.github.io/arknights-style-converter/
```

Repository:

```text
https://github.com/HuZaiGong/arknights-style-converter
```

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
- Operator style presets powered by reusable style archetypes.
- Copy-to-clipboard output.
- Local Node proxy for development.
- Vercel API proxy for production.
- Cloudflare Worker proxy kept as a GitHub Pages fallback.

## Architecture

Primary Vercel flow:

```text
Browser on Vercel
  -> same-origin /api/transform
  -> OpenAI-compatible /chat/completions API
  -> Browser receives the result
```

Local development flow:

```text
Browser on http://127.0.0.1:4173
  -> local Node server /api/transform
  -> OpenAI-compatible /chat/completions API
  -> Browser receives the result
```

GitHub Pages fallback flow:

```text
Browser on GitHub Pages
  -> Cloudflare Worker /api/transform
  -> OpenAI-compatible /chat/completions API
  -> Browser receives the result
```

`app.js` chooses the endpoint by host:

- `localhost` / `127.0.0.1`: local `/api/transform`
- `*.github.io`: Cloudflare Worker fallback
- other production hosts such as Vercel: same-origin `/api/transform`

## Files

- `index.html` - Main static page.
- `styles.css` - Tactical industrial/HUD-style UI.
- `app.js` - Browser interaction, settings menu, and endpoint selection.
- `config.js` - Shared defaults, persona prompts, validation, and error messages.
- `operatorStyles.js` - Operator style archetypes and operator persona data.
- `api/transform.js` - Vercel Serverless Function API proxy.
- `server.js` - Local development static server and API proxy.
- `worker.js` - Cloudflare Worker API proxy for GitHub Pages fallback.
- `vercel.json` - Vercel function configuration.
- `wrangler.toml` - Cloudflare Worker deployment config.
- `DesignLanguage.txt` - UI design reference notes.

## Operator Styles

Operator presets are defined in `operatorStyles.js`.

The file separates reusable style archetypes from individual operator metadata:

```text
styleArchetypes -> broad tone templates
operators        -> operator name, faction, class, rarity, tags, modifiers
```

This keeps the project maintainable as the operator list grows. To add more operators, append entries to `operators` and reuse an existing `archetype` where possible. Only create a new archetype when the existing tone templates cannot describe the operator well.

The first batch includes representative operators such as Amiya, Kal'tsit, Ch'en, Exusiai, Texas, Lappland, SilverAsh, Surtr, Ling, Nian, Dusk, W, Ines, Eyjafjalla, Saria, Skadi the Corrupting Heart, Flametail, Mlynar, and Thorns.

## Settings

The page has a gear menu for runtime settings:

- API URL
- API Key
- Model

The default configuration points to the Kenari OpenAI-compatible API. Settings are saved in `localStorage` and sent to the local server, Vercel function, or Worker with each conversion request.

The Cloudflare Worker intentionally restricts accepted origins and API hosts so it does not become a general-purpose open proxy. Vercel runs same-origin in the primary deployment, so browser CORS is not involved there.

## Local Development

Requirements:

- Node.js 18 or newer.

Run locally with the built-in Node server:

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

Optional Vercel local development:

```bash
npm run dev:vercel
```

## Vercel Deployment

Vercel should be linked to this GitHub repository. After linking, normal updates should be made by committing and pushing to GitHub; Vercel will automatically deploy the latest GitHub commit. You do not need to manually update Vercel first and GitHub second.

Login:

```bash
npx vercel login
```

First setup/deploy:

```bash
npx vercel
```

Production deploy:

```bash
npx vercel --prod
```

The production API endpoint is:

```text
/api/transform
```

Because the frontend and API are same-origin on Vercel, this avoids the `workers.dev` access problem.

## GitHub Update Flow

For normal code changes:

```bash
git add .
git commit -m "Describe the change"
git push
```

If Vercel is linked to the GitHub repository, pushing to `main` triggers a new Vercel deployment automatically.

## Cloudflare Worker Fallback

The Cloudflare Worker remains available for the GitHub Pages fallback deployment.

Deploy Worker manually:

```bash
npx wrangler deploy
```

Current Worker URL:

```text
https://arknights-style-converter-api.1421201386.workers.dev
```

## GitHub Pages Fallback

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
- The Vercel function and Worker return normalized error codes and user-facing Chinese messages instead of raw upstream responses.
- The style prompt is inspired by Arknights-like tactical, medical, industrial, and terminal-report language. It asks the model not to quote official text or claim official origin.

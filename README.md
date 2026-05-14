# Med Quiz

Static Vite app for practicing PDF-based multiple-choice medical quiz questions.

## Local Development

```bash
npm install
npm run dev -- --port 3000
```

Open `http://localhost:3000`.

## Verification

```bash
npm run deploy:check
```

This runs the Vitest suite and a production build.

## Deploy Target

Recommended host: Cloudflare Pages.

- Build command: `npm run build`
- Build output directory: `dist`
- Node version: `22.12.0` or newer
- Framework preset: `Vite`

Detailed deployment checklist: [docs/deploy-cloudflare-pages.md](docs/deploy-cloudflare-pages.md).

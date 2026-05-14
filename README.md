# Med Quiz

Static Vite app for practicing PDF-based multiple-choice medical quiz questions.

## Live App

- Production URL: https://med-quiz-1ad.pages.dev
- GitHub repository: https://github.com/vikromic/med-quiz
- Hosting: Cloudflare Pages direct deployment

The app is fully static. There is no always-running backend server, database, or paid compute service. PDF imports and quiz progress are handled in the browser and persisted with local storage.

## Quick Start For Users

1. Open https://med-quiz-1ad.pages.dev.
2. Click `Load Sample PDF` to import the bundled medical quiz example, or click `Add PDF` to import one or more local PDF files.
3. Select the imported quiz set or several sets for combined mode.
4. Optionally enable `Shuffle questions` and/or `Shuffle answers`.
5. Click `Start Test`.
6. Pick an answer, click `Check`, review green/red feedback, then click `Next`.
7. At the end, use `Retry Test` or `Review Mistakes Only`.

Imported PDFs are not uploaded to a server. They stay in the browser on the current device.

## Local Development

```bash
nvm use
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

Current host: Cloudflare Pages.

- Build command: `npm run build`
- Build output directory: `dist`
- Node version: `22.12.0` or newer
- Framework preset: `Vite`
- Cloudflare Pages project: `med-quiz`
- Cloudflare Pages domain: `med-quiz-1ad.pages.dev`
- Git provider status: not connected; deploys are manual through Wrangler

Detailed deployment checklist: [docs/deploy-cloudflare-pages.md](docs/deploy-cloudflare-pages.md).

## Manual Redeploy

Cloudflare's GitHub integration failed during setup, so pushing to GitHub does not automatically publish a new version yet. To publish updates:

```bash
npm run deploy:check
npx wrangler pages deploy dist --project-name=med-quiz --branch=main --commit-hash=$(git rev-parse HEAD)
```

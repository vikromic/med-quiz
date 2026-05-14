# Cloudflare Pages Runbook

This project is deployed as a static Vite app on Cloudflare Pages. It does not need a backend server to stay available 24/7.

## Current Production Setup

- Live URL: https://med-quiz-1ad.pages.dev
- GitHub repository: https://github.com/vikromic/med-quiz
- Local remote: `git@github.com:vikromic/med-quiz.git`
- Git branch: `main`
- Cloudflare Pages project: `med-quiz`
- Cloudflare Pages domain: `med-quiz-1ad.pages.dev`
- Cloudflare Git provider: `No`
- Deployment method: manual `wrangler pages deploy`

## Configuration Applied

### Repository

- Initialized Git in `/Users/viktoriiamalysheva/Workspace/Projects/med-quiz`.
- Created GitHub repository `vikromic/med-quiz`.
- Set `origin` to `git@github.com:vikromic/med-quiz.git`.
- Pushed `main` to GitHub.

### Runtime And Build

- `.nvmrc` pins local Node to `22.12.0`.
- `package.json` requires Node `>=22.12.0`.
- Build command: `npm run build`.
- Build output directory: `dist`.
- Verification command: `npm run deploy:check`, which runs Vitest and a production build.

### Cloudflare Pages

- Authenticated Wrangler with Cloudflare OAuth.
- Created the Pages project with:

```bash
npx wrangler pages project create med-quiz --production-branch=main
```

- Published production with:

```bash
npm run build
npx wrangler pages deploy dist --project-name=med-quiz --branch=main --commit-hash=$(git rev-parse HEAD)
```

- Confirmed the project with:

```bash
npx wrangler pages project list
```

The current project list shows `med-quiz`, domain `med-quiz-1ad.pages.dev`, and Git Provider `No`.

### Static Assets And Headers

- `public/sample-med-quiz.pdf` is bundled into the production site.
- `public/sw.js` registers a small service worker that caches the app shell and sample PDF for offline-friendly reuse.
- `public/_headers` configures:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - no-cache for `index.html` and `sw.js`
  - immutable long cache for built assets under `/assets/*`
  - one-day cache for `/sample-med-quiz.pdf`

## Important Gotchas

### GitHub Auto-Deploy Is Not Connected

The Cloudflare GitHub integration failed twice during setup with:

```text
Error connecting to git account. Cloudflare Pages was unable to be installed on your GitHub/GitLab account. Please attempt to fully uninstall and reinstall the installation.
```

Uninstalling and reinstalling the Cloudflare Workers and Pages GitHub app did not resolve the callback error. Because of that, the Cloudflare Pages project was created and deployed with Wrangler instead.

Impact:

- The live site is working.
- GitHub contains the source code.
- Pushing to GitHub does not currently trigger an automatic Cloudflare deployment.
- Future updates must be deployed manually with Wrangler until the GitHub integration is fixed.

### Wrangler Login Is Required For Manual Deploys

Manual deploys depend on the local Wrangler OAuth session. If the session expires or another machine is used, run:

```bash
npx wrangler login
```

Then run the deploy command again.

### Node Version Matters

This app uses Vite 8 and TypeScript 6. Use Node `22.12.0` or newer locally and in any future CI provider.

### Safari PDF Loading Fix

The PDF loader uses `pdfjs-dist`. Safari can fail PDF parsing with an error like:

```text
undefined is not a function (near '...value of readableStream...')
```

The app installs a `ReadableStream` async-iterator polyfill before loading PDF.js. Keep `src/browserCompatibility.ts` and its test in place unless PDF.js no longer needs that compatibility layer.

### Service Worker Cache

The app registers `/sw.js`, which caches `/` and `/sample-med-quiz.pdf` and refreshes cached GET responses after successful network fetches. If static files behave unexpectedly after a release, hard-refresh the browser or unregister the site service worker from browser dev tools.

### Preview URL Timing

Cloudflare may create a deployment preview URL before its certificate is ready. If a preview URL has an SSL handshake issue immediately after deploy, test the production URL as well:

```bash
curl -I https://med-quiz-1ad.pages.dev
```

## Quick Start For Local Development

```bash
cd /Users/viktoriiamalysheva/Workspace/Projects/med-quiz
nvm use
npm install
npm run dev -- --port 3000
```

Open `http://localhost:3000`.

## Deploy Updates

Use this flow for every source change:

```bash
cd /Users/viktoriiamalysheva/Workspace/Projects/med-quiz
npm run deploy:check
git status --short
git add .
git commit -m "fix(app): describe the change"
git push
npx wrangler pages deploy dist --project-name=med-quiz --branch=main --commit-hash=$(git rev-parse HEAD)
```

For documentation-only changes, deployment is optional because the live app bundle does not change. Still push the commit so GitHub has the latest runbook.

## Production Smoke Test

After every deploy:

1. Open https://med-quiz-1ad.pages.dev.
2. Click `Load Sample PDF`.
3. Confirm the imported quiz is `ЗТЗ ЄДКІ Медсестринство 1-А (літо) 2023-2024`.
4. Confirm it imports 150 questions.
5. Start the test, answer one question, and confirm green/red feedback appears after `Check`.

Command-line checks:

```bash
curl -I https://med-quiz-1ad.pages.dev
curl -I https://med-quiz-1ad.pages.dev/sample-med-quiz.pdf
```

Both should return HTTP `200`.

## Rollback

Cloudflare Pages keeps previous deployments.

1. Open Cloudflare Dashboard.
2. Go to Workers & Pages.
3. Open `med-quiz`.
4. Open Deployments.
5. Select the last known-good deployment.
6. Promote or roll it back to production.

## Future Improvement

Reconnect GitHub auto-deploy later, or create a dedicated Cloudflare API token and add a GitHub Actions workflow that runs `npm run deploy:check` and `wrangler pages deploy`.

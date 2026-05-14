# Cloudflare Pages Deployment Plan

This project is a static Vite app, so it does not need an always-running backend server. Cloudflare Pages will serve the built files from `dist` 24/7.

## What Is Already Prepared

- `npm run build` creates the deployable static site in `dist`.
- `public/sample-med-quiz.pdf` is bundled as the sample quiz PDF.
- `public/_headers` sets safe browser headers and caching rules for Cloudflare Pages.
- `.nvmrc` and `package.json` request Node `22.12.0` or newer.
- `.gitignore` excludes `node_modules`, `dist`, local env files, logs, and duplicate root PDFs while keeping PDFs in `public`.

## Your One-Time Setup Actions

1. Create a new GitHub repository.
   - Suggested name: `med-quiz`
   - Visibility: public is simplest for free GitHub Pages-style workflows; private is also fine for Cloudflare Pages if you connect your GitHub account.

2. Initialize and push this project from the local folder:

```bash
cd /Users/viktoriiamalysheva/Workspace/Projects/med-quiz
git init
git add .
git commit -m "feat(app): prepare med quiz deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/med-quiz.git
git push -u origin main
```

3. Create the Cloudflare Pages project.
   - Go to Cloudflare Dashboard.
   - Open Workers & Pages.
   - Choose Pages.
   - Connect to Git.
   - Select the `med-quiz` GitHub repository.

4. Configure build settings:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: leave empty

5. Configure environment variables:
   - Add `NODE_VERSION`
   - Value: `22.12.0`

6. Deploy.
   - Cloudflare will build the app and give you a `*.pages.dev` URL.
   - Open the URL.
   - Click `Load Sample PDF`.
   - Confirm it imports 150 questions.
   - Start a test and check the first answer.

## Custom Domain Later

If you own a domain:

1. In Cloudflare Pages, open the deployed project.
2. Go to Custom domains.
3. Add the domain or subdomain, for example `quiz.example.com`.
4. Follow Cloudflare's DNS prompts.

## Update Flow After First Deploy

For future code changes:

```bash
npm run deploy:check
git add .
git commit -m "fix(app): describe the change"
git push
```

Cloudflare Pages will automatically deploy after the push.

## Rollback

Cloudflare Pages keeps previous deployments. If a new deployment breaks the quiz:

1. Open the Cloudflare Pages project.
2. Go to Deployments.
3. Pick the last working deployment.
4. Choose rollback/promote to production.

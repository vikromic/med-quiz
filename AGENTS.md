# AI Agent Operating Map

This file is for AI coding agents only. It is not product documentation and should not be used as a user-facing guide. Human-facing material belongs in `README.md` and `docs/`.

## Priority Contract

- Follow higher-priority system, developer, user, and platform instructions first.
- Apply these instructions to the entire repository unless a more specific nested `AGENTS.md` is added later.
- Before non-trivial edits, read this file, inspect `git status --short --branch`, and inspect the files/tests/docs adjacent to the intended change.
- Preserve unrelated user changes. Never revert or overwrite work you did not make unless explicitly instructed.
- Keep changes narrowly scoped to the requested behavior or documentation.
- Prefer existing repo patterns over new abstractions.
- Use ASCII for new text unless the target file already requires non-ASCII content.
- Do not add secrets, tokens, Cloudflare account IDs, or OAuth details to the repo.

## Project Facts

- Project: `med-quiz`
- App type: static Vite + TypeScript browser app.
- Runtime: no backend, no server database, no paid always-on process.
- Production URL: `https://med-quiz-1ad.pages.dev`
- GitHub repo: `https://github.com/vikromic/med-quiz`
- Cloudflare Pages project: `med-quiz`
- Cloudflare Pages Git provider: not connected.
- Deployment mode: manual Wrangler deploy from local build output.
- Required Node: `22.12.0` or newer.

## Commands

```bash
nvm use
npm install
npm run dev -- --port 3000
npm test
npm run build
npm run deploy:check
npx wrangler pages project list
npx wrangler pages deploy dist --project-name=med-quiz --branch=main --commit-hash=$(git rev-parse HEAD)
```

Use `npm run deploy:check` before claiming the app is deploy-ready. It runs Vitest and the production build.

## Repository Map

- `task.txt`: original product requirements. Read before changing product behavior.
- `index.html`: Vite entry document with `#app` mount.
- `src/main.ts`: imperative UI shell, render functions, event binding, app state transitions, local persistence calls, service worker registration.
- `src/types.ts`: domain model for question sets, quiz questions, sessions, options, and stats.
- `src/parser.ts`: text-to-question parser. It expects numbered questions, five options, and exactly one star-marked correct answer.
- `src/pdf.ts`: PDF import layer. It loads `pdfjs-dist`, sets the worker URL, extracts text page by page, and calls the parser.
- `src/pdfText.ts`: PDF.js text-item ordering. It groups positioned text items into readable lines.
- `src/browserCompatibility.ts`: browser polyfills, currently required for Safari `ReadableStream` async iteration compatibility with PDF.js.
- `src/quiz.ts`: pure quiz-session logic: session creation, answer selection, checking, stats, shuffling, next question, mistakes review.
- `src/storage.ts`: localStorage persistence under `med-quiz-state-v1`.
- `src/styles.css`: complete app styling. The UI is mobile-first and compact.
- `public/sample-med-quiz.pdf`: bundled sample PDF used by `Load Sample PDF`.
- `public/sw.js`: production service worker. Caches `/` and `/sample-med-quiz.pdf`, then updates cached GET responses after successful network fetches.
- `public/_headers`: Cloudflare Pages response headers and cache rules.
- `tests/*.test.ts`: Vitest coverage for parser, quiz logic, storage, PDF text ordering, and browser compatibility.
- `docs/deploy-cloudflare-pages.md`: authoritative deployment runbook and gotchas.
- `docs/victoria-handoff.md`: prepared handoff and message template.
- `README.md`: human-facing quick start and deployment summary.

## Behavior Invariants

- PDF files must be parsed entirely in the browser. Do not introduce server upload or remote PDF processing without explicit user approval.
- Imported PDFs and quiz progress must remain local to the browser unless explicitly changed.
- Keep the app static-host compatible: no Node runtime APIs in browser code, no backend assumptions, no server routes.
- Preserve the `Load Sample PDF` flow. It should import the bundled sample and produce 150 questions.
- Parser correctness depends on exactly one trailing `*` correct-answer marker per question.
- Parser should continue supporting Cyrillic option labels that visually match Latin `A`, `B`, `C`, `E`, and OCR-like `0` for option `D`.
- Keep `ReadableStream` async-iterator compatibility installed before PDF.js loads unless verified unnecessary across target browsers.
- In development, `src/main.ts` unregisters service workers to avoid stale cache confusion. Preserve that behavior unless replacing it deliberately.
- Do not weaken escaping in `src/main.ts`; rendered question and option text must stay HTML-escaped.

## Change Guidelines

- For parser changes, add or update `tests/parser.test.ts`.
- For quiz-state behavior, add or update `tests/quiz.test.ts`.
- For persistence changes, add or update `tests/storage.test.ts`.
- For PDF text extraction/order changes, add or update `tests/pdfText.test.ts`.
- For Safari/PDF compatibility changes, add or update `tests/browserCompatibility.test.ts`.
- For visual/UI changes, run the app locally and inspect the affected flow in a browser when possible.
- For deployment changes, update `README.md` and `docs/deploy-cloudflare-pages.md` together.
- For public handoff/status changes, update `docs/victoria-handoff.md` if the message would become stale.

## Deployment State

Cloudflare GitHub auto-deploy is not connected. A prior setup attempt failed with a Cloudflare GitHub callback error after reinstalling the Cloudflare Workers and Pages GitHub app. Do not state that GitHub pushes deploy automatically.

Manual production deploy flow:

```bash
npm run deploy:check
git status --short
git add path/to/changed-file path/to/changed-test
git diff --cached --stat
git commit -m "fix(app): describe the change"
git push
npx wrangler pages deploy dist --project-name=med-quiz --branch=main --commit-hash=$(git rev-parse HEAD)
```

For docs-only commits, deployment is optional because the live app bundle does not change.

Production smoke test after app deploy:

```bash
curl -I https://med-quiz-1ad.pages.dev
curl -I https://med-quiz-1ad.pages.dev/sample-med-quiz.pdf
```

Then browser-check:

- Open `https://med-quiz-1ad.pages.dev`.
- Click `Load Sample PDF`.
- Confirm the sample imports 150 questions.
- Start a test, answer one question, click `Check`, and confirm answer feedback appears.

## Git Discipline

- Commit automatically when a coherent, verified change is ready for review.
- Use commit subjects in this format: `<type>(<scope>): <subject>`.
- Inspect staged diff before committing.
- Do not commit partial, failing, exploratory, or unrelated work.
- Do not add AI signatures or co-author trailers.
- After committing, verify formatting with `git log -1 --pretty=%B`.

## Known Risks

- Cloudflare preview URLs can briefly fail TLS immediately after deploy; test production URL too.
- Service worker cache can make static-file issues appear stale; hard-refresh or unregister the site service worker while debugging.
- PDF.js and browser stream support are version-sensitive; keep compatibility tests close to dependency upgrades.
- `localStorage` can fail in private or restricted browser contexts; existing code surfaces a save error instead of crashing.

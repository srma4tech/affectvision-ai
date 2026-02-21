# affectvision-ai

Static multi-tool prototype with separate modules for interview preparation and interview process monitoring.

## Current modules

- Home tools selector: `index.html`
- Coaching and Preparation (single-screen, Chrome-only): `tools/coaching/index.html`
- Interview Monitoring Console (organization view): `tools/interview/index.html`
- Candidate Session Screen (for monitoring flow): `tools/interview/interviewee.html`

## Run locally

1. Start a static server from this folder.
2. Open the served URL in a modern browser.
3. From home, select either:
   - `Coaching and Preparation` for personal practice (Google Chrome required), or
   - `Interview Monitoring` for interviewer-driven sessions.
4. For monitoring flow, use `Open Candidate Session Screen` to open the candidate view in a new tab/window.
5. Allow camera permission when prompted on the active camera screen.

Example servers:

- `npx serve .`
- `python -m http.server 8000`

Do not open with `file://`; model loading and module imports require HTTP.

## Project structure

- `index.html` and `home.css`: tool selection home page
- `tools/coaching/`: single-screen coaching and preparation module
- `tools/interview/`: interviewer monitoring and candidate session screens
- `shared/interview-session-engine.js`: reusable camera + face-api session engine
- `shared/interview-channel.js`: cross-tab sync for live question updates
- `models/`: local `face-api.js` weights
- `docs/`: product and roadmap documents

## Coaching flow notes

- Users complete a survey first (interview type, topic, difficulty, question count).
- Questions are then asked one by one.
- Users can answer by text or audio (speech-to-text in Chrome).
- Each response is evaluated per question.
- Final report combines response quality and behavioral signals.
- Chrome AI is used when available; heuristic fallback is applied otherwise.

## Deploy to GitHub Pages

1. Push this repository to GitHub on branch `main`.
2. In GitHub repo settings, open `Pages`.
3. Set `Source` to `GitHub Actions`.
4. Commit/push any change (or run the workflow manually) to trigger deployment.
5. Open the published URL shown in the `Deploy static site to GitHub Pages` workflow run.

Notes:
- Workflow file: `.github/workflows/deploy-pages.yml`
- `.nojekyll` is included to avoid Jekyll processing issues.
- Detailed deployment/troubleshooting: `DEPLOYMENT.md`


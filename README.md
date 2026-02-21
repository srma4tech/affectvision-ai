# face-mood-detection

Static multi-tool prototype for camera-based mood and interview coaching workflows.

## Current modules

- Home tools selector: `index.html`
- Interviewer Console: `tools/interview/index.html`
- Interviewee Screen: `tools/interview/interviewee.html`

## Run locally

1. Start a static server from this folder.
2. Open the served URL in a modern browser.
3. From home, select `Interview Console`.
4. Use `Open Interviewee Screen` to open the candidate view in a new tab/window.
5. Allow camera permission when prompted.

Example servers:

- `npx serve .`
- `python -m http.server 8000`

Do not open with `file://`; model loading and module imports require HTTP.

## Project structure

- `index.html` and `home.css`: tool selection home page
- `tools/interview/`: interviewer and interviewee screens
- `shared/interview-session-engine.js`: reusable camera + face-api session engine
- `shared/interview-channel.js`: cross-tab sync for live question updates
- `models/`: local `face-api.js` weights
- `docs/`: product and roadmap documents

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

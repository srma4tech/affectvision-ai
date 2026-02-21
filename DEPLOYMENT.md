# Deployment Guide

This project is configured for static deployment on GitHub Pages.

## GitHub Pages Setup

1. Push the repository to GitHub on the `main` branch.
2. Open repository `Settings` -> `Pages`.
3. Set `Source` to `GitHub Actions`.
4. Trigger deployment:
   - Push to `main`, or
   - Run workflow manually: `Actions` -> `Deploy static site to GitHub Pages` -> `Run workflow`
5. Open the published URL from the workflow output.

Workflow file:
- `.github/workflows/deploy-pages.yml`

## Post-Deploy Validation Checklist

1. Home page loads successfully.
2. `Coaching and Preparation` opens and starts a single-screen practice flow.
3. `Interview Monitoring` opens from home.
4. `Open Candidate Session Screen` opens in a second tab/window.
5. Camera permission works in candidate screen.
6. Question updates sync from monitoring console to candidate screen.
7. Ending interview generates a monitoring report.

## Troubleshooting

## 1) Camera is blocked or not opening
- Ensure site is accessed via HTTPS (GitHub Pages is HTTPS by default).
- Check browser camera permissions for your Pages domain.
- Close other apps/tabs that may be locking the camera.
- Test in latest Chrome or Edge.

## 2) Candidate screen does not receive question updates
- Keep monitoring and candidate tabs on the same domain/origin.
- Do not mix localhost and GitHub Pages URL in the same session.
- Disable strict privacy extensions for the test domain if they block storage or broadcast APIs.

## 3) Report says "No samples captured"
- Confirm candidate tab has camera permission.
- Ensure candidate keeps face in frame.
- Check if candidate tab was closed/disconnected early.

## 4) Static assets fail to load (404)
- Ensure all paths remain relative in static files.
- Verify `models/` exists in the deployed artifact.
- Confirm `.nojekyll` exists to avoid Jekyll processing side effects.

## 5) GitHub Pages workflow fails
- Verify `Pages` source is set to `GitHub Actions`.
- Confirm workflow has permissions:
  - `pages: write`
  - `id-token: write`
- Re-run failed workflow from Actions tab after fixing config.

## Operational Notes

- Current monitoring sync is browser-tab based (`BroadcastChannel` with `localStorage` fallback).
- This is suitable for demo or single-origin sessions, not multi-device production interviews.
- For organization production use, move sync/events to backend WebSocket channels with session IDs.


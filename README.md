# face-mood-detection

Simple browser demo that detects faces and displays expression scores using `face-api.js`.

## Run locally

1. Start a static server from this folder.
2. Open the served URL in a modern browser.
3. Allow camera permission when prompted.

Example servers:

- `npx serve .`
- `python -m http.server 8000`

Do not open `index.html` directly with `file://`; model loading requires HTTP.

## Notes

- Models are loaded from `./models`.
- Webcam processing runs in-browser; no backend is used.

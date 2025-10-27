# Virtual Pet Study Helper — Boilerplate

This repository is a minimal Vite + React (TypeScript) Chrome Extension + web app starter for building a **Virtual Pet Study Helper**.
The extension is targeted at college students and includes:
- A friendly virtual pet UI (placeholder) that offers stress-relief tips and reminders.
- A Pomodoro timer with desktop notifications.
- Placeholder UI components for AI features (Prompt, Summarizer, Proofreader, Rewriter).
- A background service worker to schedule reminders.

## What you'll find in the zip
- `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`
- `public/manifest.json` (Chrome MV3 manifest)
- `src/` — React app, components, and background worker
- `scripts/pack-extension.js` — helpful pack script (requires `archiver`)

## How to build & test (dev machine)
1. Install dependencies:
   ```bash
   cd virtual-pet-study-helper-boilerplate
   npm install
   ```
2. Dev server (web preview):
   ```bash
   npm run dev
   ```
   Open the URL printed by Vite (usually `http://localhost:5173`) to preview the app.
3. Build:
   ```bash
   npm run build
   ```
   The build will be written to `dist/`.
4. Test as a Chrome Extension (unpacked):
   - Open `chrome://extensions/`
   - Enable **Developer mode**
   - Click **Load unpacked** and select the `dist/` folder (after build) plus make sure `manifest.json` from `public/` is present in that folder (copy it if needed).
   - The extension popup should show the app.

## How to integrate Chrome Built-in AI APIs (notes & links)
This boilerplate intentionally includes placeholders only. Chrome exposes client-side AI APIs (Prompt API, Summarizer, Proofreader, etc.) that let you run models such as **Gemini Nano** on-device inside Chrome — perfect for private, low-latency assistant features. See Chrome's official docs:
- Prompt API overview and examples. citeturn0search0
- Built-in AI Challenge / rules and APIs list. citeturn0search1turn0search4
- Chrome developer AI landing page. citeturn0search3

### Implementation hints
- Use `LanguageModel.create()` from the Prompt API in popup code to call the model. Check `LanguageModel.availability()` first.
- For structured output, pass a `responseConstraint` JSON Schema to the prompt call.
- The Summarizer and Proofreader APIs are great for note-summarization and grammar correction. Consider adding offline-friendly caching and a cloud fallback (Firebase AI Logic) for heavier models.
- Always follow the Generative AI Prohibited Uses Policy documented by Google when integrating client-side AI.

## Ideas to complete the project (for hackathon submission)
- Hook Pet moods to study performance and Pomodoro stats; pet gives personalized motivational messages generated with the Prompt API.
- Add a "study summary" feature: user pastes notes → Summarizer API distills them → pet explains the key points.
- Add a "rewrite for clarity" or "proofread" context menu: select text on any webpage → extension menu uses proofreader/rewriter APIs to suggest improvements.
- Provide multilingual suggestions with Translator API.
- Record a short demo video (< 3 minutes) showing extension installation and features for the Google Chrome Built-in AI Challenge submission.

## License
MIT

## Next steps
- Replace placeholder icons in `src/icons/` with real PNGs.
- Implement the actual Prompt/Summarizer/Proofreader calls in `src/components/ApiPanel.tsx` or a dedicated service module.
- Add unit tests and E2E tests if required by your process.


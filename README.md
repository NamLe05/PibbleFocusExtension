# Pibble Focus Extension — Virtual Pet Study Helper

A Chrome Extension featuring an adorable virtual pet that helps you stay focused and productive. Built with Vite + React (TypeScript) and powered by Chrome's Built-in AI APIs, this extension includes:
- An interactive virtual pet (Pibble) with stats, moods, and animations
- AI-powered writing assistance (Proofread, Rewrite, Summarize)
- Draggable pet overlay that works on any webpage
- Smart text processing using Gemini Nano

## Features
- **Virtual Pet System**: Feed, bathe, and interact with your pet to keep it happy
- **AI Writing Tools**: 
  - **Proofread**: Fix grammar, spelling, and punctuation
  - **Rewrite**: Get varied, creative alternatives to your text
  - **Summarize**: Extract key points from entire webpages
- **On-Device AI**: Uses Chrome's Built-in AI APIs for privacy and speed
- **Pet Overlay**: Draggable pet companion that appears on any webpage

## Project Structure
```
├── public/
│   ├── manifest.json          # Chrome Extension manifest (MV3)
│   ├── assets/                # Pet images and icons
│   └── injected/
│       └── pageBridge.js      # AI API bridge script
├── src/
│   ├── components/            # React components
│   │   ├── Pet.tsx           # Main pet component
│   │   └── styles/           # Component styles
│   ├── content/              # Content scripts
│   │   ├── contentScript.ts  # Main content script
│   │   └── petOverlay.ts     # Pet overlay injector
│   ├── background/           # Service worker
│   │   └── service-worker.ts
│   └── App.tsx               # React app entry
├── vite.config.ts            # Vite build config
└── package.json
```

## Setup & Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Extension
```bash
npm run build
```
The build output will be in `dist/`.

### 3. Load in Chrome
1. Open `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right)
3. Click **Load unpacked**
4. Select the `dist/` folder

### 4. Enable Chrome AI Features
To use the AI features, you must enable Chrome's Built-in AI APIs:

#### Required Chrome Flags
Navigate to `chrome://flags` and enable these flags:

1. **Prompt API for Gemini Nano**
   - Flag: `chrome://flags/#prompt-api-for-gemini-nano`
   - Set to: **Enabled**

2. **Summarization API for Gemini Nano**
   - Flag: `chrome://flags/#summarization-api-for-gemini-nano`
   - Set to: **Enabled**

3. **Rewriter API**
   - Flag: `chrome://flags/#rewriter-api`
   - Set to: **Enabled**

4. **Proofreader API**
   - Flag: `chrome://flags/#proofreader-api`
   - Set to: **Enabled**

5. **Optimization Guide On Device Model**
   - Flag: `chrome://flags/#optimization-guide-on-device-model`
   - Set to: **Enabled BypassPerfRequirement**
   - ⚠️ Important: Use "BypassPerfRequirement" if your device doesn't meet hardware requirements

After enabling flags, **restart Chrome** completely.

#### Check AI Availability
After restart, check model status:
```
chrome://on-device-internals
```
This page shows:
- Model download status
- Available APIs
- Model version info

#### Hardware Requirements
For optimal performance:
- **OS**: Windows 10+, macOS 13+ (Ventura+), Linux, ChromeOS 16389+
- **Storage**: 22 GB free space (for Gemini Nano model)
- **GPU**: 4+ GB VRAM (or use CPU fallback)
- **CPU**: 16 GB RAM + 4 cores (for CPU mode)
- **Network**: Unmetered connection for initial download

⚠️ **Note**: First-time use triggers a ~22 GB model download. This happens automatically when you first use an AI feature.

## Usage

### In Extension Popup
1. Click the extension icon to open the pet interface
2. View pet stats (Happiness, Hunger, XP)
3. Feed or bathe your pet using action buttons
4. Watch your pet's mood change based on stats

### On Any Webpage
1. The pet overlay appears in the bottom-right corner
2. Click the pet to open the AI assistant bubble
3. **Proofread/Rewrite**: Copy text (Cmd/Ctrl+C), then click the action
4. **Summarize**: Click "Summarize Page" to extract key points from the entire page
5. View results in the bubble and copy to clipboard
6. Drag the pet to reposition it (position is saved)

## Development

### Dev Mode (Web Preview)
```bash
npm run dev
```
Opens at `http://localhost:5173` for React app preview.

### Watch Mode (Extension Dev)
```bash
npm run build -- --watch
```
Auto-rebuilds on file changes. Reload extension in `chrome://extensions/`.

### Production Build
```bash
npm run build
```

## Chrome Built-in AI APIs

This extension uses Chrome's experimental on-device AI APIs:

### Prompt API
```javascript
const session = await ai.languageModel.create({
  systemPrompt: 'You are a helpful assistant'
});
const result = await session.prompt('Your query here');
```

### Summarizer API
```javascript
const summarizer = await Summarizer.create({
  type: 'key-points',
  format: 'markdown',
  length: 'medium'
});
const summary = await summarizer.summarize(text);
```

### Rewriter API
```javascript
const rewriter = await Rewriter.create({
  tone: 'more-casual',
  length: 'shorter'
});
const result = await rewriter.rewrite(text);
```

### Proofreader API
```javascript
const proofreader = await Proofreader.create();
const result = await proofreader.proofread(text);
```

## Resources

- [Chrome Built-in AI Challenge](https://developers.google.com/ai-challenge)
- [Prompt API Documentation](https://developer.chrome.com/docs/ai/built-in)
- [Summarizer API Guide](https://developer.chrome.com/docs/ai/summarizer-api)
- [AI API Samples](https://github.com/GoogleChrome/chrome-extensions-samples)
- [Generative AI Prohibited Uses Policy](https://policies.google.com/terms/generative-ai/use-policy)

## Troubleshooting

### AI APIs Not Working
1. Verify all flags are enabled in `chrome://flags`
2. Check `chrome://on-device-internals` for model status
3. Ensure Chrome version 138+ (Stable channel)
4. Check console for errors: Right-click extension → Inspect → Console

### Model Not Downloading
1. Ensure 22 GB free disk space
2. Connect to unmetered network (WiFi, not cellular)
3. Wait 5-10 minutes for download to start
4. Check `chrome://on-device-internals` for progress

### Extension Not Loading
1. Check `chrome://extensions` for errors
2. Ensure `manifest.json` is in `dist/` folder
3. Rebuild: `npm run build`
4. Try removing and re-adding the extension

## Future Enhancements
- [ ] Multi-language support with Translator API
- [ ] Context menu integration for quick AI actions
- [ ] Cloud backup for pet stats
- [ ] Achievement system
- [ ] Study session analytics


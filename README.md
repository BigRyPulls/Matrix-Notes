# MatrixNotes

A personal, offline-first workout logger with a Matrix-inspired interface.

**Personal use / work in progress.** This repository is a convenient place to access the tool and document its development. It is not a polished public release; features and data formats may change, and bugs are expected.

## Use the included build

Install Node.js 22.12+ (or 24 LTS), then clone or download this repository:

```sh
git clone https://github.com/BigRyPulls/Matrix-Notes.git
cd Matrix-Notes
node scripts/lan-server.mjs
```

Open `http://localhost:8080`. This serves the included `dist/` build without installing dependencies. Stop it with Ctrl+C. The server also accepts connections from devices on the same trusted network; use the network URL it prints.

For hosting, serve the contents of `dist/` with a static web host. HTTPS (or localhost) is required for the service worker and offline PWA features. Opening `index.html` directly is not supported. The repository itself does not provide a hosted app.

## Develop or rebuild

```sh
npm ci
npm run dev
```

```sh
npm run typecheck
npm run build
npm run preview
```

`npm run build` replaces `dist/`. The built files are committed intentionally so the app can be used without a build step. Update them with source changes.

## What it does

- Log workouts, sets, exercises, and personal records.
- Browse workout history, graphs, and body measurements.
- Use training programs, create custom programs, and save workout templates.
- Run rest and session timers.
- Export and import JSON backups.
- Cache the app for offline use after an initial visit over HTTPS or localhost.

## Data and backups

Workout data is stored locally in your browser (IndexedDB and localStorage). There is no account or cloud sync. Data is specific to the browser and site address: changing the address or port, switching devices, or clearing browser storage can leave you with an empty app.

Use the export option in Settings regularly, keep backups outside this repository, and import them when moving browsers or devices. Personal logs, exports, databases, spreadsheets, and the private training plan are excluded from this public copy.

## Project notes

TypeScript, Vite, vanilla DOM UI, IndexedDB via `idb`, and `vite-plugin-pwa`. Application code is in `src/`; static icons are in `public/`; the ready-to-serve app is in `dist/`.

The public build is based on the latest complete local build from **25 August 2026**, rebuilt with private content removed. See [CHANGELOG.md](CHANGELOG.md) for public-copy changes.

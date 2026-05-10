# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server with HMR
npm run build     # Production build to dist/
npm run preview   # Serve the production build locally
npm run format    # Prettier format src/ (no semi, single quotes, 100-char width)
```

No test or lint scripts are configured.

## Architecture

Vue 3 SPA built with Vite. Entry point is `index.html` → `src/main.js`, which creates the Vue app, installs Pinia and Vue Router, then mounts to `#app`.

**Path alias:** `@/` resolves to `src/`.

**Routing** — `src/router/index.js` uses HTML5 history mode (`createWebHistory`). Routes array is currently empty; add named route objects here.

**State** — `src/stores/` holds Pinia stores (composition-style). `counter.js` is the starter example. Add new stores as separate files in this directory and import them directly in components.

**Components** — `src/App.vue` is the root shell. Feature components should live under `src/components/` or feature-scoped subdirectories; there is no enforced structure yet.

**Prettier config** (`.prettierrc.json`): `semi: false`, `singleQuote: true`, `printWidth: 100` — run `npm run format` before committing.

## Integrations

@notes/higgsfield.md

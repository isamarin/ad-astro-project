# Migration: Nuxt → Tauri v2 + Svelte

## Done

| Item | Status |
|------|--------|
| Monorepo `apps/desktop` + `services/camera` + `packages/shared` | Done |
| Tauri v2 + SvelteKit SPA (macOS build) | Done |
| Star Watcher UI slice (modes, stream, controls, events, timelapse) | Done |
| Agent SSE + Open-Meteo + WHEP proxy | Done |
| Compose without Nuxt | Done |
| **Removed Nuxt `app/` + `server/` + root Dockerfile** | Done |
| CI: no app image jobs | Done |

## Still open

| Item | Notes |
|------|--------|
| Android 12 (`tauri android init`, minSdk 31) | Scaffold + CI APK |
| Plate-solve on device | Pending |
| Desktop CI (Win/Linux/macOS artifacts) | GitHub Actions |
| Full UI parity (StarOverlay live, histogram, etc.) | Partial |

## Commands

```bash
pnpm install
make dev-tauri
# Pi: make deploy
```

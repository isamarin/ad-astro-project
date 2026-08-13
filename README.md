# AstroStreamer · Star Watcher

Self-hosted remote control for a Canon DSLR on a single-board computer.

| Piece | Role |
|-------|------|
| **Tauri app** (`apps/desktop`) | Orchestrator UI — macOS / Windows / Linux / Android |
| **Camera agent** (`services/camera`) | gphoto2, LiveView, capture, timelapse on the SBC |
| **MediaMTX** | RTSP → WebRTC for the live preview |

Orange Pi (or similar) is a **remote agent only** — no web UI on the board. Plate-solve and orchestration run on the user device.

```
Canon DSLR ──USB──► Pi agent (gphoto2 → ffmpeg → MediaMTX)
                         │ HTTP :3001  +  WHEP :8889
                         ▼
              Star Watcher (Tauri on PC / phone)
```

## Repo layout

```
apps/desktop/          Tauri v2 + SvelteKit SPA (orchestrator)
packages/shared/       Shared TS types
services/camera/       Node camera agent (Pi)
docker-compose.yml     mediamtx + camera only
```

## Quick start (orchestrator)

```bash
pnpm install
make dev-tauri          # or: pnpm dev:tauri
# → mock mode by default (no hardware)
# Settings → set Pi host, disable Mock
```

Vite-only (no native shell):

```bash
make dev                # http://localhost:1420
```

## Pi agent

```bash
# first time
make setup-pi

# build armv7 image on dev machine + deploy
make deploy
```

On the Pi after deploy: stack at `/opt/astrostreamer` — services `mediamtx` + `camera` (host network).

Agent endpoints (defaults):

| Method | Path | Notes |
|--------|------|--------|
| GET | `/status` | camera connected / model |
| GET/POST | `/config/...` | gphoto2 params |
| POST | `/capture` | still frame |
| GET | `/events` | SSE activity log |
| POST | `/whep/:path` | WebRTC SDP proxy |
| * | `/timelapse/*` | sessions |

## Environment (agent)

Copy `.env.example` → `.env` on the Pi host:

| Variable | Purpose |
|----------|---------|
| `SBC_IP` | LAN IP (MediaMTX WebRTC ICE hosts) |
| `INTERNAL_API_KEY` | optional API key for mutating routes |
| `OBSERVER_LAT/LON` | auto-timelapse / sun altitude |
| `SMTP_*` / `NOTIFICATION_EMAIL` | timelapse mail reports |
| `AUTO_TIMELAPSE` | `true` to enable night auto sessions |

Weather for auto mode uses **Open-Meteo** (no API key).

## Development notes

- Package manager: **pnpm** (workspace)
- Node 22+, Rust (for Tauri), optional Android Studio for mobile
- `make dev-infra` — local MediaMTX via `docker-compose.dev.yml`
- Design reference (optional): `.claude-disgner/`

## Desktop / Android builds

```bash
make desktop-build          # macOS/Windows/Linux native bundle
source scripts/android-env.sh
make android-init           # once
make android-build          # APK, Android 12+, arm64
```

GitHub Actions on `v*` tags (or workflow_dispatch):

- `.github/workflows/desktop.yml` — macOS arm64/x64, Linux, Windows
- `.github/workflows/android.yml` — APK
- `.github/workflows/validate.yml` — Svelte build + check on `main` / PRs

Remote: https://github.com/isamarin/ad-astro-project

## Migration

Nuxt web panel removed. See `MIGRATION_TAURI.md`.

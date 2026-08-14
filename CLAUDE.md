# AstroStreamer (agent notes)

**Git:** https://github.com/isamarin/ad-astro-project only (`origin`).

## Architecture

- **Orchestrator:** `apps/desktop` — Tauri v2 + SvelteKit SPA (PC/Android)
- **Agent:** `services/camera` — Node gphoto2 service on Orange Pi
- **Media:** MediaMTX (RTSP/WebRTC), host network on Pi
- **No Nuxt.** No UI process on the Pi.

## Commands

```bash
pnpm install
pnpm dev:tauri              # orchestrator
pnpm --filter desktop build
make deploy                 # cross-build camera + push to Pi
```

## Agent API (port 3001)

`/status`, `/config/*`, `/capture`, `/events` (SSE), `/whep/:path`, `/timelapse/*`

## UI

Deep Space palette, modes: chill | manual | astro. Connection settings in-app (host, ports, mock).

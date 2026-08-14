# Lumina · Star Watcher

Self-hosted remote control for a camera.

The orchestrator describes a **camera interface**. It does not know Canon, Nikon, or gphoto2. Anything that implements `lumina.camera.v1` can drive the app.

| Piece | Role |
|-------|------|
| **Tauri app** (`apps/desktop`) | Orchestrator UI — macOS / Windows / Linux / Android |
| **Camera interface** (`packages/shared`) | `CameraAdapter` + HTTP protocol |
| **Your adapter** | Separate process that speaks that protocol |
| **MediaMTX** | Usually next to the adapter, for live view |

```
Any camera ──► your adapter ──HTTP / WHEP──► Star Watcher
```

## Write an adapter

Spec: [`packages/shared/PROTOCOL.md`](packages/shared/PROTOCOL.md)

Minimum: `GET /adapter` returns `{ "protocol": "lumina.camera.v1", "id", "name", "streamPath", "capabilities" }`. Then implement the routes your capabilities claim.

A reference implementation: [lumina-stream/canon-adapter](https://github.com/lumina-stream/canon-adapter).

In the app: Settings → **Remote adapter** → host and port → **Probe adapter**.

## Repo layout

```
apps/desktop/          Tauri v2 + SvelteKit SPA
packages/shared/       Camera interface + protocol
```

No camera agent lives here.

## Quick start

```bash
pnpm install
make dev-tauri          # or: pnpm dev:tauri
# first launch: Simulator, or Remote adapter + probe
```

Vite only: `make dev` → http://localhost:1420

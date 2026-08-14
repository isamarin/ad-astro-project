# Star Watcher (Tauri orchestrator)

Multi-platform UI for Lumina: **macOS / Windows / Linux / Android 12+**.

The app talks to the `CameraAdapter` interface. Simulator implements it in-process. A remote adapter implements `lumina.camera.v1` over HTTP.

Write one: [`packages/shared/PROTOCOL.md`](../../packages/shared/PROTOCOL.md).

## Dev

```bash
pnpm install
pnpm --filter desktop dev          # http://localhost:1420
pnpm --filter desktop tauri dev
```

First launch: pick Simulator or probe a remote adapter.

## Connect

Settings → **Remote adapter** → host / port → **Probe adapter**. The handshake is `GET /adapter`. The app refuses anything that is not `lumina.camera.v1`.

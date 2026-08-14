# Lumina (agent notes)

**Git:** https://github.com/lumina-stream/lumina (`origin`).

## Architecture

- **Orchestrator:** `apps/desktop` — Tauri v2 + SvelteKit SPA (PC/Android)
- **Camera interface:** `packages/shared` — `CameraAdapter`, `lumina.camera.v1`
- **Adapters:** any process that implements the interface. Spec: `packages/shared/PROTOCOL.md`
- **Reference:** https://github.com/lumina-stream/canon-adapter
- **No vendor camera code in this repo.**

## Commands

```bash
pnpm install
pnpm dev:tauri
pnpm --filter desktop build
```

Settings: Simulator (built-in `CameraAdapter`) or Remote adapter (`GET /adapter` handshake).

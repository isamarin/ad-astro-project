# Star Watcher (Tauri orchestrator)

Multi-platform UI for AstroStreamer: **macOS / Windows / Linux / Android 12+**.

Orange Pi runs only the **camera agent** (`services/camera` + MediaMTX). This app is the orchestrator.

## Dev

```bash
# from repo root
pnpm install
pnpm --filter desktop dev          # Vite only → http://localhost:1420
pnpm --filter desktop tauri dev    # Desktop shell

# Settings → enable Mock mode (default) for UI without Pi
# Or set Pi host IP and disable mock
```

## Desktop build

```bash
# from repo root
make desktop-build
# → apps/desktop/src-tauri/target/release/bundle/
```

CI: `.github/workflows/desktop.yml` (macOS arm64/x64, Ubuntu, Windows). Tag `v*` or run manually.

## Android

minSdk **31** (Android 12). LAN HTTP to the Pi agent is allowed (cleartext).

```bash
# once on this machine
source scripts/android-env.sh
make android-init          # generates src-tauri/gen/android
make android-build         # APK, aarch64
# or live reload on a device/emulator:
make dev-android
```

CI: `.github/workflows/android.yml` — APK artifact, attached on `v*` tags.

## Connect to agent

| Setting | Default |
|---------|---------|
| Host | `192.168.1.70` |
| Camera port | `3001` |
| WebRTC port | `8889` (WHEP goes via agent `/whep/:path`) |
| Mock | `true` |

Agent SSE: `GET http://{host}:3001/events`

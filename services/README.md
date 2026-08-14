# Camera adapters

This repo ships the **interface**, not a camera.

- Types: `packages/shared` (`CameraAdapter`, `AdapterManifest`, routes)
- Human spec: [`packages/shared/PROTOCOL.md`](../packages/shared/PROTOCOL.md)

Anyone can implement `lumina.camera.v1` and connect it in Settings → Remote adapter.

Reference: https://github.com/lumina-stream/canon-adapter

# lumina.camera.v1

The orchestrator never talks to a camera body. It talks to this interface. Any adapter that implements it can drive Star Watcher — Canon, Nikon, a phone, a file playback box.

Types live in this package (`@astrostreamer/shared`). This file is the same contract in English.

## Handshake

`GET /adapter` is required. The app will not use a host that does not answer it.

```json
{
  "id": "my-camera",
  "name": "My Camera",
  "version": "1.0.0",
  "protocol": "lumina.camera.v1",
  "streamPath": "live",
  "capabilities": {
    "liveView": true,
    "stillCapture": true,
    "timelapse": true,
    "exposure": true,
    "focus": false
  }
}
```

- `protocol` must be exactly `lumina.camera.v1`.
- `id` is your adapter, not a brand the app already knows.
- `streamPath` is the MediaMTX / WHEP path you publish.
- Capabilities tell the UI what to show. Missing flags are `false`.

CORS: allow the orchestrator (or `*`). Mutating routes may require `X-Api-Key` or `Authorization: Bearer …`.

## Routes

| Method | Path | When | Body / result |
|--------|------|------|----------------|
| GET | `/adapter` | always | `AdapterManifest` |
| GET | `/status` | always | `{ connected, model, lens, serial, port, streaming, adapter? }` |
| GET | `/config/:key` | `exposure` or `focus` | `{ value, choices }` |
| POST | `/config/:key` | same | `{ "value": "…" }` → `{ ok: true }` |
| GET | `/config/list` | optional | map of key → `{ value, choices }` |
| POST | `/capture` | `stillCapture` | `{ ok, filename, size, format, path }` |
| GET | `/events` | optional | SSE: `data: {"type":"init","events":[…]}` then `{"type":"event","event":{…}}` |
| POST | `/whep/:path` | `liveView` | SDP offer → SDP answer (`Content-Type: application/sdp`) |
| POST | `/stream/start` `/stream/stop` | `liveView` | `{ ok, streaming }` |
| POST | `/timelapse/start` | `timelapse` | `SessionConfig` → `Session` |
| POST | `/timelapse/stop` | `timelapse` | `Session` |
| GET | `/timelapse/status` | `timelapse` | `Session` or `{ "status": "idle" }` |
| GET | `/timelapse/sessions` | `timelapse` | `Session[]` |
| POST | `/timelapse/auto/enable` `/disable` | optional | `{ ok }` |

## Config keys the app writes

If `capabilities.exposure` is true, implement these names (map vendor keys inside the adapter):

| Key | Meaning |
|-----|---------|
| `iso` | ISO |
| `shutterspeed` | Shutter (`1/125`, `30`, `bulb`, …) |
| `whitebalance` | `AUTO`, `DAYLIGHT`, `SHADE`, `CLOUDY`, `TUNGSTEN`, `FLUOR`, or your choices |

Optional: `aperture`, `focus`, `autoexposuremode`, `lensname`, `serialnumber`.

## Status

`model` / `lens` / `serial` are whatever the body reports. The app displays them; it does not interpret brand names.

## How the app uses you

1. User picks **Remote adapter** and enters host + port.
2. App calls `GET /adapter`. Wrong protocol → refused.
3. App stores your manifest (`id`, `name`, `streamPath`, capabilities).
4. Live view, capture, exposure, timelapse follow those flags.

A reference implementation: [lumina-stream/canon-adapter](https://github.com/lumina-stream/canon-adapter).

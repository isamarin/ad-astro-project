import {
  EMPTY_CAPABILITIES,
  type CameraCapabilities,
  type CaptureResult,
  type ConfigEntry,
  type Session,
  type SessionConfig
} from './camera.js'

/** Handshake string. Adapters that speak another version are rejected. */
export const CAMERA_PROTOCOL = 'lumina.camera.v1'

/**
 * HTTP surface every remote adapter MUST expose.
 * CORS: allow the orchestrator origin (or `*`). Mutating routes MAY require `X-Api-Key`.
 */
export const CAMERA_ROUTES = {
  adapter: { method: 'GET', path: '/adapter' },
  status: { method: 'GET', path: '/status' },
  listConfig: { method: 'GET', path: '/config/list' },
  getConfig: { method: 'GET', path: '/config/:key' },
  setConfig: { method: 'POST', path: '/config/:key' },
  capture: { method: 'POST', path: '/capture' },
  events: { method: 'GET', path: '/events' },
  whep: { method: 'POST', path: '/whep/:path' },
  streamStart: { method: 'POST', path: '/stream/start' },
  streamStop: { method: 'POST', path: '/stream/stop' },
  timelapseStart: { method: 'POST', path: '/timelapse/start' },
  timelapseStop: { method: 'POST', path: '/timelapse/stop' },
  timelapseStatus: { method: 'GET', path: '/timelapse/status' },
  timelapseSessions: { method: 'GET', path: '/timelapse/sessions' },
  timelapseAutoEnable: { method: 'POST', path: '/timelapse/auto/enable' },
  timelapseAutoDisable: { method: 'POST', path: '/timelapse/auto/disable' }
} as const

/** First response the app reads. Identifies the adapter, not a camera brand. */
export interface AdapterManifest {
  id: string
  name: string
  version: string
  protocol: typeof CAMERA_PROTOCOL
  streamPath: string
  capabilities: CameraCapabilities
}

export const SIMULATOR_MANIFEST: AdapterManifest = {
  id: 'simulator',
  name: 'Simulator',
  version: '1.0.0',
  protocol: CAMERA_PROTOCOL,
  streamPath: 'live',
  capabilities: {
    liveView: false,
    stillCapture: true,
    timelapse: true,
    exposure: true,
    focus: true
  }
}

function asCapabilities(raw: unknown): CameraCapabilities {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return {
    liveView: src.liveView === true,
    stillCapture: src.stillCapture === true,
    timelapse: src.timelapse === true,
    exposure: src.exposure === true,
    focus: src.focus === true
  }
}

export function parseAdapterManifest(data: unknown): AdapterManifest {
  if (!data || typeof data !== 'object') {
    throw new Error('Adapter returned no manifest')
  }
  const m = data as Record<string, unknown>
  if (m.protocol !== CAMERA_PROTOCOL) {
    throw new Error(
      `Unsupported protocol ${String(m.protocol ?? '(missing)')} (want ${CAMERA_PROTOCOL})`
    )
  }
  if (typeof m.id !== 'string' || !m.id.trim()) {
    throw new Error('Manifest missing id')
  }
  if (typeof m.name !== 'string' || !m.name.trim()) {
    throw new Error('Manifest missing name')
  }
  return {
    id: m.id.trim(),
    name: m.name.trim(),
    version: typeof m.version === 'string' && m.version ? m.version : '0.0.0',
    protocol: CAMERA_PROTOCOL,
    streamPath:
      typeof m.streamPath === 'string' && m.streamPath.trim()
        ? m.streamPath.trim()
        : 'live',
    capabilities: Object.keys(m.capabilities ?? {}).length
      ? asCapabilities(m.capabilities)
      : { ...EMPTY_CAPABILITIES }
  }
}

export type SetConfigBody = { value: string }
export type SetConfigResult = { ok: boolean }
export type CaptureBody = Record<string, never>
export type TimelapseStartBody = SessionConfig
export type TimelapseIdle = { status: 'idle' }

export type AdapterStatusPayload = {
  adapter?: string
  connected: boolean
  model: string
  lens: string
  serial: string
  port: string
  streaming: boolean
}

export type ConfigListPayload = Record<string, { value: string; choices: string[] }>

export type { CaptureResult, ConfigEntry, Session }

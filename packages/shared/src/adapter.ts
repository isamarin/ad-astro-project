import type {
  CameraStatus,
  CaptureResult,
  ConfigEntry,
  Session,
  SessionConfig
} from './camera.js'
import type { AdapterManifest } from './protocol.js'

/**
 * The camera the app talks to.
 * Simulator and every remote adapter implement this. The UI never branches on vendor.
 */
export interface CameraAdapter {
  readonly kind: 'simulator' | 'remote'
  manifest(): Promise<AdapterManifest>
  status(): Promise<CameraStatus>
  getConfig(key: string): Promise<ConfigEntry>
  setConfig(key: string, value: string): Promise<void>
  capture(): Promise<CaptureResult>
  /** `null` when the adapter has no event stream. */
  eventsUrl(): string | null
  /** `null` when the adapter has no live view. */
  whepUrl(streamPath: string): string | null
  timelapseStatus(): Promise<Session | { status: 'idle' }>
  timelapseSessions(): Promise<Session[]>
  startTimelapse(config: SessionConfig): Promise<Session>
  stopTimelapse(): Promise<Session | { status: string }>
  setTimelapseAuto(enabled: boolean): Promise<void>
}

export type CameraSource = '' | 'simulator' | 'remote'

export interface ConnectionSettings {
  source: CameraSource
  host: string
  cameraPort: number
  webrtcPort: number
  apiKey: string
  timezoneOffset: number
  streamPath: string
  /** Last successful handshake. `null` until a remote adapter answers `GET /adapter`. */
  manifest: AdapterManifest | null
}

export const DEFAULT_CONNECTION: ConnectionSettings = {
  source: '',
  host: '192.168.1.70',
  cameraPort: 3001,
  webrtcPort: 8889,
  apiKey: '',
  timezoneOffset: 3,
  streamPath: 'live',
  manifest: null
}

export function isSimulator(source: CameraSource | string | null | undefined): boolean {
  return source === 'simulator'
}

export function isRemote(source: CameraSource | string | null | undefined): boolean {
  return source === 'remote'
}

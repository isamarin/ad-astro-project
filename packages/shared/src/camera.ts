/** Vendor-agnostic camera as the orchestrator sees it. */

export interface CameraCapabilities {
  liveView: boolean
  stillCapture: boolean
  timelapse: boolean
  exposure: boolean
  focus: boolean
}

export const EMPTY_CAPABILITIES: CameraCapabilities = {
  liveView: false,
  stillCapture: false,
  timelapse: false,
  exposure: false,
  focus: false
}

/** Body + optic. The adapter fills this; the app never names a vendor. */
export interface Camera {
  model: string
  lens: string
  serial: string
  connected: boolean
  streaming: boolean
}

export interface CameraStatus extends Camera {
  /** Physical or transport port, if the adapter has one (USB, IP, …). */
  port: string
  /** Adapter id from the handshake. */
  adapter?: string
}

/**
 * Config keys the app reads and writes.
 * An adapter that sets `capabilities.exposure` MUST implement iso / shutterspeed / whitebalance
 * under these names. Other keys are optional.
 */
export const CAMERA_CONFIG = {
  iso: 'iso',
  shutter: 'shutterspeed',
  whitebalance: 'whitebalance',
  aperture: 'aperture',
  focus: 'focus',
  exposureMode: 'autoexposuremode',
  lensName: 'lensname',
  serialNumber: 'serialnumber'
} as const

export type CameraConfigKey = (typeof CAMERA_CONFIG)[keyof typeof CAMERA_CONFIG]

export interface ConfigEntry {
  key: string
  value: string
  choices: string[]
}

export interface CaptureResult {
  ok: boolean
  filename: string
  size: string
  format: string
  path: string
}

export type SessionType = 'timelapse_forced' | 'timelapse_auto' | 'startrails'
export type SessionStatus =
  | 'idle'
  | 'preparing'
  | 'capturing'
  | 'processing'
  | 'complete'
  | 'error'
  | 'stopped'

export interface SessionPreset {
  iso: string
  shutter: string
  wb: string
}

export interface SessionConfig {
  type: SessionType
  preset: SessionPreset
  interval: number
  maxFrames: number
  bufferSeconds: number
}

export interface Session {
  id: string
  config: SessionConfig
  status: SessionStatus
  startedAt: string
  stoppedAt?: string
  framesDir: string
  framesCaptured: number
  failedFrames: number
  outputPath?: string
  error?: string
}

export type EventKind =
  | 'setting'
  | 'system'
  | 'capture'
  | 'detect'
  | 'error'
  | 'telemetry'
  | 'timelapse'

export interface CameraEvent {
  kind: EventKind
  message: string
  detail?: string
  thumbnail?: string
}

export interface EventEntry extends CameraEvent {
  id: string
  time: string
}

export const EVENT_KIND_META: Record<
  EventKind,
  { tag: string; color: string; label: string }
> = {
  setting: { tag: 'SET', color: 'var(--accent)', label: 'Settings' },
  system: { tag: 'SYS', color: 'var(--accent-2)', label: 'System' },
  capture: { tag: 'CAP', color: 'var(--accent-3)', label: 'Capture' },
  detect: { tag: 'DET', color: 'var(--good)', label: 'Detect' },
  error: { tag: 'ERR', color: 'var(--bad)', label: 'Error' },
  telemetry: { tag: 'TEL', color: 'var(--ink-3)', label: 'Telemetry' },
  timelapse: { tag: 'TL', color: 'var(--accent-2)', label: 'Timelapse' }
}

/** Shared API types between camera agent and Tauri orchestrator */

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

export interface CameraStatus {
  connected: boolean
  model: string
  lens: string
  serial: string
  port: string
  streaming: boolean
}

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

export type AppMode = 'chill' | 'manual' | 'astro'

export interface ConnectionSettings {
  host: string
  cameraPort: number
  webrtcPort: number
  apiKey: string
  mock: boolean
  timezoneOffset: number
  streamPath: string
}

export const DEFAULT_CONNECTION: ConnectionSettings = {
  host: '192.168.1.70',
  cameraPort: 3001,
  webrtcPort: 8889,
  apiKey: '',
  mock: true,
  timezoneOffset: 3,
  streamPath: 'canon'
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

export const ISO_SCALE = [
  '100',
  '200',
  '400',
  '800',
  '1600',
  '3200',
  '6400',
  '12800'
] as const

export const SHUTTER_MAN = [
  '1/4000',
  '1/3200',
  '1/2500',
  '1/2000',
  '1/1600',
  '1/1250',
  '1/1000',
  '1/800',
  '1/640',
  '1/500',
  '1/400',
  '1/320',
  '1/250',
  '1/200',
  '1/160',
  '1/125',
  '1/100',
  '1/80',
  '1/60',
  '1/50',
  '1/40',
  '1/30',
  '1/25',
  '1/20',
  '1/15',
  '1/13',
  '1/10',
  '1/8',
  '1/6',
  '1/5',
  '1/4',
  '0.3',
  '0.5',
  '0.8',
  '1',
  '1.3',
  '1.6',
  '2',
  '2.5',
  '3.2',
  '4',
  '5',
  '6',
  '8',
  '10',
  '13',
  '15',
  '20',
  '25',
  '30'
] as const

export const SHUTTER_AST = ['8', '10', '13', '15', '20', '25', '30', 'bulb'] as const

export const WB_PRESETS = [
  'AUTO',
  'DAYLIGHT',
  'SHADE',
  'CLOUDY',
  'TUNGSTEN',
  'FLUOR'
] as const

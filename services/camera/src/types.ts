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

export interface CameraEvent {
  kind: 'setting' | 'system' | 'capture' | 'detect' | 'error' | 'telemetry' | 'timelapse'
  message: string
  detail?: string
  thumbnail?: string
}

// --- Timelapse / Star Trails ---

export type SessionType = 'timelapse_forced' | 'timelapse_auto' | 'startrails'
export type SessionStatus = 'idle' | 'preparing' | 'capturing' | 'processing' | 'complete' | 'error' | 'stopped'

export interface SessionPreset {
  iso: string
  shutter: string
  wb: string
}

export interface SessionConfig {
  type: SessionType
  preset: SessionPreset
  interval: number      // seconds between captures
  maxFrames: number     // 0 = unlimited
  bufferSeconds: number // gap after shutter (default 5)
}

export interface Session {
  id: string            // YYYYMMDD_HHmmss_<type>
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

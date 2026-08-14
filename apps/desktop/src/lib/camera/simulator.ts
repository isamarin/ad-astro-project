import {
  SIMULATOR_MANIFEST,
  type CameraAdapter,
  type CameraStatus,
  type CaptureResult,
  type ConfigEntry,
  type Session,
  type SessionConfig
} from '@astrostreamer/shared'

const config = new Map<string, string>([
  ['iso', '400'],
  ['shutterspeed', '1/125'],
  ['whitebalance', 'DAYLIGHT'],
  ['aperture', '2.0'],
  ['focus', '62']
])

let session: Session | null = null

export const simulatorAdapter: CameraAdapter = {
  kind: 'simulator',

  async manifest() {
    return SIMULATOR_MANIFEST
  },

  async status(): Promise<CameraStatus> {
    return {
      model: 'Simulator',
      lens: '',
      serial: '',
      connected: true,
      streaming: false,
      port: '',
      adapter: SIMULATOR_MANIFEST.id
    }
  },

  async getConfig(key: string): Promise<ConfigEntry> {
    return { key, value: config.get(key) ?? '', choices: [] }
  },

  async setConfig(key: string, value: string) {
    config.set(key, value)
  },

  async capture(): Promise<CaptureResult> {
    return { ok: true, filename: 'SIM.JPG', size: '0', format: 'JPEG', path: '' }
  },

  eventsUrl() {
    return null
  },

  whepUrl() {
    return null
  },

  async timelapseStatus() {
    return session ?? { status: 'idle' as const }
  },

  async timelapseSessions() {
    return session ? [session] : []
  },

  async startTimelapse(sessionConfig: SessionConfig) {
    session = {
      id: 'simulator',
      config: sessionConfig,
      status: 'capturing',
      startedAt: new Date().toISOString(),
      framesDir: '',
      framesCaptured: 0,
      failedFrames: 0
    }
    return session
  },

  async stopTimelapse() {
    if (!session) return { status: 'idle' }
    session = { ...session, status: 'stopped', stoppedAt: new Date().toISOString() }
    return session
  },

  async setTimelapseAuto() {
    /* no-op */
  }
}

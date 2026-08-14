import {
  parseAdapterManifest,
  type AdapterManifest,
  type CameraAdapter,
  type CameraStatus,
  type CaptureResult,
  type ConfigEntry,
  type ConnectionSettings,
  type Session,
  type SessionConfig
} from '@astrostreamer/shared'

export interface RemoteTarget {
  host: string
  cameraPort: number
  apiKey: string
}

function baseUrl(target: RemoteTarget): string {
  return `http://${target.host}:${target.cameraPort}`
}

function headers(target: RemoteTarget, json = false): HeadersInit {
  const h: Record<string, string> = {}
  if (json) h['Content-Type'] = 'application/json'
  if (target.apiKey) h['X-Api-Key'] = target.apiKey
  return h
}

async function request<T>(target: RemoteTarget, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl(target)}${path}`, {
    ...init,
    headers: {
      ...headers(target, init?.method !== 'GET' && init?.body !== undefined),
      ...(init?.headers || {})
    }
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`${res.status} ${path}: ${text || res.statusText}`)
  }
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('application/json')) return (await res.json()) as T
  return (await res.text()) as T
}

export async function probeRemoteAdapter(target: RemoteTarget): Promise<AdapterManifest> {
  return parseAdapterManifest(await request<unknown>(target, '/adapter'))
}

export class RemoteCameraAdapter implements CameraAdapter {
  readonly kind = 'remote' as const

  constructor(private readonly target: RemoteTarget) {}

  manifest() {
    return probeRemoteAdapter(this.target)
  }

  status() {
    return request<CameraStatus>(this.target, '/status')
  }

  getConfig(key: string) {
    return request<ConfigEntry>(this.target, `/config/${key}`)
  }

  async setConfig(key: string, value: string) {
    await request(this.target, `/config/${key}`, {
      method: 'POST',
      body: JSON.stringify({ value })
    })
  }

  capture() {
    return request<CaptureResult>(this.target, '/capture', {
      method: 'POST',
      body: '{}'
    })
  }

  eventsUrl() {
    return `${baseUrl(this.target)}/events`
  }

  whepUrl(streamPath: string) {
    return `${baseUrl(this.target)}/whep/${streamPath}`
  }

  timelapseStatus() {
    return request<Session | { status: 'idle' }>(this.target, '/timelapse/status')
  }

  timelapseSessions() {
    return request<Session[]>(this.target, '/timelapse/sessions')
  }

  startTimelapse(config: SessionConfig) {
    return request<Session>(this.target, '/timelapse/start', {
      method: 'POST',
      body: JSON.stringify(config)
    })
  }

  stopTimelapse() {
    return request<Session | { status: string }>(this.target, '/timelapse/stop', {
      method: 'POST',
      body: '{}'
    })
  }

  async setTimelapseAuto(enabled: boolean) {
    await request(
      this.target,
      enabled ? '/timelapse/auto/enable' : '/timelapse/auto/disable',
      { method: 'POST', body: '{}' }
    )
  }
}

export function remoteFromSettings(settings: ConnectionSettings): RemoteCameraAdapter {
  return new RemoteCameraAdapter({
    host: settings.host,
    cameraPort: settings.cameraPort,
    apiKey: settings.apiKey
  })
}

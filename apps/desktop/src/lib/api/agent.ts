import type {
  CameraStatus,
  CaptureResult,
  ConfigEntry,
  Session,
  SessionConfig
} from '@astrostreamer/shared'
import { get } from 'svelte/store'
import { connection, agentBaseUrl } from '$lib/stores/connection'

function headers(json = true): HeadersInit {
  const { apiKey } = get(connection)
  const h: Record<string, string> = {}
  if (json) h['Content-Type'] = 'application/json'
  if (apiKey) h['X-Api-Key'] = apiKey
  return h
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = get(agentBaseUrl)
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...headers(init?.method !== 'GET' && init?.body !== undefined),
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

export const agentApi = {
  status: () => request<CameraStatus>('/status'),

  getConfig: (key: string) => request<ConfigEntry>(`/config/${key}`),

  listConfig: () =>
    request<Record<string, { value: string; choices: string[] }>>('/config/list'),

  setConfig: (key: string, value: string) =>
    request<{ ok: boolean }>(`/config/${key}`, {
      method: 'POST',
      body: JSON.stringify({ value })
    }),

  capture: () =>
    request<CaptureResult>('/capture', {
      method: 'POST',
      body: '{}'
    }),

  timelapseStatus: () => request<Session | { status: 'idle' }>('/timelapse/status'),

  timelapseSessions: () => request<Session[]>('/timelapse/sessions'),

  timelapseStart: (config: SessionConfig) =>
    request<Session>('/timelapse/start', {
      method: 'POST',
      body: JSON.stringify(config)
    }),

  timelapseStop: () =>
    request<Session | { status: string }>('/timelapse/stop', {
      method: 'POST',
      body: '{}'
    }),

  timelapseAuto: (enabled: boolean) =>
    request<{ ok: boolean }>(
      enabled ? '/timelapse/auto/enable' : '/timelapse/auto/disable',
      { method: 'POST', body: '{}' }
    ),

  /** WHEP via agent proxy (CORS-safe) */
  whepUrl: (streamPath: string) => `${get(agentBaseUrl)}/whep/${streamPath}`,

  eventsUrl: () => `${get(agentBaseUrl)}/events`
}

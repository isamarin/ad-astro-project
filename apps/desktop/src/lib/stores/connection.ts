import { derived, writable } from 'svelte/store'
import {
  DEFAULT_CONNECTION,
  SIMULATOR_MANIFEST,
  type AdapterManifest,
  type CameraSource,
  type ConnectionSettings
} from '@astrostreamer/shared'

const STORAGE_KEY = 'astrostreamer.connection'

type StoredSettings = Partial<ConnectionSettings> & {
  mock?: boolean
  adapterId?: string
}

function migrate(raw: StoredSettings): ConnectionSettings {
  let source: CameraSource = raw.source ?? ''
  if (!source) {
    if (raw.adapterId === 'mock' || raw.mock === true) source = 'simulator'
    else if (raw.adapterId || (raw.mock === false && raw.host)) source = 'remote'
  }

  const manifest: AdapterManifest | null =
    source === 'simulator'
      ? SIMULATOR_MANIFEST
      : raw.manifest && raw.manifest.protocol
        ? raw.manifest
        : null

  return {
    source,
    host: raw.host ?? DEFAULT_CONNECTION.host,
    cameraPort: raw.cameraPort ?? DEFAULT_CONNECTION.cameraPort,
    webrtcPort: raw.webrtcPort ?? DEFAULT_CONNECTION.webrtcPort,
    apiKey: raw.apiKey ?? DEFAULT_CONNECTION.apiKey,
    timezoneOffset: raw.timezoneOffset ?? DEFAULT_CONNECTION.timezoneOffset,
    streamPath: raw.streamPath ?? manifest?.streamPath ?? DEFAULT_CONNECTION.streamPath,
    manifest
  }
}

function load(): ConnectionSettings {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_CONNECTION }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_CONNECTION }
    return migrate(JSON.parse(raw) as StoredSettings)
  } catch {
    return { ...DEFAULT_CONNECTION }
  }
}

function persist(value: ConnectionSettings) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

function createConnectionStore() {
  const { subscribe, set, update } = writable<ConnectionSettings>(load())

  return {
    subscribe,
    set(value: ConnectionSettings) {
      set(value)
      persist(value)
    },
    update(fn: (v: ConnectionSettings) => ConnectionSettings) {
      update((v) => {
        const next = fn(v)
        persist(next)
        return next
      })
    },
    patch(partial: Partial<ConnectionSettings>) {
      update((v) => {
        const next = { ...v, ...partial }
        persist(next)
        return next
      })
    }
  }
}

export const connection = createConnectionStore()

export const selectedAdapter = derived(connection, ($c) => {
  if ($c.source === 'simulator') return SIMULATOR_MANIFEST
  return $c.manifest
})

export const isSimulator = derived(connection, ($c) => $c.source === 'simulator')

export const needsAdapter = derived(connection, ($c) => !$c.source)

export const agentBaseUrl = derived(
  connection,
  ($c) => ($c.source === 'remote' ? `http://${$c.host}:${$c.cameraPort}` : '')
)

export const cameraCapabilities = derived(
  selectedAdapter,
  ($m) => $m?.capabilities
)

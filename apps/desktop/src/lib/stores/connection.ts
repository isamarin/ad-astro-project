import { derived, writable } from 'svelte/store'
import {
  DEFAULT_CONNECTION,
  type ConnectionSettings
} from '@astrostreamer/shared'

const STORAGE_KEY = 'astrostreamer.connection'

function load(): ConnectionSettings {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_CONNECTION }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_CONNECTION }
    return { ...DEFAULT_CONNECTION, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_CONNECTION }
  }
}

function createConnectionStore() {
  const { subscribe, set, update } = writable<ConnectionSettings>(load())

  return {
    subscribe,
    set(value: ConnectionSettings) {
      set(value)
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
      }
    },
    update(fn: (v: ConnectionSettings) => ConnectionSettings) {
      update((v) => {
        const next = fn(v)
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        }
        return next
      })
    },
    patch(partial: Partial<ConnectionSettings>) {
      update((v) => {
        const next = { ...v, ...partial }
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
        }
        return next
      })
    }
  }
}

export const connection = createConnectionStore()

export const agentBaseUrl = derived(
  connection,
  ($c) => `http://${$c.host}:${$c.cameraPort}`
)

export const webrtcBaseUrl = derived(
  connection,
  ($c) => `http://${$c.host}:${$c.webrtcPort}`
)

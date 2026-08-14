import { derived, writable, get } from 'svelte/store'
import type { EventEntry, EventKind } from '@astrostreamer/shared'
import { cameraFor } from '$lib/camera'
import { connection } from './connection'

const SEED_EVENTS: EventEntry[] = [
  {
    id: '1',
    time: '07:14:02',
    kind: 'system',
    message: 'Camera connected',
    detail: 'Simulator · no hardware'
  },
  {
    id: '2',
    time: '07:14:03',
    kind: 'system',
    message: 'Live view',
    detail: 'simulator has no stream'
  },
  {
    id: '3',
    time: '07:14:11',
    kind: 'setting',
    message: 'ISO set',
    detail: '400'
  },
  {
    id: '4',
    time: '07:14:22',
    kind: 'setting',
    message: 'White balance',
    detail: 'DAYLIGHT'
  }
]

export const events = writable<EventEntry[]>([])
export const sseConnected = writable(false)

export const filters = writable<Record<EventKind, boolean>>({
  setting: true,
  system: true,
  capture: true,
  detect: true,
  error: true,
  telemetry: true,
  timelapse: true
})

export const filteredEvents = derived([events, filters], ([$e, $f]) =>
  $e.filter((ev) => $f[ev.kind])
)

export function clearEvents() {
  events.set([])
}

export function addEvent(event: Omit<EventEntry, 'id'>) {
  events.update((list) => [{ ...event, id: String(Date.now()) }, ...list])
}

let eventSource: EventSource | null = null

export function connectSSE() {
  if (typeof window === 'undefined') return
  disconnectSSE()

  const adapter = cameraFor(get(connection))
  if (!adapter) {
    sseConnected.set(false)
    return
  }

  const url = adapter.eventsUrl()
  if (!url) {
    if (get(events).length === 0) events.set([...SEED_EVENTS])
    sseConnected.set(true)
    return
  }

  try {
    eventSource = new EventSource(url)
    eventSource.onopen = () => sseConnected.set(true)
    eventSource.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data)
        if (data.type === 'init' && Array.isArray(data.events)) {
          if (data.events.length > 0) events.set(data.events)
        } else if (data.type === 'event' && data.event) {
          events.update((list) => [data.event, ...list])
        }
      } catch {
        /* ignore */
      }
    }
    eventSource.onerror = () => {
      sseConnected.set(false)
    }
  } catch (err) {
    console.error('[events] SSE failed', err)
    sseConnected.set(false)
  }
}

export function disconnectSSE() {
  if (eventSource) {
    eventSource.close()
    eventSource = null
  }
  sseConnected.set(false)
}

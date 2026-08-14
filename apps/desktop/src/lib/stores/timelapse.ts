import { derived, writable, get } from 'svelte/store'
import type { Session, SessionConfig } from '@astrostreamer/shared'
import { cameraFor } from '$lib/camera'
import { connection } from './connection'

export const currentSession = writable<Session | null>(null)
export const sessions = writable<Session[]>([])
export const loading = writable(false)
export const autoEnabled = writable(false)

export const isActive = derived(currentSession, ($s) =>
  Boolean($s && ($s.status === 'capturing' || $s.status === 'preparing'))
)

export const isProcessing = derived(currentSession, ($s) => $s?.status === 'processing')

let pollTimer: ReturnType<typeof setInterval> | null = null

function adapter() {
  return cameraFor(get(connection))
}

async function fetchStatus() {
  const cam = adapter()
  if (!cam) return
  try {
    const data = await cam.timelapseStatus()
    if ('id' in data) currentSession.set(data)
  } catch {
    /* ignore */
  }
}

export async function fetchSessions() {
  const cam = adapter()
  if (!cam) return
  try {
    sessions.set(await cam.timelapseSessions())
  } catch {
    /* ignore */
  }
}

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(async () => {
    await fetchStatus()
    const s = get(currentSession)
    if (
      !s ||
      (s.status !== 'capturing' && s.status !== 'preparing' && s.status !== 'processing')
    ) {
      stopPolling()
      await fetchSessions()
    }
  }, 3000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

export async function startTimelapse(config: SessionConfig) {
  const cam = adapter()
  if (!cam) return
  loading.set(true)
  try {
    const session = await cam.startTimelapse(config)
    currentSession.set(session)
    if (cam.kind === 'remote') startPolling()
  } finally {
    loading.set(false)
  }
}

export async function stopTimelapse() {
  const cam = adapter()
  if (!cam) return
  loading.set(true)
  try {
    const session = await cam.stopTimelapse()
    if ('id' in session) currentSession.set(session)
  } finally {
    loading.set(false)
  }
}

export async function toggleAuto(enabled: boolean) {
  const cam = adapter()
  if (cam) await cam.setTimelapseAuto(enabled)
  autoEnabled.set(enabled)
}

export function initTimelapse() {
  fetchStatus().then(() => {
    const s = get(currentSession)
    if (s && (s.status === 'capturing' || s.status === 'preparing' || s.status === 'processing')) {
      startPolling()
    }
  })
  fetchSessions()
}

export function cleanupTimelapse() {
  stopPolling()
}

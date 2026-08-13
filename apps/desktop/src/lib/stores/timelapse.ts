import { derived, writable, get } from 'svelte/store'
import type { Session, SessionConfig } from '@astrostreamer/shared'
import { agentApi } from '$lib/api/agent'
import { connection } from './connection'

export const currentSession = writable<Session | null>(null)
export const sessions = writable<Session[]>([])
export const loading = writable(false)
export const autoEnabled = writable(false)

export const isActive = derived(currentSession, ($s) =>
  Boolean(
    $s && ($s.status === 'capturing' || $s.status === 'preparing')
  )
)

export const isProcessing = derived(
  currentSession,
  ($s) => $s?.status === 'processing'
)

let pollTimer: ReturnType<typeof setInterval> | null = null

async function fetchStatus() {
  if (get(connection).mock) return
  try {
    const data = await agentApi.timelapseStatus()
    if ('id' in data) currentSession.set(data)
  } catch {
    /* ignore */
  }
}

export async function fetchSessions() {
  if (get(connection).mock) return
  try {
    sessions.set(await agentApi.timelapseSessions())
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
      (s.status !== 'capturing' &&
        s.status !== 'preparing' &&
        s.status !== 'processing')
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
  loading.set(true)
  try {
    if (get(connection).mock) {
      currentSession.set({
        id: 'mock',
        config,
        status: 'capturing',
        startedAt: new Date().toISOString(),
        framesDir: '/tmp',
        framesCaptured: 0,
        failedFrames: 0
      })
      return
    }
    const session = await agentApi.timelapseStart(config)
    currentSession.set(session)
    startPolling()
  } finally {
    loading.set(false)
  }
}

export async function stopTimelapse() {
  loading.set(true)
  try {
    if (get(connection).mock) {
      currentSession.update((s) =>
        s ? { ...s, status: 'stopped', stoppedAt: new Date().toISOString() } : s
      )
      return
    }
    const session = await agentApi.timelapseStop()
    if ('id' in session) currentSession.set(session)
  } finally {
    loading.set(false)
  }
}

export async function toggleAuto(enabled: boolean) {
  if (!get(connection).mock) {
    await agentApi.timelapseAuto(enabled)
  }
  autoEnabled.set(enabled)
}

export function initTimelapse() {
  fetchStatus().then(() => {
    const s = get(currentSession)
    if (
      s &&
      (s.status === 'capturing' ||
        s.status === 'preparing' ||
        s.status === 'processing')
    ) {
      startPolling()
    }
  })
  fetchSessions()
}

export function cleanupTimelapse() {
  stopPolling()
}

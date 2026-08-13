import { writable, get } from 'svelte/store'
import { agentApi } from '$lib/api/agent'
import { connection } from './connection'
import {
  ISO_SCALE,
  SHUTTER_MAN,
  SHUTTER_AST,
  WB_PRESETS
} from '@astrostreamer/shared'

export { ISO_SCALE, SHUTTER_MAN, SHUTTER_AST, WB_PRESETS }

export interface CameraState {
  iso: string
  shutter: string
  aperture: string
  focus: number
  wb: string
}

export interface CameraInfo {
  model: string
  lens: string
  connected: boolean
  streaming: boolean
}

const FIELD_TO_CONFIG: Record<string, string> = {
  iso: 'iso',
  shutter: 'shutterspeed',
  wb: 'whitebalance'
}

export const cameraState = writable<CameraState>({
  iso: '400',
  shutter: '1/125',
  aperture: '2.0',
  focus: 62,
  wb: 'DAYLIGHT'
})

export const cameraInfo = writable<CameraInfo>({
  model: 'EOS',
  lens: 'Гелиос 44МС 58mm',
  connected: false,
  streaming: false
})

export async function initCameraFromAgent() {
  if (get(connection).mock) {
    cameraInfo.set({
      model: 'EOS 600D (mock)',
      lens: 'Гелиос 44МС 58mm',
      connected: true,
      streaming: false
    })
    return
  }

  try {
    const status = await agentApi.status()
    cameraInfo.set({
      model: status.model || 'Camera',
      lens: status.lens || 'Гелиос 44МС 58mm',
      connected: status.connected,
      streaming: status.streaming
    })
  } catch {
    cameraInfo.update((c) => ({ ...c, connected: false, streaming: false }))
  }

  const keys = ['iso', 'shutterspeed', 'whitebalance'] as const
  const fieldMap: Record<string, keyof CameraState> = {
    iso: 'iso',
    shutterspeed: 'shutter',
    whitebalance: 'wb'
  }
  for (const key of keys) {
    try {
      const result = await agentApi.getConfig(key)
      const val = result.value
      if (val !== undefined) {
        cameraState.update((s) => ({ ...s, [fieldMap[key]]: String(val) }))
      }
    } catch {
      /* keep defaults */
    }
  }
}

export async function setCamPatch(patch: Partial<CameraState>) {
  cameraState.update((s) => ({ ...s, ...patch }))
  if (get(connection).mock) return

  for (const [field, value] of Object.entries(patch)) {
    const configKey = FIELD_TO_CONFIG[field]
    if (!configKey) continue
    try {
      await agentApi.setConfig(configKey, String(value))
    } catch (err) {
      console.error(`Failed to set ${configKey}=${value}:`, err)
    }
  }
}

export async function captureFrame() {
  if (get(connection).mock) {
    return { ok: true, filename: 'MOCK.JPG', size: '0', format: 'JPEG', path: '' }
  }
  return agentApi.capture()
}

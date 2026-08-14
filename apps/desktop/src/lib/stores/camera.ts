import { writable, get } from 'svelte/store'
import {
  CAMERA_CONFIG,
  ISO_SCALE,
  SHUTTER_MAN,
  SHUTTER_AST,
  WB_PRESETS,
  type Camera
} from '@astrostreamer/shared'
import { cameraFor } from '$lib/camera'
import { connection } from './connection'

export { ISO_SCALE, SHUTTER_MAN, SHUTTER_AST, WB_PRESETS }

export interface CameraState {
  iso: string
  shutter: string
  aperture: string
  focus: number
  wb: string
}

export interface CameraInfo extends Camera {
  adapterId: string
}

const FIELD_TO_CONFIG: Record<string, string> = {
  iso: CAMERA_CONFIG.iso,
  shutter: CAMERA_CONFIG.shutter,
  wb: CAMERA_CONFIG.whitebalance,
  aperture: CAMERA_CONFIG.aperture,
  focus: CAMERA_CONFIG.focus
}

export const cameraState = writable<CameraState>({
  iso: '400',
  shutter: '1/125',
  aperture: '2.0',
  focus: 62,
  wb: 'DAYLIGHT'
})

export const cameraInfo = writable<CameraInfo>({
  model: 'Camera',
  lens: '',
  serial: '',
  connected: false,
  streaming: false,
  adapterId: ''
})

export async function initCameraFromAgent() {
  const settings = get(connection)
  const adapter = cameraFor(settings)
  if (!adapter) {
    cameraInfo.set({
      model: 'Camera',
      lens: '',
      serial: '',
      connected: false,
      streaming: false,
      adapterId: ''
    })
    return
  }

  try {
    const status = await adapter.status()
    cameraInfo.set({
      model: status.model || 'Camera',
      lens: status.lens || '',
      serial: status.serial || '',
      connected: status.connected,
      streaming: status.streaming,
      adapterId: status.adapter || settings.manifest?.id || settings.source
    })
  } catch {
    cameraInfo.update((c) => ({
      ...c,
      connected: false,
      streaming: false,
      adapterId: settings.manifest?.id || settings.source
    }))
    return
  }

  if (!settings.manifest && settings.source === 'remote') {
    try {
      const manifest = await adapter.manifest()
      connection.patch({ manifest, streamPath: manifest.streamPath })
    } catch {
      /* handshake later */
    }
  }

  const fieldMap: Record<string, keyof CameraState> = {
    [CAMERA_CONFIG.iso]: 'iso',
    [CAMERA_CONFIG.shutter]: 'shutter',
    [CAMERA_CONFIG.whitebalance]: 'wb'
  }
  for (const key of Object.keys(fieldMap)) {
    try {
      const result = await adapter.getConfig(key)
      if (result.value !== undefined) {
        cameraState.update((s) => ({ ...s, [fieldMap[key]]: String(result.value) }))
      }
    } catch {
      /* keep defaults */
    }
  }
}

export async function setCamPatch(patch: Partial<CameraState>) {
  cameraState.update((s) => ({ ...s, ...patch }))
  const adapter = cameraFor(get(connection))
  if (!adapter) return

  for (const [field, value] of Object.entries(patch)) {
    const configKey = FIELD_TO_CONFIG[field]
    if (!configKey) continue
    try {
      await adapter.setConfig(configKey, String(value))
    } catch (err) {
      console.error(`Failed to set ${configKey}=${value}:`, err)
    }
  }
}

export async function captureFrame() {
  const adapter = cameraFor(get(connection))
  if (!adapter) {
    return { ok: false, filename: '', size: '0', format: '', path: '' }
  }
  return adapter.capture()
}

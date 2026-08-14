import {
  type CameraAdapter,
  type ConnectionSettings
} from '@astrostreamer/shared'
import { simulatorAdapter } from './simulator'
import { remoteFromSettings } from './remote'

export { simulatorAdapter } from './simulator'
export { probeRemoteAdapter, RemoteCameraAdapter } from './remote'

/** The camera the UI should talk to, or `null` until the user picks a source. */
export function cameraFor(settings: ConnectionSettings): CameraAdapter | null {
  if (settings.source === 'simulator') return simulatorAdapter
  if (settings.source === 'remote') return remoteFromSettings(settings)
  return null
}

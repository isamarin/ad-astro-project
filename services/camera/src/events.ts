import type { CameraEvent } from './types.js'
import { eventBus } from './eventBus.js'

/** Publish event to in-process bus (SSE clients + history). */
export async function pushEvent(event: CameraEvent): Promise<void> {
  eventBus.publish(event)
}

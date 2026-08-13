import { EventEmitter } from 'node:events'
import type { CameraEvent } from './types.js'

export interface StoredEvent extends CameraEvent {
  id: string
  time: string
}

const MAX_HISTORY = 200

class EventBus extends EventEmitter {
  private history: StoredEvent[] = []
  private seq = 0

  publish(event: CameraEvent): StoredEvent {
    const now = new Date()
    const stored: StoredEvent = {
      ...event,
      id: `${Date.now()}-${++this.seq}`,
      time: now.toTimeString().slice(0, 8)
    }
    this.history.unshift(stored)
    if (this.history.length > MAX_HISTORY) {
      this.history.length = MAX_HISTORY
    }
    this.emit('event', stored)
    return stored
  }

  getHistory(): StoredEvent[] {
    return [...this.history]
  }
}

export const eventBus = new EventBus()

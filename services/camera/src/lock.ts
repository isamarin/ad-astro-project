import { StreamManager } from './stream.js'
import { waitForUsb } from './gphoto.js'

interface QueuedOp {
  execute: () => Promise<any>
  requiresExclusive: boolean
  resolve: (value: any) => void
  reject: (reason: any) => void
}

const RESTART_DELAY_MS = 1000

export class CameraLock {
  private queue: QueuedOp[] = []
  private processing = false

  constructor(private stream: StreamManager) {}

  execute<T>(op: () => Promise<T>, requiresExclusive: boolean): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ execute: op, requiresExclusive, resolve, reject })
      this.processQueue()
    })
  }

  private async processQueue() {
    if (this.processing) return
    this.processing = true

    while (this.queue.length > 0) {
      const op = this.queue.shift()!

      if (!op.requiresExclusive || !this.stream.running) {
        // Non-exclusive op or stream not running — just execute
        try {
          const result = await op.execute()
          op.resolve(result)
        } catch (err) {
          op.reject(err)
        }
        continue
      }

      // Exclusive op: stop stream, wait for USB, batch all pending exclusive ops, then restart
      try {
        await this.stream.stop()
      } catch (err) {
        op.reject(err)
        continue
      }

      // Wait for USB to become available (up to 15s)
      const usbReady = await waitForUsb(15_000)
      if (!usbReady) {
        console.error('[lock] USB not available, rejecting queued operations')
        op.reject(new Error('USB device not available'))
        // Reject all batched exclusive ops too
        while (this.queue.length > 0 && this.queue[0].requiresExclusive) {
          this.queue.shift()!.reject(new Error('USB device not available'))
        }
        // Try to restart stream anyway
        try {
          await delay(RESTART_DELAY_MS)
          await this.stream.start()
        } catch (streamErr) {
          console.error('[lock] Failed to restart stream:', streamErr)
        }
        continue
      }

      // Execute this op
      try {
        const result = await op.execute()
        op.resolve(result)
      } catch (err) {
        op.reject(err)
      }

      // Drain any other exclusive ops while stream is stopped
      while (this.queue.length > 0 && this.queue[0].requiresExclusive) {
        const next = this.queue.shift()!
        try {
          await delay(100) // small gap between gphoto2 calls
          const result = await next.execute()
          next.resolve(result)
        } catch (err) {
          next.reject(err)
        }
      }

      // Restart stream
      try {
        await delay(RESTART_DELAY_MS)
        await this.stream.start()
      } catch (streamErr) {
        console.error('[lock] Failed to restart stream:', streamErr)
      }
    }

    this.processing = false
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

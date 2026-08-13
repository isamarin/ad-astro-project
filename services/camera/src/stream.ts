import { spawn, type ChildProcess } from 'node:child_process'
import { MEDIAMTX_RTSP_URL } from './config.js'
import { pushEvent } from './events.js'

const AUTO_RESTART_DELAY_MS = 3000

export class StreamManager {
  private gphotoProc: ChildProcess | null = null
  private ffmpegProc: ChildProcess | null = null
  private _running = false
  private _stopping = false
  private _held = false
  private restartTimer: ReturnType<typeof setTimeout> | null = null

  get running(): boolean {
    return this._running
  }

  async start(): Promise<void> {
    if (this._running) return

    // Kill any leftover processes from a failed previous start
    await this.cleanup()

    console.log('[stream] Starting gphoto2 → ffmpeg → RTSP pipeline')

    this.gphotoProc = spawn('gphoto2', ['--capture-movie', '--stdout'], {
      stdio: ['ignore', 'pipe', 'pipe']
    })

    this.ffmpegProc = spawn('ffmpeg', [
      '-i', '-',
      '-vf', 'format=yuv420p',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-f', 'rtsp',
      MEDIAMTX_RTSP_URL
    ], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    // Suppress EPIPE errors on pipe streams (expected during stop)
    const ignoreEpipe = (err: Error & { code?: string }) => {
      if (err.code === 'EPIPE' || err.code === 'ERR_STREAM_DESTROYED') return
      console.error('[stream] pipe error:', err.message)
    }
    this.gphotoProc.stdout!.on('error', ignoreEpipe)
    this.ffmpegProc.stdin!.on('error', ignoreEpipe)
    this.ffmpegProc.stdout!.on('error', ignoreEpipe)

    // Pipe gphoto2 stdout → ffmpeg stdin
    this.gphotoProc.stdout!.pipe(this.ffmpegProc.stdin!)

    this.gphotoProc.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim()
      if (msg) console.log('[gphoto2]', msg)
    })

    this.ffmpegProc.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim()
      if (msg && !msg.startsWith('frame=')) console.log('[ffmpeg]', msg)
    })

    // Wait for gphoto2 to start producing data or fail
    const started = await new Promise<boolean>((resolve) => {
      let resolved = false
      const done = (ok: boolean) => {
        if (resolved) return
        resolved = true
        resolve(ok)
      }

      // gphoto2 sends MJPEG data on stdout — first data means it's working
      this.gphotoProc!.stdout!.once('data', () => done(true))

      // If gphoto2 exits before sending any data, it failed to start
      this.gphotoProc!.once('exit', (code) => {
        if (!resolved) {
          console.log(`[stream] gphoto2 failed to start (exit code ${code})`)
        }
        done(false)
      })

      // Timeout: if neither data nor exit after 10s, assume failure
      setTimeout(() => done(false), 10_000)
    })

    if (!started) {
      console.error('[stream] Failed to start gphoto2, cleaning up')
      await this.cleanup()
      return
    }

    // Auto-restart on unexpected exit (not triggered during intentional stop)
    this.gphotoProc.on('exit', (code) => {
      if (this._stopping) return
      console.log(`[stream] gphoto2 exited unexpectedly (code ${code}), will auto-restart`)
      this._running = false
      this.scheduleRestart()
    })

    this.ffmpegProc.on('exit', (code) => {
      if (this._stopping) return
      console.log(`[stream] ffmpeg exited unexpectedly (code ${code})`)
      this._running = false
    })

    this._running = true

    await pushEvent({
      kind: 'system',
      message: 'RTSP stream started',
      detail: `${MEDIAMTX_RTSP_URL} · 1056×704 25fps`
    })
  }

  async stop(): Promise<void> {
    this._stopping = true
    this.cancelRestart()
    console.log('[stream] Stopping pipeline')
    await this.cleanup()
    this._running = false
    this._stopping = false
  }

  /** Prevent auto-restart (used during timelapse sessions) */
  hold() {
    this._held = true
    this.cancelRestart()
    console.log('[stream] Hold: auto-restart disabled')
  }

  /** Allow auto-restart again */
  release() {
    this._held = false
    console.log('[stream] Release: auto-restart enabled')
  }

  get held(): boolean {
    return this._held
  }

  private scheduleRestart() {
    if (this._held) {
      console.log('[stream] Auto-restart skipped (held)')
      return
    }
    this.cancelRestart()
    console.log(`[stream] Auto-restart in ${AUTO_RESTART_DELAY_MS}ms`)
    this.restartTimer = setTimeout(async () => {
      this.restartTimer = null
      try {
        await this.cleanup()
        await this.start()
        if (this._running) {
          console.log('[stream] Auto-restart successful')
        } else {
          console.error('[stream] Auto-restart failed, retrying...')
          this.scheduleRestart()
        }
      } catch (err) {
        console.error('[stream] Auto-restart error:', err)
        this.scheduleRestart()
      }
    }, AUTO_RESTART_DELAY_MS)
  }

  private cancelRestart() {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
    }
  }

  /** Kill gphoto2 and ffmpeg processes, wait for exit */
  private async cleanup(): Promise<void> {
    // Unpipe before killing to prevent EPIPE
    if (this.gphotoProc?.stdout && this.ffmpegProc?.stdin) {
      this.gphotoProc.stdout.unpipe(this.ffmpegProc.stdin)
      try { this.ffmpegProc.stdin.end() } catch { /* ignore */ }
    }

    const procs = [this.gphotoProc, this.ffmpegProc].filter(Boolean) as ChildProcess[]

    if (procs.length === 0) return

    // SIGTERM first
    for (const proc of procs) {
      if (!proc.killed) {
        try { proc.kill('SIGTERM') } catch { /* ignore */ }
      }
    }

    // Wait for graceful exit, then SIGKILL
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        for (const proc of procs) {
          if (!proc.killed) {
            try { proc.kill('SIGKILL') } catch { /* ignore */ }
          }
        }
        resolve()
      }, 2000)

      let exited = 0
      const check = () => {
        if (++exited >= procs.length) {
          clearTimeout(timeout)
          resolve()
        }
      }

      for (const proc of procs) {
        proc.on('exit', check)
      }
    })

    this.gphotoProc = null
    this.ffmpegProc = null
  }
}

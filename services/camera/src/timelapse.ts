import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import type { Session, SessionConfig, SessionStatus } from './types.js'
import { CAPTURE_DIR } from './config.js'
import { pushEvent } from './events.js'
import * as gphoto from './gphoto.js'
import { assembleTimelapse, stackStarTrails, cleanupFrames } from './processing.js'
import { sendSessionComplete } from './email.js'
import type { StreamManager } from './stream.js'

const exec = promisify(execFile)

const SESSIONS_FILE = path.join(CAPTURE_DIR, 'sessions.json')
const MAX_SAVED_SESSIONS = 50
const FRAME_SIZE_ESTIMATE_MB = 7
const DISK_BUFFER_MB = 500

let currentSession: Session | null = null
let stopRequested = false
let stream: StreamManager | null = null

export function initTimelapse(streamManager: StreamManager) {
  stream = streamManager
}

export function getSession(): Session | null {
  return currentSession
}

export function isActive(): boolean {
  return currentSession !== null && (currentSession.status === 'capturing' || currentSession.status === 'preparing')
}

/** Parse shutter speed string to milliseconds */
function shutterToMs(shutter: string): number {
  if (shutter.toLowerCase() === 'bulb') return 0
  // "20" or '20"' → 20 seconds
  const cleanShutter = shutter.replace(/"/g, '')
  if (cleanShutter.includes('/')) {
    const [num, den] = cleanShutter.split('/')
    return (parseInt(num) / parseInt(den)) * 1000
  }
  return parseFloat(cleanShutter) * 1000
}

/** Check available disk space in MB */
async function getFreeDiskMb(dir: string): Promise<number> {
  try {
    const { stdout } = await exec('df', ['-m', dir])
    const lines = stdout.trim().split('\n')
    if (lines.length >= 2) {
      const parts = lines[1].split(/\s+/)
      return parseInt(parts[3]) || 0
    }
  } catch { /* ignore */ }
  return Infinity // Can't check — don't block
}

function generateSessionId(type: string): string {
  const now = new Date()
  const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 15).replace('.', '')
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `${dateStr}_${type}`
}

function getFramesDir(sessionId: string, type: string): string {
  const subdir = type === 'startrails' ? 'startrails' : 'timelapse'
  return path.join(CAPTURE_DIR, subdir, sessionId)
}

function getArchiveDir(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return path.join(CAPTURE_DIR, 'archive', String(year), month)
}

export async function startSession(config: SessionConfig): Promise<Session> {
  if (isActive()) {
    throw new Error('Session already active')
  }

  if (!stream) {
    throw new Error('Timelapse not initialized')
  }

  const sessionId = generateSessionId(config.type)
  const framesDir = getFramesDir(sessionId, config.type)
  await mkdir(framesDir, { recursive: true })

  // Pre-flight disk check
  if (config.maxFrames > 0) {
    const freeMb = await getFreeDiskMb(CAPTURE_DIR)
    const requiredMb = config.maxFrames * FRAME_SIZE_ESTIMATE_MB + DISK_BUFFER_MB
    if (freeMb < requiredMb) {
      throw new Error(`Insufficient disk space: ${freeMb}MB free, need ~${requiredMb}MB`)
    }
  }

  currentSession = {
    id: sessionId,
    config,
    status: 'preparing',
    startedAt: new Date().toISOString(),
    framesDir,
    framesCaptured: 0,
    failedFrames: 0
  }

  stopRequested = false

  await pushEvent({
    kind: 'timelapse',
    message: 'Session starting',
    detail: `${config.type} · ${config.maxFrames || '∞'} frames · interval ${config.interval}s`
  })

  // Run the session in the background
  runSession(config).catch(err => {
    console.error('[timelapse] Session error:', err)
    if (currentSession) {
      currentSession.status = 'error'
      currentSession.error = err.message
    }
  })

  return currentSession
}

async function runSession(config: SessionConfig): Promise<void> {
  if (!stream || !currentSession) return

  try {
    // Stop stream and hold to prevent auto-restart
    if (stream.running) {
      await stream.stop()
    }
    stream.hold()

    // Wait for USB
    const usbReady = await gphoto.waitForUsb(15_000)
    if (!usbReady) {
      throw new Error('USB device not available')
    }

    // Switch to JPEG
    await gphoto.setImageFormat('jpeg')

    // Apply preset
    await gphoto.setConfig('autoexposuremode', 'Manual')
    if (config.preset.iso) await gphoto.setConfig('iso', config.preset.iso)
    if (config.preset.shutter) await gphoto.setConfig('shutterspeed', config.preset.shutter)
    if (config.preset.wb) await gphoto.setConfig('whitebalance', config.preset.wb)

    await pushEvent({
      kind: 'timelapse',
      message: 'Session started',
      detail: `ISO ${config.preset.iso} · ${config.preset.shutter} · WB ${config.preset.wb}`
    })

    currentSession.status = 'capturing'
    await persistSession()

    // Capture loop
    const shutterMs = shutterToMs(config.preset.shutter)

    while (config.maxFrames === 0 || currentSession.framesCaptured < config.maxFrames) {
      if (stopRequested) break

      const frameNum = String(currentSession.framesCaptured + 1).padStart(5, '0')
      const framePath = path.join(currentSession.framesDir, `frame_${frameNum}.jpg`)

      try {
        await gphoto.captureToFile(framePath, shutterMs)
        currentSession.framesCaptured++

        await pushEvent({
          kind: 'timelapse',
          message: `Frame ${currentSession.framesCaptured}`,
          detail: config.maxFrames > 0
            ? `${currentSession.framesCaptured}/${config.maxFrames}`
            : `${currentSession.framesCaptured} captured`
        })
      } catch (err: any) {
        currentSession.failedFrames++
        console.error(`[timelapse] Frame ${frameNum} failed:`, err.message)

        await pushEvent({
          kind: 'error',
          message: 'Frame capture failed',
          detail: `Frame ${frameNum}: ${err.message}`
        })

        // Don't abort the whole session for a single frame failure
      }

      await persistSession()

      // Buffer delay between captures
      if (!stopRequested && (config.maxFrames === 0 || currentSession.framesCaptured < config.maxFrames)) {
        await delay(config.bufferSeconds * 1000)
      }
    }

    // Post-capture processing
    currentSession.status = 'processing'
    await persistSession()

    if (currentSession.framesCaptured > 0) {
      const archiveDir = getArchiveDir()
      await mkdir(archiveDir, { recursive: true })

      if (config.type === 'startrails') {
        const outputPath = path.join(archiveDir, `startrails_${currentSession.id}.jpg`)
        await stackStarTrails(currentSession.framesDir, outputPath)
        currentSession.outputPath = outputPath
      } else {
        const outputPath = path.join(archiveDir, `timelapse_${currentSession.id}.mp4`)
        await assembleTimelapse(currentSession.framesDir, outputPath)
        currentSession.outputPath = outputPath
      }

      await pushEvent({
        kind: 'timelapse',
        message: 'Processing complete',
        detail: currentSession.outputPath
      })

      // Clean up raw frames after successful output
      if (currentSession.outputPath) {
        try {
          await stat(currentSession.outputPath)
          await cleanupFrames(currentSession.framesDir)
        } catch {
          console.warn('[timelapse] Output file not found, keeping raw frames')
        }
      }

      // Send email notification
      try {
        await sendSessionComplete(currentSession)
      } catch (err) {
        console.error('[timelapse] Email notification failed:', err)
      }
    }

    currentSession.status = stopRequested ? 'stopped' : 'complete'
    currentSession.stoppedAt = new Date().toISOString()
  } catch (err: any) {
    if (currentSession) {
      currentSession.status = 'error'
      currentSession.error = err.message
      currentSession.stoppedAt = new Date().toISOString()
    }

    await pushEvent({
      kind: 'error',
      message: 'Session failed',
      detail: err.message
    })
  } finally {
    await persistSession()

    // Restore stream
    if (stream) {
      stream.release()
      try {
        await stream.start()
      } catch (err) {
        console.error('[timelapse] Failed to restart stream:', err)
      }
    }
  }
}

export async function stopSession(): Promise<Session | null> {
  if (!currentSession || !isActive()) {
    return currentSession
  }

  stopRequested = true

  await pushEvent({
    kind: 'timelapse',
    message: 'Stop requested',
    detail: `After ${currentSession.framesCaptured} frames`
  })

  // Wait for the capture loop to break (up to 60s for long exposures)
  const maxWait = 60_000
  const start = Date.now()
  while (isActive() && Date.now() - start < maxWait) {
    await delay(500)
  }

  return currentSession
}

// --- Session persistence ---

async function persistSession(): Promise<void> {
  if (!currentSession) return
  const sessions = await loadSessions()
  const idx = sessions.findIndex(s => s.id === currentSession!.id)
  if (idx >= 0) {
    sessions[idx] = currentSession
  } else {
    sessions.unshift(currentSession)
  }
  // Keep only last N sessions
  if (sessions.length > MAX_SAVED_SESSIONS) {
    sessions.length = MAX_SAVED_SESSIONS
  }
  try {
    await writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2))
  } catch (err) {
    console.error('[timelapse] Failed to persist session:', err)
  }
}

export async function loadSessions(): Promise<Session[]> {
  try {
    const data = await readFile(SESSIONS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

/** Mark any interrupted sessions (preparing/capturing) as error on startup */
export async function recoverSessions(): Promise<void> {
  const sessions = await loadSessions()
  let changed = false
  for (const s of sessions) {
    if (s.status === 'preparing' || s.status === 'capturing' || s.status === 'processing') {
      s.status = 'error'
      s.error = 'Interrupted (service restart)'
      s.stoppedAt = new Date().toISOString()
      changed = true
    }
  }
  if (changed) {
    await writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2))
    console.log('[timelapse] Recovered interrupted sessions')
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

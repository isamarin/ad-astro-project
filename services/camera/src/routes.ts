import type { IncomingMessage, ServerResponse } from 'node:http'
import { CameraLock } from './lock.js'
import { StreamManager } from './stream.js'
import { pushEvent } from './events.js'
import { eventBus } from './eventBus.js'
import * as gphoto from './gphoto.js'
import type { CameraStatus, SessionConfig } from './types.js'
import * as timelapse from './timelapse.js'
import { AutoTimelapse } from './scheduler.js'
import { sendTestEmail } from './email.js'
import { INTERNAL_API_KEY, MEDIAMTX_WEBRTC_URL } from './config.js'

export const stream = new StreamManager()
export const lock = new CameraLock(stream)
export const autoTimelapse = new AutoTimelapse()

let detectedCamera: { model: string; port: string } | null = null
const configCache = new Map<string, { value: string; choices: string[] }>()

function json(res: ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function error(res: ServerResponse, status: number, message: string) {
  json(res, { error: message }, status)
}

async function readBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()))
      } catch {
        resolve({})
      }
    })
    req.on('error', reject)
  })
}

async function readRawBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function checkApiKey(req: IncomingMessage, res: ServerResponse): boolean {
  if (!INTERNAL_API_KEY) return true
  const key =
    req.headers['x-api-key'] ||
    (typeof req.headers.authorization === 'string' &&
    req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : '')
  if (key !== INTERNAL_API_KEY) {
    error(res, 401, 'Invalid or missing API key')
    return false
  }
  return true
}

function handleSse(req: IncomingMessage, res: ServerResponse) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  })

  const history = eventBus.getHistory()
  res.write(`data: ${JSON.stringify({ type: 'init', events: history })}\n\n`)

  const onEvent = (ev: unknown) => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'event', event: ev })}\n\n`)
    } catch {
      /* closed */
    }
  }
  eventBus.on('event', onEvent)

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n')
    } catch {
      clearInterval(heartbeat)
    }
  }, 30_000)

  req.on('close', () => {
    eventBus.off('event', onEvent)
    clearInterval(heartbeat)
  })
}

/** Pre-load config cache for common keys (called before stream starts) */
async function populateConfigCache() {
  const keys = ['iso', 'shutterspeed', 'whitebalance', 'autoexposuremode']
  for (const key of keys) {
    try {
      const entry = await gphoto.getConfig(key)
      configCache.set(key, entry)
      console.log(`[init] Cached ${key}: ${entry.value}`)
    } catch (err) {
      console.warn(`[init] Failed to cache ${key}:`, err)
    }
  }
}

export async function handleRequest(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || '/', `http://localhost`)
  const path = url.pathname
  const method = req.method || 'GET'

  // CORS headers (Tauri WebView + LAN clients)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Api-Key, Authorization'
  )

  if (method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  // Mutating routes require API key when configured
  if (method !== 'GET' && method !== 'HEAD' && !checkApiKey(req, res)) {
    return
  }

  try {
    // GET /events — SSE stream for Tauri orchestrator
    if (method === 'GET' && path === '/events') {
      handleSse(req, res)
      return
    }

    // POST /whep/:path — proxy SDP offer to MediaMTX (avoids CORS from WebView)
    const whepMatch = path.match(/^\/whep\/([a-zA-Z0-9_-]+)$/)
    if (method === 'POST' && whepMatch) {
      const streamPath = whepMatch[1]
      const sdp = await readRawBody(req)
      const targetUrl = `${MEDIAMTX_WEBRTC_URL.replace(/\/$/, '')}/${streamPath}/whep`
      try {
        const upstream = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/sdp' },
          body: new Uint8Array(sdp)
        })
        const answer = await upstream.text()
        res.writeHead(upstream.status, {
          'Content-Type': 'application/sdp',
          'Access-Control-Allow-Origin': '*'
        })
        res.end(answer)
      } catch (err: any) {
        console.error(`[whep] ${targetUrl}:`, err?.message || err)
        error(res, 502, `MediaMTX unreachable for stream "${streamPath}"`)
      }
      return
    }

    // GET /status
    if (method === 'GET' && path === '/status') {
      if (!detectedCamera) {
        detectedCamera = await gphoto.autoDetect()
      }
      const status: CameraStatus = {
        connected: !!detectedCamera,
        model: detectedCamera?.model || 'Not connected',
        lens: 'Helios 44-2 MC 58mm f/2.0',
        serial: '',
        port: detectedCamera?.port || '',
        streaming: stream.running
      }
      json(res, status)
      return
    }

    // GET /config/list
    if (method === 'GET' && path === '/config/list') {
      // Return cached values if available
      if (configCache.size > 0) {
        const result: Record<string, { value: string; choices: string[] }> = {}
        for (const [key, entry] of configCache) {
          result[key] = entry
        }
        json(res, result)
        return
      }
      // Fallback: fetch from camera (stops stream)
      const entries = await lock.execute(() => gphoto.listConfig(), true)
      const result: Record<string, { value: string; choices: string[] }> = {}
      for (const e of entries) {
        result[e.key] = { value: e.value, choices: e.choices }
        configCache.set(e.key, { value: e.value, choices: e.choices })
      }
      json(res, result)
      return
    }

    // GET /config/:key — serve from cache, no stream interruption
    const configMatch = path.match(/^\/config\/([a-zA-Z0-9_]+)$/)
    if (method === 'GET' && configMatch) {
      const key = configMatch[1]
      const cached = configCache.get(key)
      if (cached) {
        json(res, cached)
        return
      }
      // Cache miss: fetch from camera (stops stream)
      const entry = await lock.execute(() => gphoto.getConfig(key), true)
      configCache.set(key, entry)
      json(res, entry)
      return
    }

    // POST /config/:key  { value } — update camera + cache
    if (method === 'POST' && configMatch) {
      const key = configMatch[1]
      const body = await readBody(req)
      if (!body.value) {
        error(res, 400, 'value is required')
        return
      }
      await lock.execute(() => gphoto.setConfig(key, body.value), true)

      // Update cache with new value
      const cached = configCache.get(key)
      if (cached) {
        cached.value = body.value
      } else {
        configCache.set(key, { value: body.value, choices: [] })
      }

      await pushEvent({
        kind: 'setting',
        message: `${key} set`,
        detail: body.value
      })

      json(res, { ok: true })
      return
    }

    // POST /capture
    if (method === 'POST' && path === '/capture') {
      const result = await lock.execute(() => gphoto.captureImage(), true)

      await pushEvent({
        kind: 'capture',
        message: 'Frame captured',
        detail: `${result.filename} · ${result.format} · ${result.size}`
      })

      json(res, result)
      return
    }

    // POST /stream/start
    if (method === 'POST' && path === '/stream/start') {
      await stream.start()
      json(res, { ok: true, streaming: true })
      return
    }

    // POST /stream/stop
    if (method === 'POST' && path === '/stream/stop') {
      await stream.stop()
      json(res, { ok: true, streaming: false })
      return
    }

    // --- Timelapse routes ---

    // POST /timelapse/start
    if (method === 'POST' && path === '/timelapse/start') {
      const body = await readBody(req) as SessionConfig
      if (!body.type || !body.preset) {
        error(res, 400, 'type and preset are required')
        return
      }
      const config: SessionConfig = {
        type: body.type,
        preset: body.preset,
        interval: body.interval ?? 0,
        maxFrames: body.maxFrames ?? 0,
        bufferSeconds: body.bufferSeconds ?? 5
      }
      const session = await timelapse.startSession(config)
      json(res, session)
      return
    }

    // POST /timelapse/stop
    if (method === 'POST' && path === '/timelapse/stop') {
      const session = await timelapse.stopSession()
      json(res, session || { status: 'idle' })
      return
    }

    // GET /timelapse/status
    if (method === 'GET' && path === '/timelapse/status') {
      const session = timelapse.getSession()
      json(res, session || { status: 'idle' })
      return
    }

    // GET /timelapse/sessions
    if (method === 'GET' && path === '/timelapse/sessions') {
      const sessions = await timelapse.loadSessions()
      json(res, sessions)
      return
    }

    // POST /timelapse/auto/enable
    if (method === 'POST' && path === '/timelapse/auto/enable') {
      autoTimelapse.start()
      json(res, { ok: true, autoEnabled: true })
      return
    }

    // POST /timelapse/auto/disable
    if (method === 'POST' && path === '/timelapse/auto/disable') {
      autoTimelapse.stop()
      json(res, { ok: true, autoEnabled: false })
      return
    }

    // POST /timelapse/email/test
    if (method === 'POST' && path === '/timelapse/email/test') {
      const result = await sendTestEmail()
      json(res, result)
      return
    }

    // 404
    error(res, 404, `Not found: ${method} ${path}`)
  } catch (err: any) {
    console.error(`[routes] ${method} ${path} error:`, err)
    error(res, 500, err.message || 'Internal error')
  }
}

// Auto-detect camera and start stream on boot
export async function init() {
  console.log('[init] Detecting camera...')
  detectedCamera = await gphoto.autoDetect()

  if (detectedCamera) {
    console.log(`[init] Found: ${detectedCamera.model} at ${detectedCamera.port}`)

    await pushEvent({
      kind: 'system',
      message: 'Camera connected',
      detail: `${detectedCamera.model} · USB · ${detectedCamera.port}`
    })

    // Ensure camera is in Manual mode and LiveView is active
    console.log('[init] Preparing camera for streaming...')
    try {
      await gphoto.setConfig('autoexposuremode', 'Manual')
      console.log('[init] Set mode: Manual')
    } catch (err) {
      console.warn('[init] Failed to set Manual mode:', err)
    }
    try {
      await gphoto.setConfig('viewfinder', '1')
      console.log('[init] Viewfinder enabled')
    } catch (err) {
      console.warn('[init] Failed to enable viewfinder:', err)
    }

    // Cache config values BEFORE starting stream
    console.log('[init] Caching camera config...')
    await populateConfigCache()

    console.log('[init] Starting stream...')
    try {
      await stream.start()
    } catch (err) {
      console.error('[init] Stream start failed:', err)
      await pushEvent({
        kind: 'error',
        message: 'Stream start failed',
        detail: String(err)
      })
    }
  } else {
    console.log('[init] No camera detected')
    await pushEvent({
      kind: 'error',
      message: 'No camera detected',
      detail: 'Connect a Canon DSLR via USB and restart'
    })
  }
}

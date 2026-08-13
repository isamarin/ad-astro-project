import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { ConfigEntry, CaptureResult } from './types.js'
import { CAPTURE_DIR } from './config.js'

const exec = promisify(execFile)

const GPHOTO2 = 'gphoto2'
const USB_RETRY_DELAY_MS = 2000
const USB_MAX_RETRIES = 5

async function execWithRetry(args: string[], timeout: number): Promise<{ stdout: string; stderr: string }> {
  for (let attempt = 0; attempt <= USB_MAX_RETRIES; attempt++) {
    try {
      return await exec(GPHOTO2, args, { timeout })
    } catch (err: any) {
      const isUsbBusy = err?.stderr?.includes('Could not claim the USB device') ||
                         err?.stderr?.includes('Device or resource busy')
      if (isUsbBusy && attempt < USB_MAX_RETRIES) {
        console.log(`[gphoto2] USB busy, retry ${attempt + 1}/${USB_MAX_RETRIES}...`)
        await new Promise(r => setTimeout(r, USB_RETRY_DELAY_MS))
        continue
      }
      throw err
    }
  }
  throw new Error('Unreachable')
}

/** Wait for USB device to become available by polling gphoto2 --auto-detect */
export async function waitForUsb(maxWaitMs: number = 15_000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    try {
      await exec(GPHOTO2, ['--get-config', '/main/status/serialnumber'], { timeout: 5_000 })
      return true
    } catch (err: any) {
      const isUsbBusy = err?.stderr?.includes('Could not claim the USB device') ||
                         err?.stderr?.includes('Device or resource busy')
      if (!isUsbBusy) return true // Other error = USB is free, just different problem
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  console.error(`[gphoto2] USB not available after ${maxWaitMs}ms`)
  return false
}

export async function autoDetect(): Promise<{ model: string; port: string } | null> {
  try {
    const { stdout } = await exec(GPHOTO2, ['--auto-detect'], { timeout: 10_000 })
    const lines = stdout.trim().split('\n')
    // Skip header lines (first 2)
    for (let i = 2; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue
      // Format: "Model                          Port"
      const match = line.match(/^(.+?)\s{2,}(.+)$/)
      if (match) {
        return { model: match[1].trim(), port: match[2].trim() }
      }
    }
    return null
  } catch {
    return null
  }
}

export async function listConfig(): Promise<ConfigEntry[]> {
  const { stdout } = await exec(GPHOTO2, ['--list-all-config'], { timeout: 30_000 })
  const entries: ConfigEntry[] = []
  let current: Partial<ConfigEntry> | null = null

  for (const line of stdout.split('\n')) {
    if (line.startsWith('/main/')) {
      if (current?.key) {
        entries.push(current as ConfigEntry)
      }
      // Extract the short key from full path
      const parts = line.trim().split('/')
      current = { key: parts[parts.length - 1], value: '', choices: [] }
    } else if (current) {
      if (line.startsWith('Current: ')) {
        current.value = line.slice('Current: '.length).trim()
      } else if (line.startsWith('Choice: ')) {
        const match = line.match(/^Choice: \d+ (.+)$/)
        if (match) {
          current.choices!.push(match[1].trim())
        }
      }
    }
  }
  if (current?.key) {
    entries.push(current as ConfigEntry)
  }

  return entries
}

export async function getConfig(key: string): Promise<{ value: string; choices: string[] }> {
  const { stdout } = await execWithRetry(['--get-config', key], 10_000)

  let value = ''
  const choices: string[] = []

  for (const line of stdout.split('\n')) {
    if (line.startsWith('Current: ')) {
      value = line.slice('Current: '.length).trim()
    } else if (line.startsWith('Choice: ')) {
      const match = line.match(/^Choice: \d+ (.+)$/)
      if (match) choices.push(match[1].trim())
    }
  }

  return { value, choices }
}

export async function setConfig(key: string, value: string): Promise<void> {
  await execWithRetry(['--set-config', `${key}=${value}`], 10_000)
}

/** Switch camera to JPEG or RAW output format */
export async function setImageFormat(format: 'jpeg' | 'raw'): Promise<void> {
  const target = format === 'jpeg' ? 'Large Fine JPEG' : 'RAW'
  // Try 'imageformat' first (most Canon models), fall back to 'imagequality'
  for (const key of ['imageformat', 'imagequality']) {
    try {
      const { choices } = await getConfig(key)
      const match = choices.find(c => c.toLowerCase().includes(format === 'jpeg' ? 'jpeg' : 'raw'))
      if (match) {
        await setConfig(key, match)
        console.log(`[gphoto2] Image format set to "${match}" via ${key}`)
        return
      }
    } catch {
      // Config key not available on this camera
    }
  }
  console.warn(`[gphoto2] Could not set image format to ${target}, trying direct value`)
  try {
    await setConfig('imageformat', target)
  } catch (err) {
    console.warn(`[gphoto2] setImageFormat fallback failed:`, err)
  }
}

/** Capture image directly to a specific file path */
export async function captureToFile(outputPath: string, shutterTimeMs: number = 0): Promise<void> {
  const timeout = Math.max(60_000, shutterTimeMs + 30_000)
  await exec(
    GPHOTO2,
    ['--capture-image-and-download', '--filename', outputPath, '--force-overwrite'],
    { timeout }
  )
}

export async function captureImage(): Promise<CaptureResult> {
  const { stdout } = await exec(
    GPHOTO2,
    ['--capture-image-and-download', '--filename', `${CAPTURE_DIR}/%f.%C`],
    { timeout: 60_000 }
  )

  // Parse output for filename
  const match = stdout.match(/Saving file as (.+)/)
  const filename = match ? match[1].trim().split('/').pop()! : 'unknown.cr2'

  // Get file size
  let size = 'unknown'
  try {
    const { stdout: ls } = await exec('ls', ['-lh', `${CAPTURE_DIR}/${filename}`])
    const parts = ls.trim().split(/\s+/)
    size = parts[4] || 'unknown'
  } catch { /* ignore */ }

  return {
    ok: true,
    filename,
    size,
    format: filename.toLowerCase().endsWith('.cr2') ? '14-bit RAW' : 'JPEG',
    path: `${CAPTURE_DIR}/${filename}`
  }
}

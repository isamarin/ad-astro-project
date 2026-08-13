import { createTransport, type Transporter } from 'nodemailer'
import { readdir, readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import {
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
  SMTP_FROM, NOTIFICATION_EMAIL, CAPTURE_DIR, DAILY_REPORT_HOUR
} from './config.js'
import type { Session } from './types.js'

const exec = promisify(execFile)

let transporter: Transporter | null = null
let lastReportDate = ''
let reportTimer: ReturnType<typeof setInterval> | null = null

function getTransporter(): Transporter | null {
  if (!SMTP_HOST || !NOTIFICATION_EMAIL) return null
  if (!transporter) {
    transporter = createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined
    })
  }
  return transporter
}

function sessionTypeLabel(type: string): string {
  switch (type) {
    case 'timelapse_forced': return 'Timelapse'
    case 'timelapse_auto': return 'Auto Timelapse'
    case 'startrails': return 'Star Trails'
    default: return type
  }
}

function formatDuration(start: string, end?: string): string {
  const s = new Date(start).getTime()
  const e = end ? new Date(end).getTime() : Date.now()
  const sec = Math.floor((e - s) / 1000)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${sec % 60}s`
}

/** Select N evenly spaced preview frame paths */
async function selectPreviewFrames(framesDir: string, count: number = 5): Promise<string[]> {
  try {
    const files = (await readdir(framesDir)).filter(f => f.endsWith('.jpg')).sort()
    if (files.length === 0) return []
    if (files.length <= count) return files.map(f => path.join(framesDir, f))
    const indices = Array.from({ length: count }, (_, i) =>
      Math.floor(i * (files.length - 1) / (count - 1))
    )
    return indices.map(i => path.join(framesDir, files[i]))
  } catch {
    return []
  }
}

/** Resize image to 800px wide thumbnail, returns Buffer */
async function resizeImage(inputPath: string): Promise<Buffer> {
  const outputPath = inputPath + '.thumb.jpg'
  try {
    await exec('convert', [inputPath, '-resize', '800x>', outputPath], { timeout: 30_000 })
    return await readFile(outputPath)
  } catch {
    // Fallback: return original
    return await readFile(inputPath)
  }
}

const HTML_STYLE = `
  body { margin: 0; padding: 0; background: #07090f; color: #f3f4fa; font-family: 'IBM Plex Sans', -apple-system, sans-serif; }
  .container { max-width: 640px; margin: 0 auto; padding: 24px; }
  .header { text-align: center; margin-bottom: 24px; }
  .header h1 { font-size: 24px; font-weight: 600; color: #ffb648; margin: 0 0 4px; }
  .header p { font-size: 13px; color: #8a90ab; margin: 0; }
  .stats { background: #0d111c; border: 1px solid #232b44; border-radius: 8px; padding: 16px; margin-bottom: 20px; }
  .stats table { width: 100%; border-collapse: collapse; }
  .stats td { padding: 6px 0; font-size: 14px; }
  .stats td:first-child { color: #8a90ab; }
  .stats td:last-child { color: #f3f4fa; text-align: right; font-family: 'JetBrains Mono', monospace; }
  .preview { margin: 16px 0; }
  .preview img { width: 100%; border-radius: 6px; border: 1px solid #232b44; margin-bottom: 8px; }
  .footer { text-align: center; font-size: 11px; color: #565c79; margin-top: 24px; }
`

export async function sendSessionComplete(session: Session): Promise<void> {
  const t = getTransporter()
  if (!t) return

  const typeLabel = sessionTypeLabel(session.config.type)
  const duration = formatDuration(session.startedAt, session.stoppedAt)
  const subject = `${typeLabel} complete — ${session.framesCaptured} frames · ${duration}`

  // Try to get preview thumbnails
  const previews = await selectPreviewFrames(session.framesDir, 5)
  const attachments: Array<{ filename: string; content: Buffer; cid: string }> = []

  for (let i = 0; i < previews.length; i++) {
    try {
      const buf = await resizeImage(previews[i])
      attachments.push({
        filename: `preview_${i}.jpg`,
        content: buf,
        cid: `preview${i}`
      })
    } catch { /* skip */ }
  }

  const previewHtml = attachments.map(a =>
    `<img src="cid:${a.cid}" alt="Preview" />`
  ).join('\n')

  const html = `<!DOCTYPE html><html><head><style>${HTML_STYLE}</style></head><body>
<div class="container">
  <div class="header">
    <h1>★ ${typeLabel} Complete</h1>
    <p>AstroStreamer · Orange Pi</p>
  </div>
  <div class="stats"><table>
    <tr><td>Session</td><td>${session.id}</td></tr>
    <tr><td>Type</td><td>${typeLabel}</td></tr>
    <tr><td>Frames</td><td>${session.framesCaptured} (${session.failedFrames} failed)</td></tr>
    <tr><td>Duration</td><td>${duration}</td></tr>
    <tr><td>Preset</td><td>ISO ${session.config.preset.iso} · ${session.config.preset.shutter} · WB ${session.config.preset.wb}</td></tr>
    <tr><td>Output</td><td>${session.outputPath || 'N/A'}</td></tr>
    <tr><td>Status</td><td>${session.status}</td></tr>
  </table></div>
  <div class="preview">${previewHtml}</div>
  <div class="footer">AstroStreamer · Star Watcher</div>
</div></body></html>`

  await t.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: NOTIFICATION_EMAIL,
    subject,
    html,
    attachments
  })

  console.log(`[email] Session complete notification sent to ${NOTIFICATION_EMAIL}`)
}

export async function sendDailyReport(sessions: Session[]): Promise<void> {
  const t = getTransporter()
  if (!t) return

  const today = new Date().toISOString().slice(0, 10)
  const todaySessions = sessions.filter(s => s.startedAt.startsWith(today))
  const totalFrames = todaySessions.reduce((sum, s) => sum + s.framesCaptured, 0)

  const subject = `Daily Report · ${today} · ${todaySessions.length} sessions · ${totalFrames} frames`

  const sessionsHtml = todaySessions.map(s => `
    <tr>
      <td>${sessionTypeLabel(s.config.type)}</td>
      <td>${s.framesCaptured}</td>
      <td>${formatDuration(s.startedAt, s.stoppedAt)}</td>
      <td>${s.status}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html><html><head><style>${HTML_STYLE}
    .sessions td { padding: 8px; border-bottom: 1px solid #232b44; font-size: 13px; }
    .sessions th { padding: 8px; color: #8a90ab; font-size: 12px; text-align: left; border-bottom: 1px solid #2e3759; }
  </style></head><body>
<div class="container">
  <div class="header">
    <h1>★ Daily Report</h1>
    <p>${today} · AstroStreamer</p>
  </div>
  <div class="stats"><table>
    <tr><td>Sessions</td><td>${todaySessions.length}</td></tr>
    <tr><td>Total Frames</td><td>${totalFrames}</td></tr>
  </table></div>
  ${todaySessions.length > 0 ? `
  <table class="sessions" style="width:100%;border-collapse:collapse;background:#0d111c;border:1px solid #232b44;border-radius:8px;">
    <tr><th>Type</th><th>Frames</th><th>Duration</th><th>Status</th></tr>
    ${sessionsHtml}
  </table>` : '<p style="text-align:center;color:#565c79;">No sessions today</p>'}
  <div class="footer">AstroStreamer · Star Watcher</div>
</div></body></html>`

  await t.sendMail({
    from: SMTP_FROM || SMTP_USER,
    to: NOTIFICATION_EMAIL,
    subject,
    html
  })

  console.log(`[email] Daily report sent for ${today}`)
}

export async function sendTestEmail(): Promise<{ ok: boolean; error?: string }> {
  const t = getTransporter()
  if (!t) {
    return { ok: false, error: 'SMTP not configured' }
  }

  try {
    await t.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to: NOTIFICATION_EMAIL,
      subject: 'AstroStreamer — Test Email',
      html: `<!DOCTYPE html><html><head><style>${HTML_STYLE}</style></head><body>
<div class="container">
  <div class="header">
    <h1>★ Test Email</h1>
    <p>SMTP configuration is working</p>
  </div>
  <div class="stats"><table>
    <tr><td>SMTP Host</td><td>${SMTP_HOST}:${SMTP_PORT}</td></tr>
    <tr><td>From</td><td>${SMTP_FROM || SMTP_USER}</td></tr>
    <tr><td>To</td><td>${NOTIFICATION_EMAIL}</td></tr>
  </table></div>
  <div class="footer">AstroStreamer · Star Watcher</div>
</div></body></html>`
    })
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err.message }
  }
}

/** Start daily report scheduler */
export function startDailyReportScheduler(getSessions: () => Promise<Session[]>) {
  if (!SMTP_HOST || !NOTIFICATION_EMAIL) return
  if (reportTimer) return

  reportTimer = setInterval(async () => {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    if (now.getHours() === DAILY_REPORT_HOUR && lastReportDate !== today) {
      lastReportDate = today
      try {
        const sessions = await getSessions()
        await sendDailyReport(sessions)
      } catch (err) {
        console.error('[email] Daily report failed:', err)
      }
    }
  }, 5 * 60 * 1000) // Check every 5 minutes

  console.log(`[email] Daily report scheduled at ${DAILY_REPORT_HOUR}:00`)
}

export function stopDailyReportScheduler() {
  if (reportTimer) {
    clearInterval(reportTimer)
    reportTimer = null
  }
}

import { createServer } from 'node:http'
import { mkdir } from 'node:fs/promises'
import { PORT, CAPTURE_DIR, AUTO_TIMELAPSE } from './config.js'
import { handleRequest, init, stream, autoTimelapse } from './routes.js'
import { initTimelapse, recoverSessions, loadSessions } from './timelapse.js'
import { startDailyReportScheduler } from './email.js'

// Ensure capture directory exists
await mkdir(CAPTURE_DIR, { recursive: true })

// Initialize timelapse engine with stream reference
initTimelapse(stream)

// Recover any interrupted sessions from previous run
await recoverSessions()

const server = createServer(handleRequest)

server.listen(PORT, () => {
  console.log(`[camera-service] Listening on port ${PORT}`)

  // Initialize camera detection and stream after server is ready
  init().then(() => {
    // Start auto timelapse if enabled
    if (AUTO_TIMELAPSE) {
      autoTimelapse.start()
    }

    // Start daily email report scheduler
    startDailyReportScheduler(loadSessions)
  }).catch(err => console.error('[camera-service] Init failed:', err))
})

// Graceful shutdown
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    console.log(`[camera-service] Received ${signal}, shutting down...`)
    autoTimelapse.stop()
    server.close()
    process.exit(0)
  })
}

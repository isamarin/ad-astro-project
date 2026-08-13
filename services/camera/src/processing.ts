import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readdir, rm, rename } from 'node:fs/promises'
import path from 'node:path'
import { pushEvent } from './events.js'

const exec = promisify(execFile)

const TIMELAPSE_TIMEOUT_MS = 30 * 60 * 1000  // 30 min
const STACK_TIMEOUT_MS = 60 * 60 * 1000      // 60 min per composite step (generous)

/**
 * Assemble JPEG frames into an MP4 timelapse video using FFmpeg.
 * Frames must be named frame_00001.jpg, frame_00002.jpg, etc.
 */
export async function assembleTimelapse(framesDir: string, outputPath: string): Promise<void> {
  console.log(`[processing] Assembling timelapse: ${framesDir} → ${outputPath}`)

  await pushEvent({
    kind: 'timelapse',
    message: 'Assembling video',
    detail: outputPath
  })

  const inputPattern = path.join(framesDir, 'frame_%05d.jpg')

  await exec('ffmpeg', [
    '-y',
    '-framerate', '24',
    '-i', inputPattern,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-preset', 'slow',
    '-crf', '23',
    outputPath
  ], { timeout: TIMELAPSE_TIMEOUT_MS })

  console.log(`[processing] Timelapse assembled: ${outputPath}`)
}

/**
 * Stack JPEG frames using incremental lighten blend (ImageMagick).
 * Processes 2 images at a time to stay under 1GB RAM on Orange Pi.
 */
export async function stackStarTrails(framesDir: string, outputPath: string): Promise<void> {
  console.log(`[processing] Stacking star trails: ${framesDir} → ${outputPath}`)

  const files = (await readdir(framesDir))
    .filter(f => f.endsWith('.jpg'))
    .sort()

  if (files.length === 0) {
    throw new Error('No frames to stack')
  }

  if (files.length === 1) {
    // Single frame — just copy
    const { copyFile } = await import('node:fs/promises')
    await copyFile(path.join(framesDir, files[0]), outputPath)
    return
  }

  await pushEvent({
    kind: 'timelapse',
    message: 'Stacking frames',
    detail: `${files.length} frames`
  })

  // Start with first frame as accumulator
  const accumPath = path.join(framesDir, '_accumulator.jpg')
  const tempPath = path.join(framesDir, '_temp_stack.jpg')
  const { copyFile } = await import('node:fs/promises')
  await copyFile(path.join(framesDir, files[0]), accumPath)

  // Incrementally composite each subsequent frame
  for (let i = 1; i < files.length; i++) {
    const framePath = path.join(framesDir, files[i])

    await exec('convert', [
      accumPath,
      framePath,
      '-compose', 'Lighten',
      '-composite',
      tempPath
    ], { timeout: STACK_TIMEOUT_MS })

    await rename(tempPath, accumPath)

    // Push progress every 10 frames
    if (i % 10 === 0 || i === files.length - 1) {
      await pushEvent({
        kind: 'timelapse',
        message: 'Stacking progress',
        detail: `${i + 1}/${files.length} frames`
      })
    }
  }

  // Move accumulator to output
  await rename(accumPath, outputPath)
  console.log(`[processing] Star trails stacked: ${outputPath}`)
}

/** Remove frames directory after successful output */
export async function cleanupFrames(framesDir: string): Promise<void> {
  try {
    await rm(framesDir, { recursive: true, force: true })
    console.log(`[processing] Cleaned up: ${framesDir}`)
  } catch (err) {
    console.error(`[processing] Cleanup failed:`, err)
  }
}

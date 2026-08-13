import { OBSERVER_LAT, OBSERVER_LON } from './config.js'
import { startSession, stopSession, isActive } from './timelapse.js'
import { pushEvent } from './events.js'
import type { SessionConfig } from './types.js'

const CHECK_INTERVAL_MS = 15 * 60 * 1000 // 15 minutes
const DEG = Math.PI / 180

/**
 * Calculate sun altitude using NOAA solar position algorithm.
 * Returns altitude in degrees (negative = below horizon).
 */
function getSunAltitude(lat: number, lon: number, date: Date = new Date()): number {
  const jd = getJulianDate(date)
  const jc = (jd - 2451545.0) / 36525.0

  // Geometric mean longitude of the sun (degrees)
  const L0 = (280.46646 + jc * (36000.76983 + 0.0003032 * jc)) % 360

  // Mean anomaly of the sun (degrees)
  const M = (357.52911 + jc * (35999.05029 - 0.0001537 * jc)) % 360
  const Mrad = M * DEG

  // Sun equation of center
  const C = Math.sin(Mrad) * (1.914602 - jc * (0.004817 + 0.000014 * jc))
    + Math.sin(2 * Mrad) * (0.019993 - 0.000101 * jc)
    + Math.sin(3 * Mrad) * 0.000289

  // Sun true longitude
  const sunLon = L0 + C

  // Sun apparent longitude
  const omega = 125.04 - 1934.136 * jc
  const lambda = (sunLon - 0.00569 - 0.00478 * Math.sin(omega * DEG)) * DEG

  // Obliquity of ecliptic
  const obliq = (23.439291 - jc * (0.0130042 + 0.00000016 * jc)) * DEG
  const obliqCorr = obliq + 0.00256 * Math.cos(omega * DEG) * DEG

  // Sun declination
  const sinDec = Math.sin(obliqCorr) * Math.sin(lambda)
  const dec = Math.asin(sinDec)

  // Equation of time (minutes)
  const y = Math.tan(obliqCorr / 2) ** 2
  const L0rad = L0 * DEG
  const eot = 4 * (y * Math.sin(2 * L0rad)
    - 2 * 0.016709 * Math.sin(Mrad)
    + 4 * 0.016709 * y * Math.sin(Mrad) * Math.cos(2 * L0rad)
    - 0.5 * y * y * Math.sin(4 * L0rad)
    - 1.25 * 0.016709 * 0.016709 * Math.sin(2 * Mrad)) / DEG

  // Solar hour angle
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  const solarTime = utcHours * 60 + eot + 4 * lon // in minutes
  const hourAngle = ((solarTime / 4) - 180) * DEG

  // Solar altitude
  const latRad = lat * DEG
  const altitude = Math.asin(
    Math.sin(latRad) * Math.sin(dec) +
    Math.cos(latRad) * Math.cos(dec) * Math.cos(hourAngle)
  )

  return altitude / DEG
}

function getJulianDate(date: Date): number {
  const y = date.getUTCFullYear()
  const m = date.getUTCMonth() + 1
  const d = date.getUTCDate()
  const h = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600

  let jy = y, jm = m
  if (m <= 2) { jy--; jm += 12 }

  const A = Math.floor(jy / 100)
  const B = 2 - A + Math.floor(A / 4)

  return Math.floor(365.25 * (jy + 4716)) + Math.floor(30.6001 * (jm + 1)) + d + h / 24 + B - 1524.5
}

/**
 * Approximate moon illumination (0–1) using synodic month.
 * Returns fraction of lunar disk illuminated.
 */
function getMoonIllumination(date: Date = new Date()): number {
  // Known new moon: 2000-01-06 18:14 UTC
  const knownNewMoon = new Date('2000-01-06T18:14:00Z').getTime()
  const synodicMonth = 29.53058867 // days
  const daysSinceNewMoon = (date.getTime() - knownNewMoon) / (24 * 3600 * 1000)
  const phase = ((daysSinceNewMoon % synodicMonth) + synodicMonth) % synodicMonth
  // Illumination: 0 at new moon, 1 at full moon (day ~14.76)
  return (1 - Math.cos(2 * Math.PI * phase / synodicMonth)) / 2
}

export class AutoTimelapse {
  private timer: ReturnType<typeof setInterval> | null = null
  private _enabled = false
  private _autoSessionStarted = false

  get enabled(): boolean {
    return this._enabled
  }

  start() {
    if (this._enabled) return
    this._enabled = true
    this._autoSessionStarted = false

    console.log('[auto] Auto timelapse enabled, checking every 15 min')
    pushEvent({
      kind: 'timelapse',
      message: 'Auto timelapse enabled'
    })

    // Immediate check
    this.checkConditions()

    this.timer = setInterval(() => this.checkConditions(), CHECK_INTERVAL_MS)
  }

  stop() {
    if (!this._enabled) return
    this._enabled = false

    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }

    console.log('[auto] Auto timelapse disabled')
    pushEvent({
      kind: 'timelapse',
      message: 'Auto timelapse disabled'
    })
  }

  private async checkConditions() {
    try {
      // Skip if session already active
      if (isActive()) {
        // Check if dawn arrived — stop auto session
        if (this._autoSessionStarted) {
          const sunAlt = getSunAltitude(OBSERVER_LAT, OBSERVER_LON)
          if (sunAlt > -18) {
            console.log(`[auto] Dawn detected (sun alt: ${sunAlt.toFixed(1)}°), stopping session`)
            await stopSession()
            this._autoSessionStarted = false

            await pushEvent({
              kind: 'timelapse',
              message: 'Auto session stopped (dawn)',
              detail: `Sun altitude: ${sunAlt.toFixed(1)}°`
            })
          }
        }
        return
      }

      this._autoSessionStarted = false

      // Check astronomical night
      const sunAlt = getSunAltitude(OBSERVER_LAT, OBSERVER_LON)
      if (sunAlt > -18) {
        return // Not astronomical night
      }

      // Check weather (cloud cover) via Open-Meteo — no API key, no Nuxt dependency
      let clouds = 100
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${OBSERVER_LAT}&longitude=${OBSERVER_LON}` +
          `&current=cloud_cover&timezone=auto`
        const response = await fetch(url)
        if (response.ok) {
          const weather = (await response.json()) as {
            current?: { cloud_cover?: number }
          }
          clouds = weather.current?.cloud_cover ?? 100
        } else {
          console.warn('[auto] Open-Meteo HTTP', response.status)
          return
        }
      } catch {
        console.warn('[auto] Could not fetch weather, skipping')
        return
      }

      if (clouds > 15) {
        console.log(`[auto] Too cloudy (${clouds}%), skipping`)
        return
      }

      // Determine preset by moon illumination
      const moonIllum = getMoonIllumination()
      const preset = moonIllum > 0.5
        ? { iso: '800', shutter: '13', wb: 'Daylight' }     // Moonlit Night
        : { iso: '1600', shutter: '20', wb: 'Daylight' }    // Clear Night

      console.log(`[auto] Conditions met: sun ${sunAlt.toFixed(1)}°, clouds ${clouds}%, moon ${(moonIllum * 100).toFixed(0)}%`)

      const config: SessionConfig = {
        type: 'timelapse_auto',
        preset,
        interval: 0,          // Continuous (only buffer between frames)
        maxFrames: 0,         // Until dawn
        bufferSeconds: 5
      }

      await startSession(config)
      this._autoSessionStarted = true

      await pushEvent({
        kind: 'timelapse',
        message: 'Auto session started',
        detail: `Sun ${sunAlt.toFixed(1)}° · Clouds ${clouds}% · Moon ${(moonIllum * 100).toFixed(0)}% · ISO ${preset.iso} · ${preset.shutter}s`
      })
    } catch (err) {
      console.error('[auto] Check failed:', err)
    }
  }
}

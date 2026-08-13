export const PORT = parseInt(process.env.PORT || '3001', 10)
export const MEDIAMTX_RTSP_URL = process.env.MEDIAMTX_RTSP_URL || 'rtsp://127.0.0.1:8554/canon'
export const MEDIAMTX_WEBRTC_URL = process.env.MEDIAMTX_WEBRTC_URL || 'http://127.0.0.1:8889'
export const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || ''
export const CAPTURE_DIR = process.env.CAPTURE_DIR || '/tmp/captures'

// SMTP for email notifications
export const SMTP_HOST = process.env.SMTP_HOST || ''
export const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10)
export const SMTP_USER = process.env.SMTP_USER || ''
export const SMTP_PASS = process.env.SMTP_PASS || ''
export const SMTP_FROM = process.env.SMTP_FROM || ''
export const NOTIFICATION_EMAIL = process.env.NOTIFICATION_EMAIL || ''

// Observer location (for auto-timelapse sun/moon calculations)
export const OBSERVER_LAT = parseFloat(process.env.OBSERVER_LAT || '57.6261')
export const OBSERVER_LON = parseFloat(process.env.OBSERVER_LON || '39.8845')
export const TIMEZONE_OFFSET = parseInt(process.env.TIMEZONE_OFFSET || '3', 10)

// Auto timelapse
export const AUTO_TIMELAPSE = process.env.AUTO_TIMELAPSE === 'true'
export const DAILY_REPORT_HOUR = parseInt(process.env.DAILY_REPORT_HOUR || '8', 10)

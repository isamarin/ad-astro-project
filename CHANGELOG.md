# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/).
Versioning: [CalVer](https://calver.org/) `YYYY.MM.BUILD`.

## [Unreleased]

### Changed
- **Architecture:** Tauri v2 + Svelte orchestrator; Pi runs camera agent only
- Removed Nuxt UI (`app/`, `server/`), root app Docker image, MCP-on-Nuxt
- Camera agent: in-process SSE `/events`, WHEP proxy, Open-Meteo for auto-timelapse
- GitLab CI: validate Svelte build; package only `camera-armv7` image

### Added
- GitHub Actions: desktop (macOS/Windows/Linux) and Android 12+ APK
- `tauri android` scaffold, minSdk 31, LAN cleartext to camera agent

## [2026.6.1] - 2026-06-02

### Added
- Versioning system (YYYY.MM.BUILD format)
- Multi-platform Docker image builds (amd64, arm64, arm/v7)
- GitLab CI release pipeline with downloadable artifacts
- CHANGELOG.md

# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/).
Versioning: [CalVer](https://calver.org/) `YY.M.BUILD` (short year so Windows MSI/WiX accepts major ≤ 255).

## [Unreleased]

### Fixed
- Desktop CI Windows: app version major must be ≤ 255 — use `26.8.0` instead of `2026.8.0`

### Changed
- **Architecture:** Tauri v2 + Svelte orchestrator; Pi runs camera agent only
- Removed Nuxt UI (`app/`, `server/`), root app Docker image, MCP-on-Nuxt
- Camera agent: in-process SSE `/events`, WHEP proxy, Open-Meteo for auto-timelapse
- **Git remote:** GitHub only (`isamarin/ad-astro-project`); removed GitLab remote/CI

### Added
- GitHub Actions: desktop (macOS/Windows/Linux) and Android 12+ APK
- `tauri android` scaffold, minSdk 31, LAN cleartext to camera agent

## [2026.6.1] - 2026-06-02

### Added
- Versioning system (YYYY.MM.BUILD format)
- Multi-platform Docker image builds (amd64, arm64, arm/v7)
- CHANGELOG.md


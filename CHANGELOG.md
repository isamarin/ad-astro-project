# Changelog

CalVer `YY.M.BUILD`: year, month, build. August 2026 starts at `26.8.1`, then `26.8.2`.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [26.8.1] - 2026-08-14

### Changed
- Camera is abstract in the orchestrator; Canon gphoto2 agent moved to [canon-adapter](https://github.com/lumina-stream/canon-adapter)
- App owns `lumina.camera.v1` (`packages/shared`). Any adapter that implements it can connect
- Settings: Simulator or Remote adapter (probe `GET /adapter`)
- README rewritten
- Releases use short CalVer (`26.8.1`), not `2026.8.0`

## [2026.6.1] - 2026-06-02

Old scheme (`YYYY.M.BUILD`). Later tags are `YY.M.BUILD`.

### Added
- Versioning system
- Multi-platform Docker image builds (amd64, arm64, arm/v7)
- CHANGELOG.md

# Lumina

**Star Watcher** — приложение для удалённой камеры: live view, экспозиция, кадр, таймлапс. macOS, Windows, Linux и Android 12+.

Камеры в этом репозитории нет. Приложение говорит с адаптером по HTTP (`lumina.camera.v1`). Адаптер знает тело, объектив и USB; приложение — нет.

```
камера ──► адаптер ──► Star Watcher
```

Готовый адаптер для Canon DSLR: [lumina-stream/canon-adapter](https://github.com/lumina-stream/canon-adapter).

## Запуск

```bash
pnpm install
make dev-tauri          # или: pnpm dev:tauri
```

При первом старте: **Simulator** (без железа) или **Remote adapter** → хост и порт → **Probe adapter**.

Только браузер, без окна Tauri:

```bash
make dev                # http://localhost:1420
```

## Репозиторий

```
apps/desktop/           Star Watcher (Tauri v2 + SvelteKit)
packages/shared/        протокол и типы
```

Спека адаптера: [`packages/shared/PROTOCOL.md`](packages/shared/PROTOCOL.md).

## Сборка

```bash
make desktop-build
make android-build      # Android 12+, aarch64
```

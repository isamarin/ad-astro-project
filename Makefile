# === Config ===
VERSION     ?= $(shell git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//' || echo "dev")
ADAPTER_DIR ?= ../canon-adapter

# === Orchestrator (Tauri + Svelte) ===
JAVA_HOME      ?= /opt/homebrew/opt/openjdk@17
ANDROID_HOME   ?= $(HOME)/Library/Android/sdk
NDK_HOME       ?= $(ANDROID_HOME)/ndk/28.2.13676358

export JAVA_HOME ANDROID_HOME NDK_HOME
export PATH := $(JAVA_HOME)/bin:$(PATH)

dev:
	pnpm --filter desktop dev

dev-tauri:
	pnpm --filter desktop tauri dev

dev-android:
	pnpm --filter desktop tauri android dev

desktop-build:
	pnpm --filter desktop tauri build

android-init:
	cd apps/desktop && CI=1 pnpm tauri android init --ci

android-build:
	pnpm --filter desktop tauri android build --apk --target aarch64

dev-infra:
	docker compose -f docker-compose.dev.yml up -d

run: dev-tauri

dev-all:
	@echo "Architecture: Tauri orchestrator + camera adapter (separate repo)"
	@echo "  1) make dev-tauri              # Star Watcher"
	@echo "  2) Settings → Simulator or Remote adapter (probe GET /adapter)"
	@echo "  3) Canon on Pi: cd $(ADAPTER_DIR) && make deploy"

# Local MediaMTX only (no camera). Adapters ship their own compose stack.
up:
	docker compose -f docker-compose.dev.yml up -d

down:
	docker compose -f docker-compose.dev.yml down

# Forward adapter deploy if the sibling repo is present
deploy:
	@if [ -d "$(ADAPTER_DIR)" ]; then \
		$(MAKE) -C "$(ADAPTER_DIR)" deploy; \
	else \
		echo "Camera adapters are separate repos."; \
		echo "Canon: https://github.com/lumina-stream/canon-adapter"; \
		echo "  git clone https://github.com/lumina-stream/canon-adapter.git $(ADAPTER_DIR)"; \
		echo "  cd $(ADAPTER_DIR) && make deploy"; \
		exit 1; \
	fi

setup-pi:
	@if [ -d "$(ADAPTER_DIR)" ]; then \
		$(MAKE) -C "$(ADAPTER_DIR)" setup-pi; \
	else \
		echo "Clone canon-adapter first: https://github.com/lumina-stream/canon-adapter"; \
		exit 1; \
	fi

tag:
ifndef V
	$(error Usage: make tag V=2026.08.0)
endif
	git tag -a "v$(V)" -m "Release $(V)"
	git push origin "v$(V)"

update:
	pnpm update

.PHONY: dev dev-tauri dev-android desktop-build android-init android-build \
	dev-infra run dev-all up down deploy setup-pi tag update

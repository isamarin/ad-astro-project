# === Config ===
VERSION     ?= $(shell git describe --tags --abbrev=0 2>/dev/null | sed 's/^v//' || echo "dev")
PLATFORM    := linux/arm/v7
BUILD_DIR   := .build
SBC_IP      ?= $(ORANGE_PI_ONE_IP_SSH)
SBC_USER    ?= $(ORANGE_PI_ONE_USER_SSH)
DEPLOY_PATH ?= /opt/astrostreamer
SBC_SSH     := ssh $(SBC_USER)@$(SBC_IP)
SBC_SCP     := scp -o StrictHostKeyChecking=no

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

dev-agent:
	pnpm --filter astrostreamer-camera dev

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
	@echo "Architecture: Tauri orchestrator (PC/Android) + camera agent (Pi)"
	@echo "  1) make dev-tauri     # Star Watcher (mock by default)"
	@echo "  2) On Pi: make up     # mediamtx + camera agent"
	@echo "  3) Settings → Pi IP, disable mock"

# Optional local LiveView pipe (without Docker agent)
dev-stream:
	gphoto2 --capture-movie --stdout | \
	ffmpeg -i - -vf format=yuv420p -c:v libx264 -preset ultrafast -tune zerolatency \
	-f rtsp rtsp://127.0.0.1:8554/canon

# === Agent stack on Pi (docker compose) ===
up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

logs-camera:
	docker compose logs -f camera

# === Cross-compile agent for Orange Pi (ARMv7) ===
cross-setup:
	docker buildx create --name armbuilder --use 2>/dev/null || docker buildx use armbuilder
	docker buildx inspect --bootstrap

cross-build: $(BUILD_DIR)
	docker buildx build \
		--platform $(PLATFORM) \
		--build-arg APP_VERSION=$(VERSION) \
		-t astrostreamer/camera:latest \
		--output type=docker,dest=$(BUILD_DIR)/camera.tar \
		./services/camera
	@echo "Agent image: $(BUILD_DIR)/camera.tar (version: $(VERSION))"

$(BUILD_DIR):
	mkdir -p $(BUILD_DIR)

# === Deploy agent to Orange Pi ===
deploy-push:
	@echo "Loading agent image on $(SBC_IP)..."
	cat $(BUILD_DIR)/camera.tar | $(SBC_SSH) "docker load"

deploy-config:
	$(SBC_SSH) "mkdir -p $(DEPLOY_PATH)"
	$(SBC_SCP) docker-compose.yml $(SBC_USER)@$(SBC_IP):$(DEPLOY_PATH)/
	$(SBC_SCP) .env $(SBC_USER)@$(SBC_IP):$(DEPLOY_PATH)/

deploy-start:
	$(SBC_SSH) "cd $(DEPLOY_PATH) && docker compose pull mediamtx && docker compose up -d"

deploy-stop:
	$(SBC_SSH) "cd $(DEPLOY_PATH) && docker compose down"

deploy-logs:
	$(SBC_SSH) "cd $(DEPLOY_PATH) && docker compose logs -f"

deploy-status:
	$(SBC_SSH) "cd $(DEPLOY_PATH) && docker compose ps"

deploy: cross-build deploy-push deploy-config deploy-start
	@echo "Agent deployed to $(SBC_IP)"

setup-pi:
	$(SBC_SCP) scripts/setup-pi.sh $(SBC_USER)@$(SBC_IP):/tmp/
	$(SBC_SSH) "chmod +x /tmp/setup-pi.sh && /tmp/setup-pi.sh"

# Load a local agent image tarball (from make cross-build)
load:
	docker load < $(BUILD_DIR)/camera.tar
	@echo "Loaded camera agent from $(BUILD_DIR)/camera.tar"

tag:
ifndef V
	$(error Usage: make tag V=2026.08.0)
endif
	git tag -a "v$(V)" -m "Release $(V)"
	git push origin "v$(V)"

update:
	pnpm update

.PHONY: dev dev-tauri dev-android dev-agent dev-infra run dev-all dev-stream \
	desktop-build android-init android-build \
	up down build logs logs-camera \
	cross-setup cross-build deploy-push deploy-config deploy-start deploy-stop \
	deploy-logs deploy-status deploy setup-pi load tag update

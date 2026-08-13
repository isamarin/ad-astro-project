#!/bin/bash
# setup-pi.sh — First-time setup for Orange Pi Zero H3 (Armbian Bookworm)
# Run as root: ssh root@<ip> "bash /tmp/setup-pi.sh"
set -euo pipefail

echo "=== AstroStreamer: Orange Pi Zero H3 Setup ==="

# --- Docker ---
if ! command -v docker &>/dev/null; then
  echo "[1/5] Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
else
  echo "[1/5] Docker already installed, skipping"
fi

# --- Docker Compose plugin ---
if ! docker compose version &>/dev/null; then
  echo "[2/5] Installing Docker Compose plugin..."
  apt-get update && apt-get install -y docker-compose-plugin
else
  echo "[2/5] Docker Compose plugin already installed, skipping"
fi

# --- Swap (2GB, critical for 1GB RAM boards) ---
if [ ! -f /swapfile ]; then
  echo "[3/5] Creating 2GB swap..."
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile swap swap defaults 0 0' >> /etc/fstab
else
  echo "[3/5] Swap already exists, skipping"
fi

# --- Canon DSLR USB access without root ---
echo "[4/5] Setting up Canon USB udev rules..."
cat > /etc/udev/rules.d/99-canon.rules <<'UDEV'
# Canon DSLR cameras (vendor 04a9)
SUBSYSTEM=="usb", ATTRS{idVendor}=="04a9", MODE="0666"
UDEV
udevadm control --reload-rules
udevadm trigger

# --- USB kernel module ---
echo "[5/5] Ensuring usbcore module..."
modprobe usbcore 2>/dev/null || true
grep -q '^usbcore$' /etc/modules 2>/dev/null || echo 'usbcore' >> /etc/modules

# --- App directory ---
mkdir -p /opt/astrostreamer

echo ""
echo "=== Setup complete ==="
echo "  Swap:    $(swapon --show --noheadings | awk '{print $3}')"
echo "  Docker:  $(docker --version)"
echo "  Compose: $(docker compose version)"
echo "  Deploy:  /opt/astrostreamer"
echo ""
echo "Next: run 'make deploy' from your dev machine"

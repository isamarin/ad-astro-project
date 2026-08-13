FROM node:22-slim

# Install gphoto2 and ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    gphoto2 \
    libgphoto2-dev \
    ffmpeg \
    imagemagick \
    usbutils \
  && rm -rf /var/lib/apt/lists/*

# Allow ImageMagick to process larger files (needed for star trail stacking on Pi)
RUN sed -i 's/rights="none" pattern="@\*"/rights="read|write" pattern="@*"/' /etc/ImageMagick-6/policy.xml || true

# Kill any gphoto2 auto-mount daemons that interfere with USB
RUN rm -f /usr/lib/udev/rules.d/*gphoto* /usr/share/dbus-1/services/*gphoto* 2>/dev/null || true

RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

COPY . .
RUN pnpm build

ENV PORT=3001
ENV CAPTURE_DIR=/tmp/captures
RUN mkdir -p /tmp/captures

CMD ["node", "dist/index.js"]

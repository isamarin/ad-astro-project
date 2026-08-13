import { defineConfig } from 'vite'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const host = process.env.TAURI_DEV_HOST
const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(() => ({
  plugins: [tailwindcss(), sveltekit()],
  clearScreen: false,
  resolve: {
    alias: {
      '@astrostreamer/shared': path.resolve(rootDir, '../../packages/shared/src/index.ts')
    }
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || '127.0.0.1',
    fs: {
      allow: [rootDir, path.resolve(rootDir, '../../packages')]
    },
    hmr: host
      ? {
          protocol: 'ws',
          host,
          port: 1421
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**']
    }
  }
}))


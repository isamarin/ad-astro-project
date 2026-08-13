<script lang="ts">
  import type { AppMode } from '@astrostreamer/shared'
  import { cameraInfo } from '$lib/stores/camera'

  interface Props {
    mode: AppMode
    capturing?: boolean
  }
  let { mode, capturing = false }: Props = $props()

  let now = $state(new Date())
  let timer: ReturnType<typeof setInterval>

  $effect(() => {
    timer = setInterval(() => {
      now = new Date()
    }, 1000)
    return () => clearInterval(timer)
  })

  const utc = $derived(
    now.toISOString().replace('T', ' ').replace(/\.\d+Z$/, ' UTC')
  )

  const modeLabel = $derived(
    mode === 'astro' ? 'ASTRO' : mode === 'manual' ? 'MANUAL' : 'CHILL'
  )
  const modeColor = $derived(
    mode === 'astro' ? 'var(--accent-3)' : mode === 'manual' ? 'var(--accent)' : 'var(--good)'
  )
</script>

<div class="absolute inset-0 z-10 pointer-events-none p-3 flex flex-col justify-between">
  <div class="flex justify-between items-start gap-2">
    <div class="flex flex-wrap items-center gap-2 font-mono text-[10px] sm:text-[11px]" style="color: var(--ink-1)">
      <span class="size-2 rounded-full rec-dot" style="background: var(--bad)"></span>
      <span>REC · RTSP · LiveView</span>
      <span style="color: var(--ink-3)">|</span>
      <span style="color: var(--ink-2)">{utc}</span>
    </div>
    <div class="flex items-center gap-2 font-mono text-[10px] sm:text-[11px]">
      <span style="color: var(--ink-2)">CAM · {$cameraInfo.model}</span>
      <span
        class="px-1.5 py-0.5 rounded"
        style="background: var(--bg-3); color: {modeColor}"
        >{modeLabel}</span
      >
    </div>
  </div>
  {#if capturing}
    <div class="absolute inset-0 bg-white/70 pointer-events-none" style="animation: flash 0.6s ease-out forwards"></div>
  {/if}
</div>

<style>
  @keyframes flash {
    0% {
      opacity: 0;
    }
    15% {
      opacity: 0.7;
    }
    100% {
      opacity: 0;
    }
  }
</style>

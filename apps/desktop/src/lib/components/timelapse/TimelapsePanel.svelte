<script lang="ts">
  import {
    currentSession,
    sessions,
    loading,
    isActive,
    autoEnabled,
    startTimelapse,
    stopTimelapse,
    toggleAuto
  } from '$lib/stores/timelapse'
  import type { SessionConfig } from '@astrostreamer/shared'

  const defaultConfig: SessionConfig = {
    type: 'timelapse_forced',
    preset: { iso: '1600', shutter: '20', wb: 'Daylight' },
    interval: 0,
    maxFrames: 0,
    bufferSeconds: 5
  }

  async function start() {
    await startTimelapse(defaultConfig)
  }
</script>

<aside class="flex flex-col h-full min-h-0 border-l" style="background: var(--bg-1); border-color: var(--line)">
  <div class="px-3 py-2.5 border-b shrink-0" style="border-color: var(--line)">
    <span class="font-mono text-[12px] font-semibold" style="color: var(--ink-1)">Timelapse</span>
  </div>

  <div class="flex-1 log-scroll p-3 space-y-4 min-h-0">
    <div class="flex flex-col gap-2">
      {#if $isActive}
        <div class="font-mono text-[11px]" style="color: var(--good)">
          Capturing · frames {$currentSession?.framesCaptured ?? 0}
        </div>
        <button
          type="button"
          class="font-mono text-[12px] font-semibold px-3 py-2 rounded-lg"
          style="background: var(--bad); color: var(--bg-0)"
          disabled={$loading}
          onclick={() => stopTimelapse()}
        >
          Stop
        </button>
      {:else}
        <p class="font-mono text-[11px]" style="color: var(--ink-2)">
          Forced session: ISO 1600 · 20s · Daylight
        </p>
        <button
          type="button"
          class="font-mono text-[12px] font-semibold px-3 py-2 rounded-lg"
          style="background: var(--accent); color: var(--bg-0)"
          disabled={$loading}
          onclick={start}
        >
          Start timelapse
        </button>
      {/if}
    </div>

    <label class="flex items-center gap-2 font-mono text-[11px]" style="color: var(--ink-1)">
      <input
        type="checkbox"
        checked={$autoEnabled}
        onchange={(e) => toggleAuto((e.currentTarget as HTMLInputElement).checked)}
      />
      Auto (clear astronomical night)
    </label>

    <div>
      <div class="font-mono text-[10px] uppercase mb-2" style="color: var(--ink-3)">Sessions</div>
      {#each $sessions as s}
        <div class="mb-2 p-2 rounded border font-mono text-[10px]" style="border-color: var(--line); color: var(--ink-2)">
          <div style="color: var(--ink-1)">{s.id}</div>
          <div>{s.status} · {s.framesCaptured} frames</div>
        </div>
      {:else}
        <div class="font-mono text-[11px]" style="color: var(--ink-3)">No sessions yet</div>
      {/each}
    </div>
  </div>
</aside>

<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import AppHeader from '$lib/components/AppHeader.svelte'
  import SettingsPanel from '$lib/components/SettingsPanel.svelte'
  import VideoStream from '$lib/components/stream/VideoStream.svelte'
  import ChillOverlay from '$lib/components/stream/ChillOverlay.svelte'
  import StreamHUD from '$lib/components/stream/StreamHUD.svelte'
  import ExposureOverlay from '$lib/components/stream/ExposureOverlay.svelte'
  import CameraControls from '$lib/components/controls/CameraControls.svelte'
  import EventLog from '$lib/components/activity/EventLog.svelte'
  import TimelapsePanel from '$lib/components/timelapse/TimelapsePanel.svelte'
  import { mode } from '$lib/stores/mode'
  import { initCameraFromAgent } from '$lib/stores/camera'
  import { connectSSE, disconnectSSE } from '$lib/stores/events'
  import { isActive as timelapseActive, initTimelapse, cleanupTimelapse } from '$lib/stores/timelapse'

  let settingsOpen = $state(false)
  let capturing = $state(false)
  let detectActive = $state(false)
  let eventLogOpen = $state(false)
  let rightPanelTab = $state<'activity' | 'timelapse'>('activity')

  onMount(() => {
    connectSSE()
    initCameraFromAgent()
    initTimelapse()
  })

  onDestroy(() => {
    disconnectSSE()
    cleanupTimelapse()
  })
</script>

<svelte:head>
  <title>Star Watcher · AstroStreamer</title>
</svelte:head>

<AppHeader onSettings={() => (settingsOpen = true)} />

<div class="flex-1 flex flex-col min-h-0">
  <div
    class="flex-1 flex flex-col min-h-0 lg:grid transition-[grid-template-columns] duration-[420ms]"
    class:lg:grid-cols-[minmax(0,1fr)_360px]={$mode !== 'chill'}
    class:lg:grid-cols-[minmax(0,1fr)_0fr]={$mode === 'chill'}
  >
    <div class="flex flex-col min-h-0">
      <div class="flex-1 relative min-h-0">
        <div class="h-full">
        <VideoStream mode={$mode}>
          {#if $mode === 'chill'}
            <ChillOverlay />
          {:else}
            <StreamHUD mode={$mode} {capturing} />
            <ExposureOverlay />
          {/if}
        </VideoStream>
        </div>
      </div>

      {#if $mode !== 'chill'}
        <CameraControls
          mode={$mode}
          onCapturing={(v) => (capturing = v)}
          {detectActive}
          onDetectToggle={() => (detectActive = !detectActive)}
        />
      {/if}
    </div>

    {#if $mode !== 'chill'}
      <div class="hidden lg:flex flex-col overflow-hidden min-h-0">
        <div
          class="flex border-b shrink-0"
          style="border-color: var(--line); background: var(--bg-1)"
        >
          <button
            type="button"
            class="flex-1 font-mono text-[11px] font-semibold px-3 py-2 relative"
            style="color: {rightPanelTab === 'activity' ? 'var(--ink-0)' : 'var(--ink-3)'}"
            onclick={() => (rightPanelTab = 'activity')}
          >
            Activity
            {#if rightPanelTab === 'activity'}
              <span
                class="absolute bottom-0 left-3 right-3 h-[2px] rounded-t"
                style="background: var(--accent-2)"
              ></span>
            {/if}
          </button>
          <button
            type="button"
            class="flex-1 font-mono text-[11px] font-semibold px-3 py-2 relative flex items-center justify-center gap-1.5"
            style="color: {rightPanelTab === 'timelapse' ? 'var(--ink-0)' : 'var(--ink-3)'}"
            onclick={() => (rightPanelTab = 'timelapse')}
          >
            Timelapse
            {#if $timelapseActive}
              <span
                class="size-1.5 rounded-full rec-dot"
                style="background: var(--good)"
              ></span>
            {/if}
            {#if rightPanelTab === 'timelapse'}
              <span
                class="absolute bottom-0 left-3 right-3 h-[2px] rounded-t"
                style="background: var(--accent-2)"
              ></span>
            {/if}
          </button>
        </div>
        {#if rightPanelTab === 'activity'}
          <EventLog />
        {:else}
          <TimelapsePanel />
        {/if}
      </div>
    {/if}
  </div>

  {#if $mode !== 'chill'}
    <div class="fixed bottom-4 right-4 z-40 lg:hidden flex gap-2">
      <button
        type="button"
        class="font-mono text-[11px] font-semibold px-3 py-2 rounded-lg shadow-lg"
        style="background: var(--bg-3); color: var(--ink-1); border: 1px solid var(--line)"
        onclick={() => {
          eventLogOpen = true
          rightPanelTab = 'activity'
        }}
      >
        Activity
      </button>
      <button
        type="button"
        class="font-mono text-[11px] font-semibold px-3 py-2 rounded-lg shadow-lg relative"
        style="background: var(--bg-3); color: var(--ink-1); border: 1px solid var(--line)"
        onclick={() => {
          eventLogOpen = true
          rightPanelTab = 'timelapse'
        }}
      >
        Timelapse
      </button>
    </div>
  {/if}

  {#if eventLogOpen && $mode !== 'chill'}
    <div class="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        class="absolute inset-0 bg-black/50"
        aria-label="Close"
        onclick={() => (eventLogOpen = false)}
      ></button>
      <aside
        class="absolute top-0 right-0 bottom-0 w-[320px] max-w-[85vw] flex flex-col"
        style="background: var(--bg-1); border-left: 1px solid var(--line)"
      >
        <div class="flex border-b shrink-0" style="border-color: var(--line)">
          <button
            type="button"
            class="flex-1 font-mono text-[11px] font-semibold px-3 py-2"
            style="color: {rightPanelTab === 'activity' ? 'var(--ink-0)' : 'var(--ink-3)'}"
            onclick={() => (rightPanelTab = 'activity')}>Activity</button
          >
          <button
            type="button"
            class="flex-1 font-mono text-[11px] font-semibold px-3 py-2"
            style="color: {rightPanelTab === 'timelapse' ? 'var(--ink-0)' : 'var(--ink-3)'}"
            onclick={() => (rightPanelTab = 'timelapse')}>Timelapse</button
          >
          <button
            type="button"
            class="p-2"
            style="color: var(--ink-2)"
            onclick={() => (eventLogOpen = false)}>✕</button
          >
        </div>
        {#if rightPanelTab === 'activity'}
          <EventLog />
        {:else}
          <TimelapsePanel />
        {/if}
      </aside>
    </div>
  {/if}
</div>

<SettingsPanel open={settingsOpen} onClose={() => (settingsOpen = false)} />

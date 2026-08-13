<script lang="ts">
  import { EVENT_KIND_META, type EventKind } from '@astrostreamer/shared'
  import {
    filteredEvents,
    filters,
    clearEvents,
    sseConnected
  } from '$lib/stores/events'
  import { agentBaseUrl } from '$lib/stores/connection'

  const kinds = Object.keys(EVENT_KIND_META) as EventKind[]

  function toggle(kind: EventKind) {
    filters.update((f) => ({ ...f, [kind]: !f[kind] }))
  }
</script>

<aside
  class="flex flex-col h-full min-h-0 border-l"
  style="background: var(--bg-1); border-color: var(--line)"
>
  <div
    class="flex items-center justify-between px-3 py-2.5 border-b shrink-0"
    style="border-color: var(--line)"
  >
    <div class="flex items-center gap-2">
      <span class="font-mono text-[12px] font-semibold" style="color: var(--ink-1)">Activity</span>
      <span
        class="font-mono text-[10px] px-1.5 py-0.5 rounded-full"
        style="background: var(--bg-3); color: var(--ink-3)"
      >
        {$filteredEvents.length}
      </span>
    </div>
    <button
      type="button"
      class="font-mono text-[10px] px-2 py-1 rounded"
      style="color: var(--ink-3)"
      onclick={() => clearEvents()}>Clear</button
    >
  </div>

  <div class="flex flex-wrap gap-1 px-2 py-2 border-b shrink-0" style="border-color: var(--line)">
    {#each kinds as kind}
      {@const meta = EVENT_KIND_META[kind]}
      <button
        type="button"
        class="font-mono text-[9px] px-1.5 py-0.5 rounded"
        style="background: {$filters[kind]
          ? 'var(--bg-3)'
          : 'transparent'}; color: {$filters[kind]
          ? meta.color
          : 'var(--ink-3)'}; border: 1px solid {$filters[kind] ? meta.color : 'var(--line)'}"
        onclick={() => toggle(kind)}
      >
        {meta.tag}
      </button>
    {/each}
  </div>

  <div class="flex-1 log-scroll min-h-0">
    {#each $filteredEvents as event (event.id)}
      {@const meta = EVENT_KIND_META[event.kind]}
      <div class="px-3 py-2 border-b" style="border-color: var(--line)">
        <div class="flex items-center gap-2 mb-0.5">
          <span class="font-mono text-[10px]" style="color: var(--ink-3)">{event.time}</span>
          <span
            class="font-mono text-[9px] font-semibold px-1 rounded"
            style="color: {meta.color}; background: color-mix(in srgb, {meta.color} 12%, transparent)"
            >{meta.tag}</span
          >
        </div>
        <div class="font-mono text-[11px]" style="color: var(--ink-1)">{event.message}</div>
        {#if event.detail}
          <div class="font-mono text-[10px] mt-0.5" style="color: var(--ink-3)">{event.detail}</div>
        {/if}
      </div>
    {:else}
      <div
        class="flex items-center justify-center py-8 font-mono text-[11px]"
        style="color: var(--ink-3)"
      >
        No events
      </div>
    {/each}
  </div>

  <div
    class="flex items-center justify-between px-3 py-2 border-t shrink-0 font-mono text-[10px]"
    style="border-color: var(--line); color: var(--ink-3)"
  >
    <span class="flex items-center gap-1.5">
      <span
        class="size-1.5 rounded-full"
        style="background: {$sseConnected ? 'var(--good)' : 'var(--bad)'}"
      ></span>
      {$agentBaseUrl}
    </span>
  </div>
</aside>

<script lang="ts">
  import type { AppMode } from '@astrostreamer/shared'
  import { mode, setMode } from '$lib/stores/mode'

  const modes: { value: AppMode; label: string; hint: string; color: string }[] = [
    { value: 'chill', label: 'CHILL', hint: 'video only', color: 'var(--good)' },
    {
      value: 'manual',
      label: 'MANUAL',
      hint: 'ISO · shutter · focus',
      color: 'var(--accent)'
    },
    {
      value: 'astro',
      label: 'ASTROLANDSCAPE',
      hint: 'long exposure + star id',
      color: 'var(--accent-3)'
    }
  ]

  let containerEl: HTMLDivElement | undefined = $state()
  let pillLeft = $state('0px')
  let pillWidth = $state('0px')

  const activeIndex = $derived(modes.findIndex((m) => m.value === $mode))
  const activeColor = $derived(modes[activeIndex]?.color ?? 'var(--good)')

  function updatePill() {
    if (!containerEl) return
    const buttons = containerEl.querySelectorAll<HTMLElement>('[data-mode-btn]')
    const btn = buttons[activeIndex]
    if (!btn) return
    const cr = containerEl.getBoundingClientRect()
    const br = btn.getBoundingClientRect()
    pillLeft = `${br.left - cr.left}px`
    pillWidth = `${br.width}px`
  }

  $effect(() => {
    void $mode
    requestAnimationFrame(updatePill)
  })
</script>

<div
  bind:this={containerEl}
  class="relative flex items-center gap-0.5 sm:gap-1 rounded-lg p-0.5 sm:p-1"
  style="background: var(--bg-2)"
>
  <span
    class="absolute top-0.5 sm:top-1 bottom-0.5 sm:bottom-1 rounded-md pointer-events-none"
    style="background: var(--bg-3); left: {pillLeft}; width: {pillWidth}; transition: left var(--dur-enter) var(--ease-out-expo), width var(--dur-enter) var(--ease-out-expo)"
  ></span>

  {#each modes as m}
    <button
      type="button"
      data-mode-btn
      class="relative z-[1] flex flex-col items-center px-2 sm:px-4 py-1 sm:py-1.5 rounded-md"
      style="color: {$mode === m.value ? 'var(--ink-0)' : 'var(--ink-3)'}; transition: color var(--dur-normal) var(--ease-out-quart)"
      onclick={() => setMode(m.value)}
    >
      <span class="font-mono text-[10px] sm:text-[11px] font-semibold tracking-wider"
        >{m.label}</span
      >
      <span class="hidden md:block font-mono text-[9px]" style="color: var(--ink-3)"
        >{m.hint}</span
      >
    </button>
  {/each}

  <span
    class="absolute bottom-0.5 sm:bottom-1 h-0.5 rounded-full pointer-events-none"
    style="background: {activeColor}; left: calc({pillLeft} + 0.5rem); width: calc({pillWidth} - 1rem); transition: left var(--dur-enter) var(--ease-out-expo), width var(--dur-enter) var(--ease-out-expo), background var(--dur-enter) var(--ease-out-expo)"
  ></span>
</div>

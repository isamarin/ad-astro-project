<script lang="ts">
  interface Props {
    label: string
    value: string
    options: readonly string[]
    onChange: (value: string) => void
    hint?: string
  }
  let { label, value, options, onChange, hint }: Props = $props()

  const currentIndex = $derived(options.indexOf(value))
  const canPrev = $derived(currentIndex > 0)
  const canNext = $derived(currentIndex >= 0 && currentIndex < options.length - 1)

  function stepBy(dir: -1 | 1) {
    const next = currentIndex + dir
    if (next >= 0 && next < options.length) onChange(options[next])
  }
</script>

<div class="flex flex-col gap-1.5">
  <span class="font-mono text-[10px] uppercase tracking-wider" style="color: var(--ink-3)"
    >{label}</span
  >
  <div class="flex items-center gap-2">
    <button
      type="button"
      class="stepper-btn size-7 flex items-center justify-center rounded font-mono text-sm"
      style="background: var(--bg-3); color: {canPrev
        ? 'var(--ink-0)'
        : 'var(--ink-3)'}; border: 1px solid var(--line)"
      disabled={!canPrev}
      onclick={() => stepBy(-1)}
    >
      −
    </button>
    <div class="min-w-[60px] text-center font-mono text-sm font-semibold" style="color: var(--ink-0)">
      {value}
    </div>
    <button
      type="button"
      class="stepper-btn size-7 flex items-center justify-center rounded font-mono text-sm"
      style="background: var(--bg-3); color: {canNext
        ? 'var(--ink-0)'
        : 'var(--ink-3)'}; border: 1px solid var(--line)"
      disabled={!canNext}
      onclick={() => stepBy(1)}
    >
      +
    </button>
  </div>
  <div class="flex items-center gap-0.5">
    {#each options as opt, i}
      <span
        class="h-1 rounded-full"
        style="width: 4px; background: {i === currentIndex
          ? 'var(--accent)'
          : 'var(--bg-3)'}; transform: {i === currentIndex ? 'scaleX(2)' : 'scaleX(1)'}"
      ></span>
    {/each}
  </div>
  {#if hint}
    <span class="font-mono text-[9px]" style="color: var(--ink-3)">{hint}</span>
  {/if}
</div>

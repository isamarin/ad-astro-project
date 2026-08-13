<script lang="ts">
  import { setMode } from '$lib/stores/mode'

  function exit() {
    setMode('manual')
  }
</script>

<div class="absolute inset-0 z-10 flex flex-col justify-between p-5 pointer-events-none">
  <div class="flex items-center gap-2">
    <span class="size-2 rounded-full rec-dot" style="background: var(--good)"></span>
    <span class="font-mono text-[11px] font-semibold tracking-wider" style="color: var(--ink-1)"
      >LIVE</span
    >
  </div>
  <div class="flex flex-col items-start gap-3 pointer-events-auto">
    <p class="font-display text-2xl sm:text-3xl" style="color: var(--ink-0)">
      you are watching the sky
    </p>
    <button
      type="button"
      class="font-mono text-[11px] px-3 py-1.5 rounded border"
      style="border-color: var(--line-2); color: var(--ink-1); background: color-mix(in srgb, var(--bg-1) 80%, transparent)"
      onclick={exit}
    >
      exit chill
    </button>
  </div>
</div>

<script lang="ts">
  import { cameraState } from '$lib/stores/camera'
</script>

<div
  class="absolute bottom-3 left-3 z-10 flex gap-3 font-mono text-[10px] sm:text-[11px] px-2.5 py-1.5 rounded"
  style="background: color-mix(in srgb, var(--bg-1) 85%, transparent); border: 1px solid var(--line); color: var(--ink-1)"
>
  <span>ISO <b style="color: var(--accent)">{$cameraState.iso}</b></span>
  <span>SH <b style="color: var(--ink-0)">{$cameraState.shutter}</b></span>
  <span>AP <b style="color: var(--ink-0)">ƒ/{$cameraState.aperture}</b></span>
  <span>WB <b style="color: var(--accent-2)">{$cameraState.wb}</b></span>
</div>

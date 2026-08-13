<script lang="ts">
  import type { AppMode } from '@astrostreamer/shared'
  import ValueStepper from './ValueStepper.svelte'
  import {
    cameraState,
    cameraInfo,
    setCamPatch,
    captureFrame,
    ISO_SCALE,
    SHUTTER_MAN,
    SHUTTER_AST,
    WB_PRESETS
  } from '$lib/stores/camera'

  interface Props {
    mode: AppMode
    onCapturing?: (v: boolean) => void
    detectActive?: boolean
    onDetectToggle?: () => void
  }
  let {
    mode,
    onCapturing,
    detectActive = false,
    onDetectToggle
  }: Props = $props()

  const shutterOptions = $derived(mode === 'astro' ? [...SHUTTER_AST] : [...SHUTTER_MAN])

  async function onCapture() {
    onCapturing?.(true)
    try {
      await captureFrame()
    } catch (err) {
      console.error('Capture failed:', err)
    } finally {
      setTimeout(() => onCapturing?.(false), 600)
    }
  }
</script>

<div class="border-t px-3 py-3 lg:px-4" style="background: var(--bg-1); border-color: var(--line)">
  <div class="flex flex-col lg:grid lg:grid-cols-12 gap-4 items-start">
    <div class="hidden lg:flex lg:col-span-2 flex-col gap-1">
      <span
        class="font-mono text-[11px] font-semibold uppercase tracking-wider"
        style="color: var(--ink-1)">Camera</span
      >
      <span class="font-mono text-[9px]" style="color: var(--ink-3)">{$cameraInfo.model}</span>
      <span class="font-mono text-[9px]" style="color: var(--ink-3)">{$cameraInfo.lens}</span>
    </div>

    <div class="lg:col-span-7 flex flex-wrap items-start gap-4 lg:gap-5">
      <ValueStepper
        label="ISO"
        value={$cameraState.iso}
        options={[...ISO_SCALE]}
        onChange={(v) => setCamPatch({ iso: v })}
      />
      <ValueStepper
        label="Shutter"
        value={$cameraState.shutter}
        options={shutterOptions}
        onChange={(v) => setCamPatch({ shutter: v })}
      />
      <div class="flex flex-col gap-1.5">
        <span class="font-mono text-[10px] uppercase tracking-wider" style="color: var(--ink-3)"
          >Aperture</span
        >
        <span class="font-mono text-sm font-semibold" style="color: var(--ink-2)"
          >ƒ/{$cameraState.aperture}</span
        >
        <span class="font-mono text-[9px]" style="color: var(--ink-3)">fixed lens</span>
      </div>
      <div class="flex flex-col gap-1.5 min-w-[100px]">
        <span class="font-mono text-[10px] uppercase tracking-wider" style="color: var(--ink-3)"
          >Focus</span
        >
        <input
          type="range"
          class="rng"
          min="0"
          max="100"
          value={$cameraState.focus}
          oninput={(e) =>
            setCamPatch({ focus: Number((e.currentTarget as HTMLInputElement).value) })}
        />
        <div class="flex justify-between font-mono text-[8px]" style="color: var(--ink-3)">
          <span>0.5m</span>
          <span>{$cameraState.focus}</span>
          <span>∞</span>
        </div>
      </div>
      <div class="flex flex-col gap-1.5">
        <span class="font-mono text-[10px] uppercase tracking-wider" style="color: var(--ink-3)"
          >White Balance</span
        >
        <div class="flex flex-wrap gap-1">
          {#each WB_PRESETS as wb}
            <button
              type="button"
              class="wb-chip font-mono text-[10px] px-2 py-1 rounded"
              style="background: {$cameraState.wb === wb
                ? 'var(--bg-3)'
                : 'transparent'}; color: {$cameraState.wb === wb
                ? 'var(--accent-2)'
                : 'var(--ink-3)'}; border: 1px solid {$cameraState.wb === wb
                ? 'var(--accent-2)'
                : 'var(--line)'}"
              onclick={() => setCamPatch({ wb })}
            >
              {wb}
            </button>
          {/each}
        </div>
      </div>
    </div>

    <div class="lg:col-span-3 flex flex-row lg:flex-col items-center lg:items-end gap-2">
      <button
        type="button"
        class="capture-btn flex items-center gap-2 font-mono text-[12px] font-semibold px-4 py-2 rounded-lg"
        style="background: var(--accent); color: var(--bg-0)"
        onclick={onCapture}
      >
        ◉ Capture
      </button>
      {#if mode === 'astro'}
        <button
          type="button"
          class="detect-btn flex items-center gap-2 font-mono text-[12px] font-semibold px-4 py-2 rounded-lg"
          style="background: {detectActive
            ? 'color-mix(in srgb, var(--accent-3) 15%, transparent)'
            : 'transparent'}; color: var(--accent-3); border: 1px solid var(--accent-3)"
          onclick={() => onDetectToggle?.()}
        >
          ✦ Detect Stars
        </button>
      {/if}
    </div>
  </div>
</div>

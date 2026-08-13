<script lang="ts">
  import { connection } from '$lib/stores/connection'
  import type { ConnectionSettings } from '@astrostreamer/shared'
  import { connectSSE, disconnectSSE } from '$lib/stores/events'
  import { initCameraFromAgent } from '$lib/stores/camera'

  interface Props {
    open: boolean
    onClose: () => void
  }
  let { open, onClose }: Props = $props()

  let draft = $state<ConnectionSettings>({ ...$connection })

  $effect(() => {
    if (open) draft = { ...$connection }
  })

  async function save() {
    connection.set({ ...draft })
    disconnectSSE()
    connectSSE()
    await initCameraFromAgent()
    onClose()
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <button
      type="button"
      class="absolute inset-0 bg-black/60"
      aria-label="Close"
      onclick={onClose}
    ></button>
    <div
      class="relative w-full max-w-md rounded-xl border p-5 shadow-xl fade-in"
      style="background: var(--bg-1); border-color: var(--line)"
    >
      <h2 class="font-display text-xl mb-4" style="color: var(--ink-0)">Connection</h2>
      <p class="font-mono text-[11px] mb-4" style="color: var(--ink-3)">
        Orange Pi camera agent. Orchestrator is this app (PC / Android).
      </p>

      <label class="block mb-3">
        <span class="font-mono text-[10px] uppercase" style="color: var(--ink-3)">Host</span>
        <input
          class="mt-1 w-full rounded px-3 py-2 font-mono text-sm"
          style="background: var(--bg-2); border: 1px solid var(--line); color: var(--ink-0)"
          bind:value={draft.host}
        />
      </label>

      <div class="grid grid-cols-2 gap-3 mb-3">
        <label class="block">
          <span class="font-mono text-[10px] uppercase" style="color: var(--ink-3)"
            >Camera port</span
          >
          <input
            type="number"
            class="mt-1 w-full rounded px-3 py-2 font-mono text-sm"
            style="background: var(--bg-2); border: 1px solid var(--line); color: var(--ink-0)"
            bind:value={draft.cameraPort}
          />
        </label>
        <label class="block">
          <span class="font-mono text-[10px] uppercase" style="color: var(--ink-3)"
            >WebRTC port</span
          >
          <input
            type="number"
            class="mt-1 w-full rounded px-3 py-2 font-mono text-sm"
            style="background: var(--bg-2); border: 1px solid var(--line); color: var(--ink-0)"
            bind:value={draft.webrtcPort}
          />
        </label>
      </div>

      <label class="block mb-3">
        <span class="font-mono text-[10px] uppercase" style="color: var(--ink-3)">API key</span>
        <input
          type="password"
          class="mt-1 w-full rounded px-3 py-2 font-mono text-sm"
          style="background: var(--bg-2); border: 1px solid var(--line); color: var(--ink-0)"
          bind:value={draft.apiKey}
          placeholder="optional"
        />
      </label>

      <label class="flex items-center gap-2 mb-5 font-mono text-[12px]" style="color: var(--ink-1)">
        <input type="checkbox" bind:checked={draft.mock} />
        Mock mode (no agent / no camera)
      </label>

      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="font-mono text-[12px] px-3 py-2 rounded"
          style="color: var(--ink-2)"
          onclick={onClose}>Cancel</button
        >
        <button
          type="button"
          class="font-mono text-[12px] font-semibold px-4 py-2 rounded-lg"
          style="background: var(--accent); color: var(--bg-0)"
          onclick={save}>Save</button
        >
      </div>
    </div>
  </div>
{/if}

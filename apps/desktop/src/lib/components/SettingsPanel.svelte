<script lang="ts">
  import {
    CAMERA_PROTOCOL,
    DEFAULT_CONNECTION,
    SIMULATOR_MANIFEST,
    type AdapterManifest,
    type CameraSource,
    type ConnectionSettings
  } from '@astrostreamer/shared'
  import { connection } from '$lib/stores/connection'
  import { connectSSE, disconnectSSE } from '$lib/stores/events'
  import { initCameraFromAgent } from '$lib/stores/camera'
  import { probeRemoteAdapter } from '$lib/camera'

  interface Props {
    open: boolean
    required?: boolean
    onClose: () => void
  }
  let { open, required = false, onClose }: Props = $props()

  let draft = $state<ConnectionSettings>({ ...$connection })
  let probeError = $state('')
  let probing = $state(false)
  let probed = $state<AdapterManifest | null>($connection.manifest)

  $effect(() => {
    if (open) {
      draft = { ...$connection }
      probed = $connection.manifest
      probeError = ''
    }
  })

  const remote = $derived(draft.source === 'remote')
  const canSave = $derived(
    draft.source === 'simulator' || (draft.source === 'remote' && !!probed)
  )
  const canDismiss = $derived(!required || !!$connection.source)

  function pickSource(source: CameraSource) {
    probeError = ''
    if (source === 'simulator') {
      draft = {
        ...draft,
        source,
        manifest: SIMULATOR_MANIFEST,
        streamPath: SIMULATOR_MANIFEST.streamPath
      }
      probed = SIMULATOR_MANIFEST
      return
    }
    draft = {
      ...draft,
      source,
      host: draft.host || DEFAULT_CONNECTION.host,
      manifest: null
    }
    probed = null
  }

  async function probe() {
    probeError = ''
    probing = true
    probed = null
    try {
      const manifest = await probeRemoteAdapter({
        host: draft.host,
        cameraPort: draft.cameraPort,
        apiKey: draft.apiKey
      })
      probed = manifest
      draft = { ...draft, manifest, streamPath: manifest.streamPath }
    } catch (err) {
      probeError = err instanceof Error ? err.message : String(err)
    } finally {
      probing = false
    }
  }

  async function save() {
    if (!canSave) return
    connection.set({ ...draft, manifest: probed })
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
      disabled={!canDismiss}
      onclick={() => canDismiss && onClose()}
    ></button>
    <div
      class="relative w-full max-w-md rounded-xl border p-5 shadow-xl fade-in max-h-[90vh] overflow-y-auto"
      style="background: var(--bg-1); border-color: var(--line)"
    >
      <h2 class="font-display text-xl mb-1" style="color: var(--ink-0)">Camera</h2>
      <p class="font-mono text-[11px] mb-4" style="color: var(--ink-3)">
        The app speaks {CAMERA_PROTOCOL}. Point it at any adapter that implements that interface.
      </p>

      <p class="font-mono text-[10px] uppercase mb-2" style="color: var(--ink-3)">Source</p>
      <div class="flex flex-col gap-2 mb-4">
        <button
          type="button"
          class="text-left rounded-lg px-3 py-2.5 border"
          style="background: {draft.source === 'simulator'
            ? 'var(--bg-3)'
            : 'var(--bg-2)'}; border-color: {draft.source === 'simulator'
            ? 'var(--accent)'
            : 'var(--line)'}"
          onclick={() => pickSource('simulator')}
        >
          <div class="flex items-baseline justify-between gap-2">
            <span class="font-mono text-[13px] font-semibold" style="color: var(--ink-0)"
              >Simulator</span
            >
            <span class="font-mono text-[10px] uppercase" style="color: var(--ink-3)">built-in</span>
          </div>
          <p class="font-mono text-[11px] mt-1" style="color: var(--ink-2)">
            No hardware. Same camera interface, in-process.
          </p>
        </button>
        <button
          type="button"
          class="text-left rounded-lg px-3 py-2.5 border"
          style="background: {draft.source === 'remote'
            ? 'var(--bg-3)'
            : 'var(--bg-2)'}; border-color: {draft.source === 'remote'
            ? 'var(--accent)'
            : 'var(--line)'}"
          onclick={() => pickSource('remote')}
        >
          <div class="flex items-baseline justify-between gap-2">
            <span class="font-mono text-[13px] font-semibold" style="color: var(--ink-0)"
              >Remote adapter</span
            >
            <span class="font-mono text-[10px] uppercase" style="color: var(--ink-3)">network</span>
          </div>
          <p class="font-mono text-[11px] mt-1" style="color: var(--ink-2)">
            Any service that answers GET /adapter with {CAMERA_PROTOCOL}.
          </p>
        </button>
      </div>

      {#if remote}
        <label class="block mb-3">
          <span class="font-mono text-[10px] uppercase" style="color: var(--ink-3)">Host</span>
          <input
            class="mt-1 w-full rounded px-3 py-2 font-mono text-sm"
            style="background: var(--bg-2); border: 1px solid var(--line); color: var(--ink-0)"
            bind:value={draft.host}
            placeholder="192.168.1.70"
          />
        </label>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <label class="block">
            <span class="font-mono text-[10px] uppercase" style="color: var(--ink-3)"
              >Adapter port</span
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

        <button
          type="button"
          class="font-mono text-[12px] font-semibold px-3 py-2 rounded-lg mb-3 disabled:opacity-40"
          style="background: var(--bg-3); color: var(--ink-0); border: 1px solid var(--line)"
          disabled={probing || !draft.host}
          onclick={probe}
        >
          {probing ? 'Probing…' : 'Probe adapter'}
        </button>

        {#if probeError}
          <p class="font-mono text-[11px] mb-3" style="color: var(--bad)">{probeError}</p>
        {/if}

        {#if probed && draft.source === 'remote'}
          <div
            class="rounded-lg px-3 py-2 mb-3 font-mono text-[11px]"
            style="background: var(--bg-2); border: 1px solid var(--line); color: var(--ink-1)"
          >
            <p style="color: var(--ink-0)">{probed.name} <span style="color: var(--ink-3)">· {probed.id}</span></p>
            <p class="mt-1" style="color: var(--ink-3)">{probed.protocol} · {probed.streamPath}</p>
            <p class="mt-1">
              {[
                probed.capabilities.liveView && 'live view',
                probed.capabilities.stillCapture && 'capture',
                probed.capabilities.timelapse && 'timelapse',
                probed.capabilities.exposure && 'exposure',
                probed.capabilities.focus && 'focus'
              ]
                .filter(Boolean)
                .join(' · ') || 'no capabilities'}
            </p>
          </div>
        {/if}
      {/if}

      <div class="flex justify-end gap-2">
        {#if canDismiss}
          <button
            type="button"
            class="font-mono text-[12px] px-3 py-2 rounded"
            style="color: var(--ink-2)"
            onclick={onClose}>Cancel</button
          >
        {/if}
        <button
          type="button"
          class="font-mono text-[12px] font-semibold px-4 py-2 rounded-lg disabled:opacity-40"
          style="background: var(--accent); color: var(--bg-0)"
          disabled={!canSave}
          onclick={save}>Save</button
        >
      </div>
    </div>
  </div>
{/if}

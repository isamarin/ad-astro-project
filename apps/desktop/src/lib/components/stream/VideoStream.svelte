<script lang="ts">
  import type { Snippet } from 'svelte'
  import type { AppMode } from '@astrostreamer/shared'
  import { cameraFor } from '$lib/camera'
  import { connection, selectedAdapter } from '$lib/stores/connection'
  import { onDestroy } from 'svelte'

  interface Props {
    mode?: AppMode
    streamPath?: string
    children?: Snippet
  }
  let { mode = 'manual', streamPath, children }: Props = $props()

  let videoEl: HTMLVideoElement | undefined = $state()
  let status = $state<'connecting' | 'live' | 'error' | 'idle'>('connecting')
  let idleReason = $state('')
  let pc: RTCPeerConnection | null = null
  let reconnectTimeout: ReturnType<typeof setTimeout> | undefined

  async function connect() {
    const adapter = cameraFor($connection)
    const whep = adapter?.whepUrl(streamPath || $connection.streamPath || 'live') ?? null
    const liveView = $selectedAdapter?.capabilities.liveView ?? false

    if (!adapter || !whep || !liveView) {
      status = 'idle'
      idleReason = !adapter
        ? 'Choose a camera adapter'
        : !liveView
          ? `${$selectedAdapter?.name ?? 'Adapter'} has no live view`
          : 'No stream URL'
      cleanup()
      return
    }

    status = 'connecting'
    cleanup()

    try {
      const peer = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      })
      pc = peer

      peer.addTransceiver('video', { direction: 'recvonly' })
      peer.addTransceiver('audio', { direction: 'recvonly' })

      peer.ontrack = (event) => {
        if (videoEl && event.streams[0]) {
          videoEl.srcObject = event.streams[0]
        }
      }

      peer.onconnectionstatechange = () => {
        const state = peer.connectionState
        if (state === 'connected') status = 'live'
        else if (state === 'failed' || state === 'disconnected') {
          status = 'error'
          scheduleReconnect()
        }
      }

      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)

      if (peer.iceGatheringState !== 'complete') {
        await new Promise<void>((resolve) => {
          const check = () => {
            if (peer.iceGatheringState === 'complete') {
              peer.removeEventListener('icegatheringstatechange', check)
              resolve()
            }
          }
          peer.addEventListener('icegatheringstatechange', check)
          setTimeout(resolve, 3000)
        })
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/sdp' }
      if ($connection.apiKey) headers['X-Api-Key'] = $connection.apiKey

      const response = await fetch(whep, {
        method: 'POST',
        headers,
        body: peer.localDescription?.sdp
      })

      if (!response.ok) throw new Error(`WHEP error: ${response.status}`)

      const answerSdp = await response.text()
      await peer.setRemoteDescription({ type: 'answer', sdp: answerSdp })
    } catch (err) {
      console.error('[VideoStream] Connection failed:', err)
      status = 'error'
      scheduleReconnect()
    }
  }

  function cleanup() {
    if (pc) {
      pc.close()
      pc = null
    }
    if (videoEl) videoEl.srcObject = null
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimeout)
    reconnectTimeout = setTimeout(connect, 5000)
  }

  onDestroy(() => {
    clearTimeout(reconnectTimeout)
    cleanup()
  })

  $effect(() => {
    void $connection.host
    void $connection.cameraPort
    void $connection.source
    void $connection.streamPath
    void $selectedAdapter?.capabilities.liveView
    void streamPath
    if (typeof window === 'undefined') return
    clearTimeout(reconnectTimeout)
    connect()
    return () => {
      clearTimeout(reconnectTimeout)
      cleanup()
    }
  })
</script>

<div
  class="relative w-full h-full overflow-hidden rounded-lg {mode === 'astro'
    ? 'sky-bright'
    : 'sky'}"
  style="border: 1px solid var(--line)"
>
  <div class="absolute inset-0 grid-lines pointer-events-none"></div>
  {#if mode === 'astro'}
    <div class="milky-way"></div>
  {/if}

  <video
    bind:this={videoEl}
    autoplay
    muted
    playsinline
    class="relative w-full h-full object-contain z-[1]"
  ></video>

  {#if status !== 'live'}
    <div
      class="absolute inset-0 flex flex-col items-center justify-center gap-2 z-[2]"
      style="color: var(--ink-3)"
    >
      {#if status === 'idle'}
        <span class="font-display text-2xl" style="color: var(--accent-3)">no live view</span>
        <span class="text-sm font-mono">{idleReason}</span>
      {:else if status === 'connecting'}
        <span class="text-sm font-mono">Подключение к стриму...</span>
      {:else}
        <span class="text-sm font-mono">Нет соединения. Переподключение...</span>
      {/if}
    </div>
  {/if}

  {#if children}
    {@render children()}
  {/if}
</div>

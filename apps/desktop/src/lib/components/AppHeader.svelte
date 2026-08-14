<script lang="ts">
  import ModeSwitcher from './ModeSwitcher.svelte'
  import { cameraInfo } from '$lib/stores/camera'
  import { connection } from '$lib/stores/connection'

  interface Props {
    onSettings?: () => void
  }
  let { onSettings }: Props = $props()

  const version = '26.8.0'
</script>

<header
  class="flex items-center justify-between px-3 sm:px-5 h-12 sm:h-14 border-b shrink-0"
  style="background: var(--bg-1); border-color: var(--line)"
>
  <div class="flex items-center gap-2 sm:gap-3 min-w-0">
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      class="shrink-0"
      style="color: var(--accent)"
    >
      <path
        d="M12 2l1.09 3.37L16.46 4l-1.37 3.09L18.46 8.46l-3.37 1.09L16 12l-3.37-1.09L11.54 14l-1.09-3.37L7.09 11.54l1.37-3.09L5.09 7.09l3.37-1.09L8 3l3.37 1.09z"
        fill="currentColor"
      />
      <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.6" />
    </svg>
    <span class="font-display text-lg sm:text-xl not-italic" style="color: var(--ink-0)"
      >Star Watcher</span
    >
    <span
      class="hidden md:inline font-mono text-[10px] px-2 py-0.5 rounded-full"
      style="background: var(--bg-3); color: var(--ink-3)"
    >
      v{version} · {$connection.mock ? 'mock' : $connection.host}
    </span>
  </div>

  <ModeSwitcher />

  <div class="flex items-center gap-2 sm:gap-3">
    <div
      class="flex items-center gap-1.5 sm:gap-2 font-mono text-[11px] sm:text-xs"
      style="color: var(--ink-2)"
    >
      <span
        class="size-2 rounded-full shrink-0"
        style="background: {$cameraInfo.connected ? 'var(--good)' : 'var(--bad)'}"
      ></span>
      <span class="truncate max-w-[80px] sm:max-w-none">{$cameraInfo.model}</span>
      <span class="hidden sm:inline" style="color: {$cameraInfo.connected ? 'var(--ink-3)' : 'var(--bad)'}">
        · {$cameraInfo.connected ? 'online' : 'offline'}
      </span>
    </div>
    <button
      type="button"
      class="p-1.5 rounded font-mono text-[11px]"
      style="color: var(--ink-2)"
      onclick={() => onSettings?.()}
      title="Settings"
    >
      ⚙
    </button>
  </div>
</header>

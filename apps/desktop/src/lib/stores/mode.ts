import { derived, writable } from 'svelte/store'
import type { AppMode } from '@astrostreamer/shared'
import { connection } from './connection'
import { get } from 'svelte/store'

function getAutoMode(offset: number): 'chill' | 'astro' {
  const utcHours = new Date().getUTCHours()
  const localHour = (utcHours + offset) % 24
  return localHour >= 22 || localHour < 6 ? 'astro' : 'chill'
}

const override = writable<AppMode | null>(null)
const autoMode = writable<'chill' | 'astro'>(
  getAutoMode(get(connection).timezoneOffset)
)

export const mode = derived(
  [override, autoMode],
  ([$o, $a]) => ($o ?? $a) as AppMode
)

export const isManualOverride = derived(override, ($o) => $o !== null)

export function setMode(value: AppMode) {
  override.set(value)
}

export function resetToAuto() {
  const offset = get(connection).timezoneOffset
  override.set(null)
  autoMode.set(getAutoMode(offset))
}

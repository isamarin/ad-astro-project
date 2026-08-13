<script lang="ts">
  import '../app.css'
  import type { Snippet } from 'svelte'

  interface Props {
    children: Snippet
  }
  let { children }: Props = $props()
</script>

<div class="h-screen flex flex-col overflow-hidden" style="background: var(--bg-0)">
  {@render children()}
</div>

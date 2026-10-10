<script lang="ts">
  import Mount from './Mount.svelte';
  import type { ViewerProps } from './types.js';
  let { controller, editable, comments, variations, board, onStateChange, onView,
    class: className, style, ariaLabel = 'Banora viewer' }: ViewerProps = $props();
</script>

<Mount kind="viewer" {controller} options={{ editable, comments, variations, board }}
  {onStateChange} {onView} class={className} {style} {ariaLabel} />

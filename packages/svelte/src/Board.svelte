<script lang="ts">
  import Mount from './Mount.svelte';
  import type { BoardProps } from './types.js';
  let { controller, readOnly, theme, coordinates, moveNumbers, crop, transform, drawing, touch, nodeId,compareTo,referenceGeneration,onPoint, onStateChange, onView,
    class: className, style, ariaLabel = 'Banora board' }: BoardProps = $props();
</script>

<Mount kind="board" {controller} options={{ readOnly, theme, coordinates, moveNumbers, crop, transform, drawing, touch,nodeId,compareTo,referenceGeneration, onPoint }}
  {onStateChange} {onView} class={className} {style} {ariaLabel} />

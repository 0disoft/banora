<script lang="ts">
  import Mount from './Mount.svelte';
  import type { ViewerProps } from './types.js';
  let {
    controller,
    locale,
    messages,
    editable,
    comments,
    variations,
    playback,
    board,
    onStateChange,
    onView,
    class: className,
    style,
    ariaLabel = 'Banora viewer',
  }: ViewerProps = $props();
</script>

<Mount
  kind="viewer"
  {controller}
  options={{ locale, messages, editable, comments, variations, playback, board }}
  {onStateChange}
  {onView}
  class={className}
  {style}
  {ariaLabel}
/>

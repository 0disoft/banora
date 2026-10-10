<script lang="ts">
  import { untrack } from 'svelte';
  import { mountControlledBoard } from '@banora/sdk/controlled-board';
  import type { ControlledBoardView } from '@banora/sdk/controlled-board';
  import type { ControlledBoardProps } from './types.js';
  let {
    state: snapshot,
    onIntent,
    readOnly,
    theme,
    coordinates,
    moveNumbers,
    crop,
    transform,
    drawing,
    touch,
    stoneTextures,
    contextMenu,
    labels,
    onView,
    class: className,
    style,
    ariaLabel = 'Banora controlled board',
  }: ControlledBoardProps = $props();
  let container = $state<HTMLElement>(),
    view = $state.raw<ControlledBoardView | null>(null);
  const options = $derived({
    state: snapshot,
    onIntent,
    readOnly,
    theme,
    coordinates,
    moveNumbers,
    crop,
    transform,
    drawing,
    touch,
    stoneTextures,
    contextMenu,
    labels,
  });
  $effect(() => {
    const target = container;
    if (!target) return;
    const mounted = untrack(() => mountControlledBoard(target, options));
    view = mounted;
    return () => {
      mounted.dispose();
      view = null;
    };
  });
  $effect(() => {
    view?.update(options);
  });
  $effect(() => {
    const callback = onView,
      mounted = view;
    if (mounted) untrack(() => callback?.(mounted));
    return () => untrack(() => callback?.(null));
  });
</script>

<div bind:this={container} class={className} {style} aria-label={ariaLabel}></div>

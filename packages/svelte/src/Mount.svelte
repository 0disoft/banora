<script lang="ts">
  import { untrack } from 'svelte';
  import { mountBoard, mountViewer } from '@0disoft/banora';
  import type {
    BoardOptions,
    BoardView,
    RecordController,
    ViewerOptions,
    ViewerView,
  } from '@0disoft/banora';
  import type { ContainerProps } from './types.js';

  interface Props extends ContainerProps {
    kind: 'board' | 'viewer';
    controller?: RecordController;
    options: BoardOptions | ViewerOptions;
  }
  let {
    kind,
    controller,
    options,
    onStateChange,
    onView,
    class: className,
    style,
    ariaLabel,
  }: Props = $props();
  let container = $state<HTMLElement>();
  let view = $state.raw<BoardView | ViewerView | null>(null);
  $effect(() => {
    const selectedController = controller;
    const mode = kind;
    const target = container;
    if (!target) return;
    const mounted = untrack(() =>
      mode === 'board'
        ? mountBoard(target, { ...(options as BoardOptions), controller: selectedController })
        : mountViewer(target, { ...(options as ViewerOptions), controller: selectedController }),
    );
    const unsubscribe = untrack(() =>
      mounted.controller.subscribe((state) => onStateChange?.(state)),
    );
    view = mounted;
    return () => {
      unsubscribe();
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

import { createElement, useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { mountBoard, mountViewer } from '@banora/sdk';
import type { BoardOptions, BoardView, ControllerState, RecordController, ViewerOptions, ViewerView } from '@banora/sdk';

interface ContainerProps {
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly ariaLabel?: string;
  readonly onStateChange?: (state: ControllerState) => void;
}
export type BoardProps = BoardOptions & ContainerProps;
export type ViewerProps = Omit<ViewerOptions, 'sgf'> & ContainerProps;

function useMount(kind: 'board' | 'viewer', container: RefObject<HTMLDivElement | null>,
  controller: RecordController | undefined, options: BoardOptions | ViewerOptions,
  callback: ContainerProps['onStateChange']) {
  const view = useRef<BoardView | ViewerView | null>(null);
  const onStateChange = useRef(callback);
  useEffect(() => { onStateChange.current = callback; }, [callback]);
  useEffect(() => {
    if (!container.current) return;
    const mounted = kind === 'board' ? mountBoard(container.current, { ...options as BoardOptions, controller }) :
      mountViewer(container.current, { ...options as ViewerOptions, controller });
    view.current = mounted;
    const unsubscribe = mounted.controller.subscribe(state => onStateChange.current?.(state));
    return () => { unsubscribe(); mounted.dispose(); if (view.current === mounted) view.current = null; };
  }, [kind, controller, container]);
  useEffect(() => { view.current?.update(options); }, [options]);
}

export function Board(props: BoardProps) {
  const container = useRef<HTMLDivElement>(null);
  const options = useMemo(() => ({ readOnly: props.readOnly, theme: props.theme, coordinates: props.coordinates,
    moveNumbers: props.moveNumbers, crop: props.crop, onPoint: props.onPoint }),
  [props.readOnly, props.theme, props.coordinates, props.moveNumbers, props.crop, props.onPoint]);
  useMount('board', container, props.controller, options, props.onStateChange);
  return createElement('div', { ref: container, className: props.className, style: props.style, 'aria-label': props.ariaLabel ?? 'Banora board' });
}
export function Viewer(props: ViewerProps) {
  const container = useRef<HTMLDivElement>(null);
  const options = useMemo(() => ({ editable: props.editable, comments: props.comments,
    variations: props.variations, board: props.board }), [props.editable, props.comments, props.variations, props.board]);
  useMount('viewer', container, props.controller, options, props.onStateChange);
  return createElement('div', { ref: container, className: props.className, style: props.style, 'aria-label': props.ariaLabel ?? 'Banora viewer' });
}

/** Supply the same record content on server/client when hydrating state bindings. */
export function useRecordState(controller: RecordController): ControllerState {
  const subscribe = useCallback((notify: () => void) => controller.subscribe(() => notify()), [controller]);
  const snapshot = useCallback(() => controller.getState(), [controller]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

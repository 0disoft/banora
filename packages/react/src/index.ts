import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import type { CSSProperties, RefObject } from 'react';
export { ControlledBoard } from './ControlledBoard.js';
export type { ControlledBoardProps } from './ControlledBoard.js';
import { mountBoard, mountViewer } from '@0disoft/banora';
import type {
  BoardOptions,
  BoardView,
  ControllerState,
  RecordController,
  ViewerOptions,
  ViewerView,
} from '@0disoft/banora';

interface ContainerProps {
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly ariaLabel?: string;
  readonly onStateChange?: (state: ControllerState) => void;
  readonly onView?: (view: BoardView | ViewerView | null) => void;
}
export type BoardProps = BoardOptions & ContainerProps;
export type ViewerProps = Omit<ViewerOptions, 'sgf'> & ContainerProps;

function useMount(
  kind: 'board' | 'viewer',
  container: RefObject<HTMLDivElement | null>,
  controller: RecordController | undefined,
  options: BoardOptions | ViewerOptions,
  callback: ContainerProps['onStateChange'],
  onView: ContainerProps['onView'],
) {
  const view = useRef<BoardView | ViewerView | null>(null);
  const onStateChange = useRef(callback);
  const mountOptions = useRef(options);
  // Commit the latest configuration before mounting, without remounting on updates.
  useEffect(() => {
    mountOptions.current = options;
  }, [options]);
  useEffect(() => {
    onStateChange.current = callback;
  }, [callback]);
  useEffect(() => {
    if (!container.current) return;
    const options = mountOptions.current;
    const mounted =
      kind === 'board'
        ? mountBoard(container.current, { ...(options as BoardOptions), controller })
        : mountViewer(container.current, { ...(options as ViewerOptions), controller });
    view.current = mounted;
    const unsubscribe = mounted.controller.subscribe((state) => onStateChange.current?.(state));
    return () => {
      unsubscribe();
      mounted.dispose();
      if (view.current === mounted) view.current = null;
    };
  }, [kind, controller, container]);
  useEffect(() => {
    view.current?.update(options);
  }, [options]);
  useEffect(() => {
    onView?.(view.current);
    return () => onView?.(null);
  }, [kind, controller, onView]);
}

export function Board(props: BoardProps) {
  const container = useRef<HTMLDivElement>(null);
  const options = useMemo(
    () => ({
      labels: props.labels,
      readOnly: props.readOnly,
      theme: props.theme,
      coordinates: props.coordinates,
      moveNumbers: props.moveNumbers,
      crop: props.crop,
      transform: props.transform,
      drawing: props.drawing,
      touch: props.touch,
      stoneTextures: props.stoneTextures,
      placementAnimation: props.placementAnimation,
      nodeId: props.nodeId,
      compareTo: props.compareTo,
      referenceGeneration: props.referenceGeneration,
      onPoint: props.onPoint,
    }),
    [
      props.labels,
      props.readOnly,
      props.theme,
      props.coordinates,
      props.moveNumbers,
      props.crop,
      props.transform,
      props.drawing,
      props.touch,
      props.stoneTextures,
      props.placementAnimation,
      props.nodeId,
      props.compareTo,
      props.referenceGeneration,
      props.onPoint,
    ],
  );
  useMount('board', container, props.controller, options, props.onStateChange, props.onView);
  // oxlint-disable-next-line react/refs -- createElement forwards the ref object; render never reads current.
  return createElement('div', {
    ref: container,
    className: props.className,
    style: props.style,
    'aria-label': props.ariaLabel ?? 'Banora board',
  });
}
export function Viewer(props: ViewerProps) {
  const container = useRef<HTMLDivElement>(null);
  const options = useMemo(
    () => ({
      locale: props.locale,
      messages: props.messages,
      editable: props.editable,
      comments: props.comments,
      variations: props.variations,
      playback: props.playback,
      board: props.board,
    }),
    [
      props.locale,
      props.messages,
      props.editable,
      props.comments,
      props.variations,
      props.playback,
      props.board,
    ],
  );
  useMount('viewer', container, props.controller, options, props.onStateChange, props.onView);
  // oxlint-disable-next-line react/refs -- createElement forwards the ref object; render never reads current.
  return createElement('div', {
    ref: container,
    className: props.className,
    style: props.style,
    'aria-label': props.ariaLabel ?? 'Banora viewer',
  });
}

/** Supply the same record content on server/client when hydrating state bindings. */
export function useRecordState(controller: RecordController): ControllerState {
  const subscribe = useCallback(
    (notify: () => void) => controller.subscribe(() => notify()),
    [controller],
  );
  const snapshot = useCallback(() => controller.getState(), [controller]);
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

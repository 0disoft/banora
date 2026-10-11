import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  readonly,
  shallowRef,
  toRaw,
  toValue,
  watch,
} from 'vue';
import type { MaybeRefOrGetter, PropType, UnwrapRef } from 'vue';
export { ControlledBoard } from './ControlledBoard.js';
export type { ControlledBoardProps } from './ControlledBoard.js';
import { mountBoard, mountViewer } from '@banora/sdk';
import type {
  BoardCrop,
  BoardOptions,
  BoardTransform,
  BoardView,
  ControllerState,
  Point,
  RecordController,
  ViewerOptions,
  ViewerView,
} from '@banora/sdk';

export type ControllerHandle = RecordController | UnwrapRef<RecordController>;
const rawController = (value: ControllerHandle) => toRaw(value) as RecordController;
const placementDuration = (value: BoardOptions['placementAnimation']) =>
  typeof value === 'object' ? value?.durationMs : undefined;
const common = { controller: Object as PropType<ControllerHandle> };
const boardProps = {
  ...common,
  labels: Object as PropType<BoardOptions['labels']>,
  readOnly: Boolean,
  theme: { type: String as PropType<'wood' | 'flat'>, default: 'wood' },
  coordinates: { type: Boolean, default: true },
  moveNumbers: Boolean,
  crop: Object as PropType<BoardCrop | null>,
  onPoint: Function as PropType<(point: Point) => void>,
  transform: Object as PropType<BoardTransform>,
  drawing: Object as PropType<BoardOptions['drawing']>,
  touch: Object as PropType<BoardOptions['touch']>,
  stoneTextures: Object as PropType<BoardOptions['stoneTextures']>,
  placementAnimation: {
    type: [Boolean, Object] as PropType<BoardOptions['placementAnimation']>,
    default: false,
  },
  nodeId: String as PropType<BoardOptions['nodeId']>,
  compareTo: String as PropType<BoardOptions['compareTo']>,
  referenceGeneration: Number,
};
const viewerProps = {
  ...common,
  locale: String as PropType<ViewerOptions['locale']>,
  messages: Object as PropType<ViewerOptions['messages']>,
  editable: Boolean,
  comments: { type: Boolean, default: true },
  variations: { type: Boolean, default: true },
  playback: Object as PropType<ViewerOptions['playback']>,
  board: Object as PropType<ViewerOptions['board']>,
};
const emits = {
  stateChange: (_state: ControllerState) => true,
  view: (_view: BoardView | ViewerView | null) => true,
};

export const Board = defineComponent({
  name: 'BanoraBoard',
  inheritAttrs: false,
  props: boardProps,
  emits,
  setup(props, { attrs, emit }) {
    const container = shallowRef<HTMLElement>();
    let view: BoardView | undefined;
    let unsubscribe: (() => void) | undefined;
    const options = (): Omit<BoardOptions, 'controller'> => ({
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
    });
    const mount = () => {
      if (view) emit('view', null);
      unsubscribe?.();
      view?.dispose();
      if (!container.value) return;
      view = mountBoard(container.value, {
        ...options(),
        controller: props.controller ? rawController(props.controller) : undefined,
      });
      unsubscribe = view.controller.subscribe((state) => emit('stateChange', state));
      emit('view', view);
    };
    onMounted(mount);
    watch(() => toRaw(props.controller), mount, { flush: 'post' });
    watch(
      () => [
        props.labels,
        props.readOnly,
        props.theme,
        props.coordinates,
        props.moveNumbers,
        props.crop?.x,
        props.crop?.y,
        props.crop?.width,
        props.crop?.height,
        props.transform?.rotation,
        props.transform?.flipX,
        props.drawing,
        props.drawing?.color,
        props.drawing?.width,
        props.touch,
        props.touch?.mode,
        props.touch?.magnifier,
        props.stoneTextures,
        props.stoneTextures?.black,
        props.stoneTextures?.white,
        props.stoneTextures?.black?.dataUrl,
        props.stoneTextures?.white?.dataUrl,
        props.placementAnimation,
        placementDuration(props.placementAnimation),
        props.nodeId,
        props.compareTo,
        props.referenceGeneration,
        props.onPoint,
      ],
      () => view?.update(options()),
      { flush: 'post' },
    );
    onBeforeUnmount(() => {
      unsubscribe?.();
      view?.dispose();
      emit('view', null);
    });
    return () =>
      h('div', { ...attrs, ref: container, 'aria-label': attrs['aria-label'] ?? 'Banora board' });
  },
});
export const Viewer = defineComponent({
  name: 'BanoraViewer',
  inheritAttrs: false,
  props: viewerProps,
  emits,
  setup(props, { attrs, emit }) {
    const container = shallowRef<HTMLElement>();
    let view: ViewerView | undefined;
    let unsubscribe: (() => void) | undefined;
    const options = (): Omit<ViewerOptions, 'controller' | 'sgf'> => ({
      locale: props.locale,
      messages: props.messages,
      editable: props.editable,
      comments: props.comments,
      variations: props.variations,
      playback: props.playback,
      board: props.board,
    });
    const mount = () => {
      if (view) emit('view', null);
      unsubscribe?.();
      view?.dispose();
      if (!container.value) return;
      view = mountViewer(container.value, {
        ...options(),
        controller: props.controller ? rawController(props.controller) : undefined,
      });
      unsubscribe = view.controller.subscribe((state) => emit('stateChange', state));
      emit('view', view);
    };
    onMounted(mount);
    watch(() => toRaw(props.controller), mount, { flush: 'post' });
    watch(
      () => [
        props.locale,
        props.messages,
        props.editable,
        props.comments,
        props.variations,
        props.playback,
        props.playback?.intervalMs,
        props.board?.coordinates,
        props.board?.theme,
        props.board?.moveNumbers,
        props.board?.crop?.x,
        props.board?.crop?.y,
        props.board?.crop?.width,
        props.board?.crop?.height,
        props.board?.transform?.rotation,
        props.board?.transform?.flipX,
        props.board?.drawing,
        props.board?.drawing?.color,
        props.board?.drawing?.width,
        props.board?.stoneTextures,
        props.board?.stoneTextures?.black,
        props.board?.stoneTextures?.white,
        props.board?.stoneTextures?.black?.dataUrl,
        props.board?.stoneTextures?.white?.dataUrl,
        props.board?.placementAnimation,
        placementDuration(props.board?.placementAnimation),
        props.board?.touch,
        props.board?.touch?.mode,
        props.board?.touch?.magnifier,
        props.board?.compareTo,
        props.board?.referenceGeneration,
        props.board?.onPoint,
      ],
      () => view?.update(options()),
      { flush: 'post' },
    );
    onBeforeUnmount(() => {
      unsubscribe?.();
      view?.dispose();
      emit('view', null);
    });
    return () =>
      h('div', { ...attrs, ref: container, 'aria-label': attrs['aria-label'] ?? 'Banora viewer' });
  },
});

/** Use inside setup; toRaw also accepts controllers placed in ordinary Vue refs. */
export function useRecordState(source: MaybeRefOrGetter<ControllerHandle>) {
  const state = shallowRef<ControllerState>(rawController(toValue(source)).getState());
  let mounted = false;
  let unsubscribe: (() => void) | undefined;
  const connect = () => {
    unsubscribe?.();
    const controller = rawController(toValue(source));
    state.value = controller.getState();
    if (mounted)
      unsubscribe = controller.subscribe((snapshot) => {
        state.value = snapshot;
      });
  };
  watch(() => toRaw(toValue(source)), connect, { flush: 'sync' });
  onMounted(() => {
    mounted = true;
    connect();
  });
  onBeforeUnmount(() => {
    mounted = false;
    unsubscribe?.();
  });
  return readonly(state);
}

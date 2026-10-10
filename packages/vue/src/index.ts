import { defineComponent, h, onBeforeUnmount, onMounted, readonly, shallowRef, toRaw, toValue, watch } from 'vue';
import type { MaybeRefOrGetter, PropType, UnwrapRef } from 'vue';
import { mountBoard, mountViewer } from '@banora/sdk';
import type { BoardCrop, BoardOptions, BoardTransform, BoardView, ControllerState, Point, RecordController, ViewerOptions, ViewerView } from '@banora/sdk';

export type ControllerHandle = RecordController | UnwrapRef<RecordController>;
const rawController = (value: ControllerHandle) => toRaw(value) as RecordController;
const common = { controller: Object as PropType<ControllerHandle> };
const boardProps = {
  ...common, readOnly: Boolean, theme: { type: String as PropType<'wood' | 'flat'>, default: 'wood' },
  coordinates: { type: Boolean, default: true }, moveNumbers: Boolean,
  crop: Object as PropType<BoardCrop | null>, onPoint: Function as PropType<(point: Point) => void>,
  transform: Object as PropType<BoardTransform>,
  drawing: Object as PropType<BoardOptions['drawing']>,
};
const viewerProps = { ...common, editable: Boolean, comments: { type: Boolean, default: true },
  variations: { type: Boolean, default: true }, board: Object as PropType<ViewerOptions['board']> };
const emits = { stateChange: (_state: ControllerState) => true, view: (_view: BoardView | ViewerView | null) => true };

export const Board = defineComponent({
  name: 'BanoraBoard', inheritAttrs: false, props: boardProps, emits,
  setup(props, { attrs, emit }) {
    const container = shallowRef<HTMLElement>();
    let view: BoardView | undefined;
    let unsubscribe: (() => void) | undefined;
    const options = (): Omit<BoardOptions, 'controller'> => ({ readOnly: props.readOnly, theme: props.theme,
      coordinates: props.coordinates, moveNumbers: props.moveNumbers, crop: props.crop, transform: props.transform, drawing: props.drawing, onPoint: props.onPoint });
    const mount = () => {
      if (view) emit('view',null);
      unsubscribe?.(); view?.dispose();
      if (!container.value) return;
      view = mountBoard(container.value, { ...options(), controller: props.controller ? rawController(props.controller) : undefined });
      unsubscribe = view.controller.subscribe(state => emit('stateChange', state));
      emit('view',view);
    };
    onMounted(mount);
    watch(() => toRaw(props.controller), mount, { flush: 'post' });
    watch(() => [props.readOnly, props.theme, props.coordinates, props.moveNumbers,
      props.crop?.x, props.crop?.y, props.crop?.width, props.crop?.height, props.transform?.rotation, props.transform?.flipX, props.drawing, props.drawing?.color, props.drawing?.width, props.onPoint],
    () => view?.update(options()), { flush: 'post' });
    onBeforeUnmount(() => { unsubscribe?.(); view?.dispose(); emit('view',null); });
    return () => h('div', { ...attrs, ref: container, 'aria-label': attrs['aria-label'] ?? 'Banora board' });
  },
});
export const Viewer = defineComponent({
  name: 'BanoraViewer', inheritAttrs: false, props: viewerProps, emits,
  setup(props, { attrs, emit }) {
    const container = shallowRef<HTMLElement>();
    let view: ViewerView | undefined;
    let unsubscribe: (() => void) | undefined;
    const options = (): Omit<ViewerOptions, 'controller' | 'sgf'> => ({ editable: props.editable,
      comments: props.comments, variations: props.variations, board: props.board });
    const mount = () => {
      if (view) emit('view',null);
      unsubscribe?.(); view?.dispose();
      if (!container.value) return;
      view = mountViewer(container.value, { ...options(), controller: props.controller ? rawController(props.controller) : undefined });
      unsubscribe = view.controller.subscribe(state => emit('stateChange', state));
      emit('view',view);
    };
    onMounted(mount);
    watch(() => toRaw(props.controller), mount, { flush: 'post' });
    watch(() => [props.editable, props.comments, props.variations, props.board?.coordinates,
      props.board?.theme, props.board?.moveNumbers, props.board?.crop?.x, props.board?.crop?.y,
      props.board?.crop?.width, props.board?.crop?.height, props.board?.transform?.rotation, props.board?.transform?.flipX,
      props.board?.drawing, props.board?.drawing?.color, props.board?.drawing?.width, props.board?.onPoint],
    () => view?.update(options()), { flush: 'post' });
    onBeforeUnmount(() => { unsubscribe?.(); view?.dispose(); emit('view',null); });
    return () => h('div', { ...attrs, ref: container, 'aria-label': attrs['aria-label'] ?? 'Banora viewer' });
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
    if (mounted) unsubscribe = controller.subscribe(snapshot => { state.value = snapshot; });
  };
  watch(() => toRaw(toValue(source)), connect, { flush: 'sync' });
  onMounted(() => { mounted = true; connect(); });
  onBeforeUnmount(() => { mounted = false; unsubscribe?.(); });
  return readonly(state);
}

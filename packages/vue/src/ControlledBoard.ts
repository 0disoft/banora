import { defineComponent, h, onBeforeUnmount, onMounted, shallowRef, watch } from 'vue';
import type { PropType } from 'vue';
import { mountControlledBoard } from '@0disoft/banora/controlled-board';
import type { ControlledBoardOptions, ControlledBoardView } from '@0disoft/banora/controlled-board';
import type { BoardSnapshot, BoardIntent } from '@0disoft/banora/board-state';

export const ControlledBoard = defineComponent({
  name: 'BanoraControlledBoard',
  inheritAttrs: false,
  props: {
    state: { type: Object as PropType<BoardSnapshot>, required: true },
    onIntent: Function as PropType<(intent: BoardIntent) => void>,
    readOnly: Boolean,
    theme: { type: String as PropType<ControlledBoardOptions['theme']>, default: 'wood' },
    coordinates: { type: Boolean, default: true },
    moveNumbers: Boolean,
    contextMenu: Boolean,
    crop: Object as PropType<ControlledBoardOptions['crop']>,
    transform: Object as PropType<ControlledBoardOptions['transform']>,
    drawing: Object as PropType<ControlledBoardOptions['drawing']>,
    touch: Object as PropType<ControlledBoardOptions['touch']>,
    stoneTextures: Object as PropType<ControlledBoardOptions['stoneTextures']>,
    labels: Object as PropType<ControlledBoardOptions['labels']>,
  },
  emits: {
    intent: (_intent: BoardIntent) => true,
    view: (_view: ControlledBoardView | null) => true,
  },
  setup(props, { attrs, emit }) {
    const container = shallowRef<HTMLElement>();
    let view: ControlledBoardView | undefined, stop: (() => void) | undefined;
    const options = (): ControlledBoardOptions => ({
      state: props.state,
      readOnly: props.readOnly,
      onIntent: props.onIntent ? (intent) => emit('intent', intent) : undefined,
      theme: props.theme,
      coordinates: props.coordinates,
      moveNumbers: props.moveNumbers,
      contextMenu: props.contextMenu,
      crop: props.crop,
      transform: props.transform,
      drawing: props.drawing,
      touch: props.touch,
      stoneTextures: props.stoneTextures,
      labels: props.labels,
    });
    onMounted(() => {
      if (!container.value) return;
      view = mountControlledBoard(container.value, options());
      stop = watch(options, (value) => view?.update(value), { deep: true });
      emit('view', view);
    });
    onBeforeUnmount(() => {
      stop?.();
      view?.dispose();
      emit('view', null);
      view = undefined;
    });
    return () => h('div', { ref: container, 'aria-label': 'Banora controlled board', ...attrs });
  },
});
export type ControlledBoardProps = InstanceType<typeof ControlledBoard>['$props'];

import type { ControllerState } from './controller.js';
import { getVariationRows, variationPathKey } from './variations.js';
import type { VariationRow } from './variations.js';

interface TreeState {
  record: ControllerState['record'];
  generation: number;
  game: number;
  focused: boolean;
  presentationScope: unknown;
  selected: string;
  branches: string;
  outlineIds: ReadonlySet<string>;
  presentation: string;
  tailPresentation: string | undefined;
  truncated: boolean;
}

interface TreeProjection<Row> {
  readonly previousSelection: string | undefined;
  readonly reusedWindow: boolean;
  readonly sameRows: boolean;
  readonly rows: readonly Row[] | undefined;
  readonly tail: Row | undefined;
  readonly truncated: boolean;
}

/** Tracks a variation window and the row presentation used by one tree view. */
export function createVariationTreeModel() {
  let last: TreeState | undefined;
  return {
    update<Row>(
      state: ControllerState,
      options: {
        focused: boolean;
        presentationScope: unknown;
        describe: (row: VariationRow) => Row;
      },
    ): TreeProjection<Row> | undefined {
      const { focused, presentationScope, describe } = options;
      const previous = last;
      const selected = state.node.id;
      const branches = focused ? variationPathKey(state) : '';
      const sameScope =
        previous?.generation === state.recordGeneration &&
        previous.game === state.gameIndex &&
        previous.presentationScope === presentationScope &&
        previous.focused === focused;
      const reusable =
        sameScope &&
        previous.record === state.record &&
        previous.branches === branches &&
        previous.outlineIds.has(selected)
          ? previous
          : undefined;
      if (reusable?.selected === selected) return undefined;

      let rows: Row[] | undefined;
      let outlineIds: ReadonlySet<string>;
      let presentation: string;
      let truncated: boolean;
      if (reusable) {
        ({ outlineIds, presentation, truncated } = reusable);
      } else {
        const outline = getVariationRows(state, focused);
        rows = outline.rows.map(describe);
        outlineIds = new Set(outline.rows.map((row) => row.node.id));
        truncated = outline.truncated;
        presentation = JSON.stringify([rows, truncated]);
      }

      const tail = outlineIds.has(selected)
        ? undefined
        : describe({
            node: state.node,
            depth: state.path.length - 1,
            indent: 0,
            moveNumber: state.position.moveNumber,
            branch: false,
            collapsed: false,
          });
      const tailPresentation = JSON.stringify(tail);
      last = {
        record: state.record,
        generation: state.recordGeneration,
        game: state.gameIndex,
        focused,
        presentationScope,
        selected,
        branches,
        outlineIds,
        presentation,
        tailPresentation,
        truncated,
      };
      const sameRows = sameScope && previous.presentation === presentation;
      if (
        sameRows &&
        previous.selected === selected &&
        previous.tailPresentation === tailPresentation
      )
        return undefined;
      return {
        previousSelection: previous?.selected,
        reusedWindow: reusable !== undefined,
        sameRows,
        rows,
        tail,
        truncated,
      };
    },
    reset(): void {
      last = undefined;
    },
  };
}

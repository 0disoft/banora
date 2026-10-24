import type { SgfNode, SgfRecord } from './sgf.js';
import { pointFromSgf, sgfBoardSize } from './sgf.js';
import { boardColumnLabel } from './board-layout.js';
import { formatUiMessage } from './locale.js';
import type { UiMessages } from './locale.js';

const rowLimit = 500;

/** Project the bounded selector without replaying unselected board positions. */
export function comparisonRows(record: SgfRecord, ui: Required<UiMessages>) {
  const rows: { id: string; label: string }[] = [];
  for (let game = 0; game < record.games.length; game++) {
    if (rows.length === rowLimit) return { rows, truncated: true };
    const root = record.games[game]!;
    const { width, height } = sgfBoardSize(root);
    const stack: { nodes: readonly SgfNode[]; index: number; depth: number }[] = [
      { nodes: [root], index: 0, depth: 0 },
    ];
    while (stack.length) {
      const frame = stack.at(-1)!;
      if (frame.index === frame.nodes.length) {
        stack.pop();
        continue;
      }
      if (rows.length === rowLimit) return { rows, truncated: true };
      const node = frame.nodes[frame.index++]!;
      let caption = node.properties.N?.[0] ?? ui.annotation;
      const move = node.properties.B?.[0] ?? node.properties.W?.[0];
      if (node.properties.N === undefined && move !== undefined) {
        const color = node.properties.B ? ui.black : ui.white;
        // SGF tt is the legacy pass encoding on boards up to 19 lines.
        if (!move || (move === 'tt' && width <= 19 && height <= 19))
          caption = formatUiMessage(ui.colorPass, { color });
        else {
          const point = pointFromSgf(move, width, height);
          caption = `${color} ${boardColumnLabel(point.x)}${height - point.y}`;
        }
      }
      rows.push({
        id: node.id,
        label: formatUiMessage(ui.comparisonRow, {
          game: formatUiMessage(ui.game, { number: game + 1 }),
          position:
            frame.depth === 0
              ? ui.start
              : formatUiMessage(ui.comparisonNode, { number: frame.depth }),
          caption,
        }),
      });
      if (node.children.length)
        stack.push({ nodes: node.children, index: 0, depth: frame.depth + 1 });
    }
  }
  return { rows, truncated: false };
}

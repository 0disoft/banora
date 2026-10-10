import { BOARD_PADDING } from './board-layout.js';
import { displayCrop, toDisplayPoint } from './geometry.js';
import type { BoardCrop, BoardTransform } from './geometry.js';
import type { Position } from './core.js';
import type { AnalysisResult } from './analysis-types.js';
const namespace = 'http://www.w3.org/2000/svg';
export function drawAnalysisOverlay(
  svg: SVGSVGElement,
  position: Position,
  result: AnalysisResult | null,
  config: {
    crop?: BoardCrop | null;
    transform?: BoardTransform;
    ownership: boolean;
    selectedRank: number | null;
  },
): void {
  const crop = config.crop ?? { x: 0, y: 0, width: position.width, height: position.height },
    shown = displayCrop(crop, position, config.transform),
    document = svg.ownerDocument;
  svg.setAttribute(
    'viewBox',
    `${shown.x} ${shown.y} ${shown.width - 1 + BOARD_PADDING * 2} ${shown.height - 1 + BOARD_PADDING * 2}`,
  );
  const fragment = document.createDocumentFragment(),
    visible = (x: number, y: number) =>
      x >= crop.x && y >= crop.y && x < crop.x + crop.width && y < crop.y + crop.height;
  const element = (name: string, attributes: Record<string, string | number>, text?: string) => {
    const node = document.createElementNS(namespace, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    if (text !== undefined) node.textContent = text;
    return node;
  };
  if (result) {
    if (config.ownership && result.ownership)
      for (let index = 0; index < result.ownership.length; index++) {
        const x = index % position.width,
          y = Math.floor(index / position.width),
          value = result.ownership[index]!;
        if (!visible(x, y) || value === 0) continue;
        const point = toDisplayPoint({ x, y }, position, config.transform);
        fragment.append(
          element('rect', {
            x: point.x + BOARD_PADDING - 0.44,
            y: point.y + BOARD_PADDING - 0.44,
            width: 0.88,
            height: 0.88,
            rx: 0.08,
            fill: value > 0 ? '#176fb0' : '#c65b17',
            opacity: Math.abs(value) * 0.32,
            'data-analysis-ownership': `${x},${y}`,
            'data-ownership-value': value,
          }),
        );
      }
    for (const candidate of result.candidates) {
      const move = candidate.move;
      if (!move || !visible(move.x, move.y)) continue;
      const point = toDisplayPoint(move, position, config.transform),
        x = point.x + BOARD_PADDING,
        y = point.y + BOARD_PADDING;
      const group = element('g', {
        'data-analysis-candidate': `${move.x},${move.y}`,
        'data-analysis-rank': candidate.rank,
      });
      group.append(
        element('circle', {
          cx: x,
          cy: y,
          r: 0.31,
          fill: candidate.rank === config.selectedRank ? '#254f42' : '#f7fbf5',
          stroke: '#254f42',
          'stroke-width': 0.055,
        }),
        element(
          'text',
          {
            x,
            y: y + 0.1,
            'text-anchor': 'middle',
            'font-family': 'system-ui',
            'font-size': 0.29,
            'font-weight': 650,
            fill: candidate.rank === config.selectedRank ? '#fff' : '#254f42',
          },
          String(candidate.rank + 1),
        ),
      );
      fragment.append(group);
    }
  }
  svg.replaceChildren(fragment);
}

import type { Point, Position } from './core.js';
import type { Marker, Connection } from './controller.js';
import type { Stroke } from './annotations.js';
import type { BoardOverlay } from './board-state.js';
import type { BoardCrop, BoardTransform } from './geometry.js';
import type { StoneTextures } from './stone-textures.js';
import { displayCrop, normalizeBoardTransform } from './geometry.js';
import { BOARD_PADDING as padding, boardColumnLabel as columnLabel } from './board-layout.js';
import { paintBoardOverlays } from './board-overlays.js';

export type BoardPrimitiveSink = (
  name: string,
  attrs: Record<string, string | number>,
  text?: string,
) => void;
export interface BoardContentContext {
  readonly state: {
    readonly position: Pick<Position, 'width' | 'height' | 'board'>;
    readonly numbers: () => ReadonlyMap<number, number>;
    readonly lastMove: Point | null;
    readonly markers: readonly Marker[];
    readonly connections: readonly Connection[];
    readonly strokes: readonly Stroke[];
    readonly overlays: readonly BoardOverlay[];
    readonly dimPoints: ReadonlySet<number>;
  };
  readonly options: {
    readonly theme?: 'wood' | 'flat';
    readonly coordinates?: boolean;
    readonly moveNumbers?: boolean;
    readonly transform?: BoardTransform;
    readonly stoneTextures: Readonly<Required<StoneTextures>>;
  };
  readonly crop: BoardCrop;
  readonly textureId: string;
  readonly displayPoint: (point: Point) => Point;
  readonly visible: (point: Point) => boolean;
}
/** Shared vector primitives: no document, I/O, event handlers or global state. */
export function paintBoardContent(context: BoardContentContext, add: BoardPrimitiveSink): void {
  const { state, options, crop, textureId, displayPoint, visible } = context;
  const { width, height, board } = state.position;
  const displayedCrop = displayCrop(
    crop,
    state.position,
    normalizeBoardTransform(options.transform),
  );
  add('rect', {
    x: displayedCrop.x,
    y: displayedCrop.y,
    width: displayedCrop.width - 1 + padding * 2,
    height: displayedCrop.height - 1 + padding * 2,
    'data-board-surface': '',
    fill: `var(--banora-board,${options.theme === 'flat' ? '#e8e1ce' : '#d9b677'})`,
  });
  const gridLine = (start: Point, end: Point) => {
    const a = displayPoint(start),
      b = displayPoint(end);
    add('line', {
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      stroke: 'var(--banora-grid,#53472e)',
      'stroke-width': 0.027,
    });
  };
  for (let x = 0; x < width; x++) gridLine({ x, y: 0 }, { x, y: height - 1 });
  for (let y = 0; y < height; y++) gridLine({ x: 0, y }, { x: width - 1, y });
  if (width === height && [9, 13, 19].includes(width)) {
    const edge = width === 9 ? 2 : 3;
    const points = [edge, Math.floor(width / 2), width - 1 - edge];
    for (const x of points)
      for (const y of points) {
        if (width !== 19 && (x === points[1]) !== (y === points[1])) continue;
        const point = displayPoint({ x, y });
        add('circle', { cx: point.x, cy: point.y, r: 0.075, fill: 'var(--banora-grid,#53472e)' });
      }
  }
  if (options.coordinates !== false) {
    for (let x = crop.x; x < crop.x + crop.width; x++) {
      for (const y of [crop.y - 0.75, crop.y + crop.height - 1 + 0.75]) {
        const point = displayPoint({ x, y });
        add(
          'text',
          {
            x: point.x,
            y: point.y + 0.09,
            'text-anchor': 'middle',
            'font-size': 0.27,
            'data-coordinate': '',
            fill: 'var(--banora-grid,#53472e)',
            'font-family': 'system-ui',
          },
          columnLabel(x),
        );
      }
    }
    for (let y = crop.y; y < crop.y + crop.height; y++) {
      for (const x of [crop.x - 0.75, crop.x + crop.width - 1 + 0.75]) {
        const point = displayPoint({ x, y });
        add(
          'text',
          {
            x: point.x,
            y: point.y + 0.09,
            'text-anchor': 'middle',
            'font-size': 0.27,
            'data-coordinate': '',
            fill: 'var(--banora-grid,#53472e)',
            'font-family': 'system-ui',
          },
          String(height - y),
        );
      }
    }
  }
  paintBoardOverlays(state.overlays, true, add, displayPoint, visible);
  const numbers = options.moveNumbers ? state.numbers() : new Map<number, number>();
  for (let y = crop.y; y < crop.y + crop.height; y++)
    for (let x = crop.x; x < crop.x + crop.width; x++) {
      const color = board[y * width + x];
      if (!color) continue;
      const point = displayPoint({ x, y });
      add('circle', {
        cx: point.x,
        cy: point.y,
        r: 0.46,
        fill: options.stoneTextures[color]
          ? `url(#${textureId}-${color})`
          : `var(--banora-${color},${color === 'black' ? '#20272a' : '#fbfaf4'})`,
        stroke: color === 'black' ? '#101618' : '#716957',
        'stroke-width': 0.023,
        'data-stone': `${x},${y}`,
        ...(options.stoneTextures[color] ? { 'data-texture': color } : {}),
      });
      if (numbers.has(y * width + x))
        add(
          'text',
          {
            x: point.x,
            y: point.y + 0.13,
            'text-anchor': 'middle',
            'font-size': 0.34,
            fill: color === 'black' ? '#fff' : '#20272a',
            'font-family': 'system-ui',
            'data-move-number': numbers.get(y * width + x)!,
          },
          String(numbers.get(y * width + x)),
        );
    }
  if (!options.moveNumbers) {
    const point = state.lastMove;
    if (point) {
      const shown = displayPoint(point);
      if (board[point.y * width + point.x])
        add('circle', {
          cx: shown.x,
          cy: shown.y,
          r: 0.12,
          fill: board[point.y * width + point.x] === 'black' ? '#f9e7a6' : '#275c4b',
        });
    }
  }
  for (const connection of state.connections) {
    const from = displayPoint(connection.from);
    const to = displayPoint(connection.to);
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const ux = (to.x - from.x) / distance,
      uy = (to.y - from.y) / distance;
    const end = connection.kind === 'arrow' ? { x: to.x - ux * 0.25, y: to.y - uy * 0.25 } : to;
    const points = { x1: from.x, y1: from.y, x2: end.x, y2: end.y, 'stroke-linecap': 'round' };
    add('line', { ...points, stroke: '#fffcf0', 'stroke-width': 0.17 });
    add('line', {
      ...points,
      stroke: 'var(--banora-annotation,#206650)',
      'stroke-width': 0.09,
      'data-connection': connection.kind,
      'data-from': `${connection.from.x},${connection.from.y}`,
      'data-to': `${connection.to.x},${connection.to.y}`,
    });
    if (connection.kind === 'arrow')
      add('polygon', {
        points: `${to.x},${to.y} ${to.x - ux * 0.4 - uy * 0.2},${to.y - uy * 0.4 + ux * 0.2} ${to.x - ux * 0.4 + uy * 0.2},${to.y - uy * 0.4 - ux * 0.2}`,
        fill: 'var(--banora-annotation,#206650)',
        stroke: '#fffcf0',
        'stroke-width': 0.03,
      });
  }
  for (const marker of state.markers) {
    if (!visible(marker.point)) continue;
    const { x, y } = displayPoint(marker.point);
    const ink = board[marker.point.y * width + marker.point.x] === 'black' ? '#fff2bd' : '#214e41';
    const attributes = {
      fill: 'none',
      stroke: ink,
      'stroke-width': 0.06,
      'data-marker': `${marker.point.x},${marker.point.y}`,
    };
    if (marker.kind === 'circle') add('circle', { ...attributes, cx: x, cy: y, r: 0.27 });
    if (marker.kind === 'square')
      add('rect', { ...attributes, x: x - 0.24, y: y - 0.24, width: 0.48, height: 0.48 });
    if (marker.kind === 'triangle')
      add('path', {
        ...attributes,
        d: `M ${x} ${y - 0.29} L ${x + 0.29} ${y + 0.24} L ${x - 0.29} ${y + 0.24} Z`,
      });
    if (marker.kind === 'cross')
      add('path', {
        ...attributes,
        d: `M ${x - 0.24} ${y - 0.24} L ${x + 0.24} ${y + 0.24} M ${x + 0.24} ${y - 0.24} L ${x - 0.24} ${y + 0.24}`,
      });
    if (marker.kind === 'label')
      add(
        'text',
        {
          x,
          y: y + 0.14,
          'text-anchor': 'middle',
          'font-size': 0.4,
          fill: ink,
          'font-family': 'system-ui',
          'font-weight': 650,
          'data-marker': `${marker.point.x},${marker.point.y}`,
        },
        marker.label,
      );
  }
  for (const stroke of state.strokes)
    add('polyline', {
      points: stroke.points
        .map((point) => {
          const shown = displayPoint(point);
          return `${shown.x},${shown.y}`;
        })
        .join(' '),
      fill: 'none',
      stroke: stroke.color,
      'stroke-width': stroke.width,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'data-stroke': stroke.id,
    });
  paintBoardOverlays(state.overlays, false, add, displayPoint, visible);
}

export function paintBoardDimming(context: BoardContentContext, add: BoardPrimitiveSink): void {
  const { state, displayPoint, visible } = context;
  const { width } = state.position;
  for (const index of state.dimPoints) {
    const point = { x: index % width, y: Math.floor(index / width) };
    if (!visible(point)) continue;
    const at = displayPoint(point);
    add('rect', {
      x: at.x - 0.5,
      y: at.y - 0.5,
      width: 1,
      height: 1,
      fill: '#eeeeee',
      opacity: 0.55,
      'data-dim': `${point.x},${point.y}`,
    });
  }
}

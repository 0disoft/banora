import { paintBoardOverlays } from './board-overlays.js';
import { variationCandidates } from './variations.js';
import type { Point } from './core.js';
import type { BoardCrop } from './geometry.js';
import { displayCrop, normalizeBoardTransform } from './geometry.js';
import { BOARD_PADDING as padding, boardColumnLabel as columnLabel } from './board-layout.js';
import type { BoardFrame } from './board-frame.js';
import { frameDifferences, boardMessage } from './board-frame.js';
import { boardNotices } from './board-notices.js';
import type { StrokeStyle } from './annotations.js';
import type { BoardOptions } from './board-types.js';
import type { StoneTextures } from './stone-textures.js';
interface PaintContext {
  document: Document;
  svg: SVGSVGElement;
  state: BoardFrame;
  options: Omit<BoardOptions, 'controller' | 'drawing'> & {
    stoneTextures: Readonly<Required<StoneTextures>>;
    drawing?: Readonly<Required<StrokeStyle>> | null;
  };
  crop: BoardCrop;
  textureId: string;
  focus: Point;
  hover: Point | null;
  pendingStroke: { points: Point[] } | null;
  touchAim: { point: Point | null } | null;
  reference: BoardFrame | null;
  element: (
    name: string,
    attributes?: Record<string, string | number>,
    text?: string,
  ) => SVGElement;
  displayPoint: (point: Point) => Point;
  visible: (point: Point) => boolean;
  coordinate: (point: Point) => string;
  readOnly: () => boolean;
}
/** Mouse hover owns only this transient layer, preserving the board and stone elements. */
export function paintBoardHover(
  layer: SVGElement,
  context: Pick<
    PaintContext,
    'state' | 'hover' | 'visible' | 'readOnly' | 'options' | 'displayPoint' | 'element'
  >,
): void {
  const { state, hover, visible, readOnly, options, displayPoint, element } = context;
  layer.replaceChildren();
  layer.removeAttribute('data-preview');
  if (
    !hover ||
    !visible(hover) ||
    state.position.board[hover.y * state.position.width + hover.x] ||
    readOnly() ||
    options.drawing
  )
    return;
  const point = displayPoint(hover);
  layer.setAttribute('data-preview', 'hover');
  layer.append(
    element('circle', {
      cx: point.x,
      cy: point.y,
      r: 0.44,
      fill: state.position.toPlay === 'black' ? '#20272a' : '#fff',
      opacity: 0.4,
      'data-preview': '',
    }),
  );
}
export function paintBoard(context: PaintContext): SVGElement {
  const {
    document,
    svg,
    state,
    options,
    crop,
    textureId,
    focus,
    pendingStroke,
    touchAim,
    reference,
    element,
    displayPoint,
    visible,
    coordinate,
  } = context;
  const { width, height, board } = state.position;
  const displayedCrop = displayCrop(
    crop,
    state.position,
    normalizeBoardTransform(options.transform),
  );
  const fragment = document.createDocumentFragment();
  const defs = element('defs');
  for (const color of ['black', 'white'] as const) {
    const texture = options.stoneTextures[color];
    if (!texture) continue;
    const pattern = element('pattern', {
      id: `${textureId}-${color}`,
      patternUnits: 'objectBoundingBox',
      patternContentUnits: 'objectBoundingBox',
      width: 1,
      height: 1,
    });
    pattern.append(
      element('image', {
        href: texture.dataUrl,
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        preserveAspectRatio: 'xMidYMid slice',
      }),
    );
    defs.append(pattern);
  }
  if (defs.childNodes.length) fragment.append(defs);
  const add = (name: string, attrs: Record<string, string | number>, text?: string) => {
    const node = element(name, attrs, text);
    fragment.append(node);
    return node;
  };
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
  if (pendingStroke && options.drawing)
    add('polyline', {
      points: pendingStroke.points
        .map((point) => {
          const shown = displayPoint(point);
          return `${shown.x},${shown.y}`;
        })
        .join(' '),
      fill: 'none',
      stroke: options.drawing.color,
      'stroke-width': options.drawing.width,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: 0.7,
      'data-preview': 'ink',
    });
  if (touchAim?.point) {
    const point = displayPoint(touchAim.point),
      occupied = board[touchAim.point.y * width + touchAim.point.x];
    add('circle', {
      cx: point.x,
      cy: point.y,
      r: 0.46,
      fill: occupied ? 'none' : state.position.toPlay === 'black' ? '#20272a' : '#fff',
      opacity: 0.65,
      stroke: '#12674e',
      'stroke-width': 0.07,
      'data-preview': 'touch',
      'data-target': `${touchAim.point.x},${touchAim.point.y}`,
    });
  }
  const compatible =
    reference && reference.position.width === width && reference.position.height === height;
  const differences = compatible ? frameDifferences(reference, state) : [];
  svg.setAttribute(
    'data-comparison-status',
    !options.compareTo
      ? 'none'
      : !reference
        ? 'unavailable'
        : compatible
          ? 'ready'
          : 'different-size',
  );
  svg.setAttribute('data-difference-count', String(differences.length));
  for (const difference of differences)
    if (visible(difference.point)) {
      const point = displayPoint(difference.point);
      const kind =
        difference.before === null ? 'added' : difference.after === null ? 'removed' : 'replaced';
      const color = kind === 'added' ? '#0f766e' : kind === 'removed' ? '#b34343' : '#a66e13';
      const attributes = {
        x: point.x - 0.49,
        y: point.y - 0.49,
        width: 0.98,
        height: 0.98,
        rx: 0.12,
        fill: 'none',
      };
      add('rect', { ...attributes, stroke: '#fffdf4', 'stroke-width': 0.18 });
      add('rect', {
        ...attributes,
        stroke: color,
        'stroke-width': 0.08,
        'stroke-dasharray': kind === 'removed' ? '0.12 0.08' : 'none',
        'data-difference': kind,
        'data-point': `${difference.point.x},${difference.point.y}`,
        'aria-label': boardMessage(options.labels?.difference ?? boardNotices.difference, {
          coordinate: coordinate(difference.point),
          before: options.labels?.[difference.before ?? 'empty'] ?? difference.before ?? 'empty',
          after: options.labels?.[difference.after ?? 'empty'] ?? difference.after ?? 'empty',
        }),
      });
      add(
        'text',
        {
          x: point.x + 0.32,
          y: point.y - 0.31,
          'font-size': 0.28,
          'font-weight': 700,
          'font-family': 'system-ui',
          'text-anchor': 'middle',
          fill: color,
          stroke: '#fffdf4',
          'stroke-width': 0.035,
          'paint-order': 'stroke',
        },
        kind === 'added' ? '+' : kind === 'removed' ? '−' : '↔',
      );
    }
  const hoverLayer = element('g', { 'data-hover-layer': '', 'pointer-events': 'none' });
  paintBoardHover(hoverLayer, context);
  fragment.append(hoverLayer);
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
  if (options.variationHints && state.recordState) {
    for (const candidate of variationCandidates(state.recordState)) {
      if (!visible(candidate.point)) continue;
      const at = displayPoint(candidate.point);
      const hint = element('g', {
        'data-variation-hint': candidate.node.id,
        'data-preview': '',
        'pointer-events': 'none',
        role: 'img',
        'aria-label': `${candidate.label} · ${coordinate(candidate.point)}`,
      });
      hint.append(
        element('circle', {
          cx: at.x,
          cy: at.y,
          r: 0.36,
          fill: '#fffaf0',
          'fill-opacity': 0.9,
          stroke: '#975d46',
          'stroke-width': 0.06,
        }),
      );
      hint.append(
        element(
          'text',
          {
            x: at.x,
            y: at.y,
            'text-anchor': 'middle',
            'dominant-baseline': 'central',
            'font-size': 0.38,
            'font-family': 'system-ui',
            'font-weight': 700,
            fill: '#754530',
          },
          candidate.label,
        ),
      );
      fragment.append(hint);
    }
  }
  if (document.activeElement === svg && visible(focus)) {
    const point = displayPoint(focus);
    add('rect', {
      x: point.x - 0.48,
      y: point.y - 0.48,
      width: 0.96,
      height: 0.96,
      rx: 0.09,
      fill: 'none',
      stroke: '#12674e',
      'stroke-width': 0.07,
      'data-cursor': `${focus.x},${focus.y}`,
    });
  }
  if (state.visiblePoints !== null) {
    const clip = element('clipPath', { id: `${textureId}-mask`, clipPathUnits: 'userSpaceOnUse' });
    for (const index of state.visiblePoints) {
      const point = { x: index % width, y: Math.floor(index / width) };
      if (!visible(point)) continue;
      const at = displayPoint(point);
      clip.append(element('rect', { x: at.x - 0.5, y: at.y - 0.5, width: 1, height: 1 }));
    }
    defs.append(clip);
    if (!defs.parentNode) fragment.prepend(defs);
    const group = element('g', { 'clip-path': `url(#${textureId}-mask)` });
    for (const child of [...fragment.children])
      if (
        child !== defs &&
        !child.hasAttribute('data-coordinate') &&
        !child.hasAttribute('data-board-surface')
      )
        group.append(child);
    fragment.append(group);
  }
  svg.replaceChildren(fragment);
  return hoverLayer;
}

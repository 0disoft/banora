import { paintBoardContent, paintBoardDimming } from './board-content.js';
import { variationCandidates } from './variations.js';
import type { Point } from './core.js';
import type { BoardCrop } from './geometry.js';
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
/** Touch aiming changes only this export-excluded layer, never the board contents. */
export function paintBoardTouch(
  layer: SVGElement,
  {
    state,
    touchAim,
    displayPoint,
    element,
  }: Pick<PaintContext, 'state' | 'touchAim' | 'displayPoint' | 'element'>,
): void {
  if (!touchAim?.point) {
    layer.replaceChildren();
    return;
  }
  let circle = layer.firstElementChild;
  if (!circle) {
    circle = element('circle', {
      r: 0.46,
      opacity: 0.65,
      stroke: '#12674e',
      'stroke-width': 0.07,
      'data-preview': 'touch',
    });
    layer.append(circle);
  }
  const point = displayPoint(touchAim.point);
  const occupied = state.position.board[touchAim.point.y * state.position.width + touchAim.point.x];
  circle.setAttribute('cx', String(point.x));
  circle.setAttribute('cy', String(point.y));
  circle.setAttribute(
    'fill',
    occupied ? 'none' : state.position.toPlay === 'black' ? '#20272a' : '#fff',
  );
  circle.setAttribute('data-target', `${touchAim.point.x},${touchAim.point.y}`);
}
/** A view-owned preview; updating sampled points never edits the authored strokes. */
export function paintBoardInk(
  {
    pendingStroke,
    options,
    displayPoint,
    element,
  }: Pick<PaintContext, 'pendingStroke' | 'options' | 'displayPoint' | 'element'>,
  preview?: SVGElement,
): SVGElement | undefined {
  if (!pendingStroke || !options.drawing) return;
  const line =
    preview ??
    element('polyline', {
      fill: 'none',
      stroke: options.drawing.color,
      'stroke-width': options.drawing.width,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: 0.7,
      'data-preview': 'ink',
    });
  line.setAttribute(
    'points',
    pendingStroke.points
      .map((point) => {
        const shown = displayPoint(point);
        return `${shown.x},${shown.y}`;
      })
      .join(' '),
  );
  return line;
}
export function paintBoard(context: PaintContext): {
  hover: SVGElement;
  touch: SVGElement;
  ink: SVGElement | undefined;
} {
  const {
    document,
    svg,
    state,
    options,
    textureId,
    focus,
    reference,
    element,
    displayPoint,
    visible,
    coordinate,
  } = context;
  const { width, height } = state.position;
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
  paintBoardContent(context, add);
  const inkPreview = paintBoardInk(context);
  if (inkPreview) fragment.append(inkPreview);
  const touchLayer = element('g', { 'data-preview': 'touch-layer' });
  paintBoardTouch(touchLayer, context);
  fragment.append(touchLayer);
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
  paintBoardDimming(context, add);
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
  return { hover: hoverLayer, touch: touchLayer, ink: inkPreview };
}

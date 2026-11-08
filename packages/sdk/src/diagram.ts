import { BOARD_PADDING } from './board-layout.js';
import { paintBoardContent, paintBoardDimming } from './board-content.js';
import type { BoardContentContext } from './board-content.js';
import { displayCrop, normalizeBoardTransform, toDisplayPoint } from './geometry.js';
import type { BoardCrop, BoardTransform } from './geometry.js';
import { diagramSnapshot } from './diagram-state.js';
import type { DiagramSource } from './diagram-state.js';
import { diagramDimensions, escapeDiagramXml } from './diagram-shared.js';
import type { DiagramOptions } from './diagram-shared.js';

export type { DiagramSource } from './diagram-state.js';
export interface DiagramSvgOptions extends DiagramOptions {
  readonly theme?: 'wood' | 'flat';
  readonly coordinates?: boolean;
  readonly moveNumbers?: boolean;
  readonly crop?: BoardCrop;
  readonly transform?: BoardTransform;
  /** Use a unique prefix when inlining multiple diagrams with visibility masks. */
  readonly idPrefix?: string;
}

/** Diagram output is bounded independently of the validated input snapshot. */
export const DIAGRAM_SVG_LIMITS = Object.freeze({ maxBytes: 8_388_608 });
const optionKeys = new Set([
  'width',
  'height',
  'title',
  'theme',
  'coordinates',
  'moveNumbers',
  'crop',
  'transform',
  'idPrefix',
]);

/** Pure, deterministic SVG generation. No document, window, filesystem, network or retained state. */
export function renderDiagramSvg(source: DiagramSource, options: DiagramSvgOptions = {}): string {
  if (
    !options ||
    typeof options !== 'object' ||
    Array.isArray(options) ||
    Object.keys(options).some((key) => !optionKeys.has(key))
  )
    throw new TypeError('Unknown or invalid SVG diagram options');
  for (const key of ['width', 'height'] as const)
    if (options[key] !== undefined && typeof options[key] !== 'number')
      throw new TypeError(`Diagram ${key} must be numeric`);
  for (const key of ['crop', 'transform'] as const)
    if (
      options[key] !== undefined &&
      (!options[key] || typeof options[key] !== 'object' || Array.isArray(options[key]))
    )
      throw new TypeError(`Diagram ${key} must be an object`);
  if (options.theme !== undefined && options.theme !== 'wood' && options.theme !== 'flat')
    throw new TypeError('Diagram theme must be wood or flat');
  for (const key of ['coordinates', 'moveNumbers'] as const)
    if (options[key] !== undefined && typeof options[key] !== 'boolean')
      throw new TypeError(`Diagram ${key} must be boolean`);
  if (
    options.idPrefix !== undefined &&
    (typeof options.idPrefix !== 'string' ||
      !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(options.idPrefix))
  )
    throw new TypeError('Diagram idPrefix must be a safe identifier of at most 64 characters');
  const snapshot = diagramSnapshot(source, options.moveNumbers ?? false);
  const size = { width: snapshot.width, height: snapshot.height };
  const transform = normalizeBoardTransform(options.transform);
  const crop = options.crop ?? { x: 0, y: 0, ...size };
  const displayed = displayCrop(crop, size, transform);
  const box = {
    width: displayed.width - 1 + BOARD_PADDING * 2,
    height: displayed.height - 1 + BOARD_PADDING * 2,
  };
  const dimensions = diagramDimensions(box, options);
  const title = escapeDiagramXml(options.title ?? 'Go position diagram');
  const parts: string[] = [];
  let masked: string[] | undefined;
  let clipId = '';
  const encoder = new TextEncoder();
  let bytes = 0;
  const append = (text: string, destination = parts) => {
    bytes += encoder.encode(text).byteLength;
    if (bytes > DIAGRAM_SVG_LIMITS.maxBytes) throw new RangeError('SVG diagram exceeds 8 MiB');
    destination.push(text);
  };
  const add = (name: string, attributes: Record<string, string | number>, text?: string) => {
    const attrs = Object.entries(attributes)
      .map(([key, value]) => {
        // The shared painter owns attribute names. Resolve only its fixed CSS fallbacks.
        const fixed = String(value).replace(/^var\(--[a-z-]+,(#[a-f\d]{3,8})\)$/i, '$1');
        return `${key}="${escapeDiagramXml(fixed)}"`;
      })
      .join(' ');
    const destination =
      masked &&
      !Object.hasOwn(attributes, 'data-coordinate') &&
      !Object.hasOwn(attributes, 'data-board-surface')
        ? masked
        : parts;
    append(
      `<${name} ${attrs}>${text === undefined ? '' : escapeDiagramXml(text)}</${name}>`,
      destination,
    );
  };
  const visiblePoints =
    snapshot.visiblePoints === null
      ? null
      : new Set(snapshot.visiblePoints.map((p) => p.y * size.width + p.x));
  const context: BoardContentContext = {
    state: {
      position: { ...size, board: snapshot.stones },
      numbers: () =>
        new Map(snapshot.numbers.map((n) => [n.point.y * size.width + n.point.x, n.value])),
      lastMove: snapshot.lastMove,
      markers: snapshot.markers,
      connections: snapshot.connections,
      strokes: snapshot.strokes,
      overlays: snapshot.overlays,
      dimPoints: new Set(snapshot.dimPoints.map((p) => p.y * size.width + p.x)),
    },
    options: {
      ...options,
      transform,
      coordinates: options.coordinates ?? true,
      stoneTextures: { black: null, white: null },
    },
    crop,
    textureId: '',
    displayPoint: (point) => {
      const at = toDisplayPoint(point, size, transform);
      return { x: at.x + BOARD_PADDING, y: at.y + BOARD_PADDING };
    },
    visible: (point) =>
      point.x >= crop.x &&
      point.y >= crop.y &&
      point.x < crop.x + crop.width &&
      point.y < crop.y + crop.height &&
      (visiblePoints === null || visiblePoints.has(point.y * size.width + point.x)),
  };
  append(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dimensions.width}" height="${dimensions.height}" viewBox="${displayed.x} ${displayed.y} ${box.width} ${box.height}" role="img" aria-label="${title}" overflow="hidden"><title>${title}</title>`,
  );
  if (visiblePoints !== null) {
    // Geometry-derived identifiers keep repeated calls deterministic, without a global counter.
    let a = 2166136261,
      b = 5381;
    const geometry = JSON.stringify([size, transform, crop, snapshot.visiblePoints]);
    for (let index = 0; index < geometry.length; index++) {
      a = Math.imul(a ^ geometry.charCodeAt(index), 16777619);
      b = Math.imul(b, 33) ^ geometry.charCodeAt(index);
    }
    const id = `${options.idPrefix ?? 'banora-diagram'}-${(a >>> 0).toString(16)}-${(b >>> 0).toString(16)}`;
    append(`<defs><clipPath id="${id}" clipPathUnits="userSpaceOnUse">`);
    for (const point of snapshot.visiblePoints!) {
      if (!context.visible(point)) continue;
      const at = context.displayPoint(point);
      add('rect', { x: at.x - 0.5, y: at.y - 0.5, width: 1, height: 1 });
    }
    append('</clipPath></defs>');
    clipId = id;
    masked = [];
  }
  paintBoardContent(context, add);
  paintBoardDimming(context, add);
  if (masked) {
    append(`<g clip-path="url(#${clipId})">`);
    for (const primitive of masked) parts.push(primitive);
    append('</g>');
  }
  append('</svg>');
  return parts.join('');
}

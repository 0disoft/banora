import { isOnBoard } from './core.js';
import type { Point } from './core.js';
import { RecordController } from './controller.js';
import type { ControllerState } from './controller.js';
import { expandSgfPoints, pointFromSgf } from './sgf.js';
import { displayCrop, normalizeBoardTransform, toDisplayPoint, toLogicalPoint } from './geometry.js';
import type { BoardCrop, BoardTransform } from './geometry.js';
import { rasterizeBoardDiagram, serializeBoardDiagram } from './diagram-export.js';
import type { DiagramOptions } from './diagram-export.js';
import { normalizeStrokeStyle, strokeLimits } from './annotations.js';
import type { StrokeStyle } from './annotations.js';

export type { BoardCrop, BoardTransform } from './geometry.js';
export type { DiagramOptions } from './diagram-export.js';
export interface BoardOptions {
  readonly controller?: RecordController;
  readonly readOnly?: boolean;
  readonly theme?: 'wood' | 'flat';
  readonly coordinates?: boolean;
  readonly moveNumbers?: boolean;
  readonly crop?: BoardCrop | null;
  readonly transform?: BoardTransform;
  /** Opt-in freehand mode; null/undefined restores ordinary point activation. */
  readonly drawing?: StrokeStyle | null;
  readonly onPoint?: (point: Point) => void;
}
export interface BoardView {
  readonly controller: RecordController;
  update(options: Omit<BoardOptions, 'controller'>): void;
  exportSvg(options?: DiagramOptions): string;
  exportPng(options?: DiagramOptions): Promise<Blob>;
  dispose(): void;
}
const namespace = 'http://www.w3.org/2000/svg';
const padding = 1.25;
const letters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
const columnLabel = (index: number) => letters[index] ?? String(index + 1);

/** Browser globals are used only during mounting; importing this module is SSR-safe. */
export function mountBoard(container: HTMLElement, initial: BoardOptions = {}): BoardView {
  const document = container.ownerDocument;
  let options = { ...initial, transform: normalizeBoardTransform(initial.transform),
    drawing: initial.drawing ? normalizeStrokeStyle(initial.drawing) : null };
  const owned = !initial.controller;
  const controller = initial.controller ?? new RecordController();
  let disposed = false;
  let current = controller.getState();
  let focus: Point = { x: 0, y: 0 };
  let hover: Point | null = null;
  let pendingStroke: { pointer: number | null; points: Point[] } | null = null;
  let cancelledPointer: number | null = null;
  const abort = new AbortController();
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('role', 'application');
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('aria-label', 'Go board. Arrow keys move the cursor; Enter places a stone or marker; Page Up and Page Down navigate moves.');
  svg.style.cssText = 'display:block;width:100%;height:auto;touch-action:manipulation;outline-offset:4px;border-radius:12px;';
  const live = document.createElement('span');
  live.setAttribute('aria-live', 'polite');
  live.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;';
  try { cropFor(current); } catch (error) { if (owned) controller.dispose(); throw error; }
  container.append(svg, live);

  function element(name: string, attributes: Record<string, string | number> = {}, text?: string): SVGElement {
    const node = document.createElementNS(namespace, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function cropFor(state: ControllerState): BoardCrop {
    const crop = options.crop ?? { x: 0, y: 0, width: state.position.width, height: state.position.height };
    if (![crop.x, crop.y, crop.width, crop.height].every(Number.isInteger) || crop.width < 1 || crop.height < 1 ||
      crop.x < 0 || crop.y < 0 || crop.x + crop.width > state.position.width || crop.y + crop.height > state.position.height) {
      throw new RangeError('Crop must be an integer rectangle inside the board');
    }
    return crop;
  }
  function visible(point: Point): boolean {
    const crop = cropFor(current);
    return point.x >= crop.x && point.y >= crop.y && point.x < crop.x + crop.width && point.y < crop.y + crop.height;
  }
  function displayPoint(point: Point): Point {
    const displayed = toDisplayPoint(point, current.position, options.transform);
    return {x:displayed.x + padding, y:displayed.y + padding};
  }
  function render(state: ControllerState): void {
    current = state;
    const { width, height, board } = state.position;
    // A host record replacement can invalidate an old crop. Reset it on size changes.
    if (options.crop && (options.crop.x + options.crop.width > width || options.crop.y + options.crop.height > height)) options = { ...options, crop: null };
    const crop = cropFor(state);
    const displayedCrop = displayCrop(crop, state.position, options.transform);
    if (!visible(focus)) focus = { x: crop.x, y: crop.y };
    svg.setAttribute('viewBox', `${displayedCrop.x} ${displayedCrop.y} ${displayedCrop.width - 1 + padding * 2} ${displayedCrop.height - 1 + padding * 2}`);
    svg.setAttribute('data-board-width', String(width));
    svg.setAttribute('data-board-height', String(height));
    svg.setAttribute('data-rotation', String(options.transform.rotation));
    svg.setAttribute('data-flip-x', String(options.transform.flipX));
    svg.setAttribute('aria-roledescription', `${width} by ${height} Go board`);
    svg.style.touchAction = options.drawing && !options.readOnly ? 'none' : 'manipulation';
    if (options.drawing && !options.readOnly) svg.setAttribute('aria-label', 'Go board ink tool. Drag to draw. Arrow keys move the cursor; Space adds a point; Enter finishes the stroke; Escape cancels.');
    else if (options.readOnly && !options.onPoint) svg.setAttribute('aria-label', 'Read-only Go board. Arrow keys move the cursor; Page Up and Page Down navigate moves.');
    else svg.setAttribute('aria-label', 'Go board. Arrow keys move the cursor; Enter places a stone or marker; Page Up and Page Down navigate moves.');
    const fragment = document.createDocumentFragment();
    const add = (name: string, attrs: Record<string, string | number>, text?: string) => {
      const node = element(name, attrs, text); fragment.append(node); return node;
    };
    add('rect', { x: displayedCrop.x, y: displayedCrop.y, width: displayedCrop.width - 1 + padding * 2, height: displayedCrop.height - 1 + padding * 2,
      fill: `var(--banora-board,${options.theme === 'flat' ? '#e8e1ce' : '#d9b677'})` });
    const gridLine = (start: Point, end: Point) => {
      const a = displayPoint(start), b = displayPoint(end);
      add('line', {x1:a.x, y1:a.y, x2:b.x, y2:b.y, stroke:'var(--banora-grid,#53472e)', 'stroke-width':0.027});
    };
    for (let x = 0; x < width; x++) gridLine({x,y:0}, {x,y:height-1});
    for (let y = 0; y < height; y++) gridLine({x:0,y}, {x:width-1,y});
    if (width === height && [9, 13, 19].includes(width)) {
      const edge = width === 9 ? 2 : 3;
      const points = [edge, Math.floor(width / 2), width - 1 - edge];
      for (const x of points) for (const y of points) {
        if (width !== 19 && ((x === points[1]) !== (y === points[1]))) continue;
        const point = displayPoint({x,y});
        add('circle', { cx: point.x, cy: point.y, r: 0.075, fill: 'var(--banora-grid,#53472e)' });
      }
    }
    if (options.coordinates !== false) {
      for (let x = crop.x; x < crop.x + crop.width; x++) {
        for (const y of [crop.y - 0.75, crop.y + crop.height - 1 + 0.75]) {
          const point = displayPoint({x,y});
          add('text', {x:point.x, y:point.y + 0.09, 'text-anchor':'middle', 'font-size':0.27,
            fill:'var(--banora-grid,#53472e)', 'font-family':'system-ui'}, columnLabel(x));
        }
      }
      for (let y = crop.y; y < crop.y + crop.height; y++) {
        for (const x of [crop.x - 0.75, crop.x + crop.width - 1 + 0.75]) {
          const point = displayPoint({x,y});
          add('text', {x:point.x, y:point.y + 0.09, 'text-anchor':'middle', 'font-size':0.27,
            fill:'var(--banora-grid,#53472e)', 'font-family':'system-ui'}, String(height-y));
        }
      }
    }
    const numbers = new Map<number, number>();
    if (options.moveNumbers) {
      const nodes = new Map<string, typeof state.node>();
      const pending = [...state.record.games];
      while (pending.length) { const node = pending.pop()!; nodes.set(node.id, node); pending.push(...node.children); }
      let number = 0;
      for (const id of state.path) {
        const node = nodes.get(id)!;
        for (const key of ['AB', 'AW', 'AE']) for (const value of node.properties[key] ?? []) {
          for (const point of expandSgfPoints(value, width, height)) numbers.delete(point.y * width + point.x);
        }
        const value = node.properties.B?.[0] ?? node.properties.W?.[0];
        if (value !== undefined) number++;
        if (node.properties.MN) number = Number(node.properties.MN[0]);
        if (!value || (value === 'tt' && width <= 19 && height <= 19)) continue;
        const point = pointFromSgf(value, width, height);
        numbers.set(point.y * width + point.x, number);
      }
    }
    for (let y = crop.y; y < crop.y + crop.height; y++) for (let x = crop.x; x < crop.x + crop.width; x++) {
      const color = board[y * width + x];
      if (!color) continue;
      const point = displayPoint({x,y});
      add('circle', { cx: point.x, cy: point.y, r: 0.46, fill: `var(--banora-${color},${color === 'black' ? '#20272a' : '#fbfaf4'})`, stroke: color === 'black' ? '#101618' : '#716957', 'stroke-width': 0.023, 'data-stone': `${x},${y}` });
      if (numbers.has(y * width + x)) add('text', { x: point.x, y: point.y + 0.13,
        'text-anchor': 'middle', 'font-size': 0.34, fill: color === 'black' ? '#fff' : '#20272a', 'font-family': 'system-ui', 'data-move-number': numbers.get(y * width + x)! }, String(numbers.get(y * width + x)));
    }
    if (!options.moveNumbers) {
      const move = state.node.properties.B?.[0] ?? state.node.properties.W?.[0];
      if (move && !(move === 'tt' && width <= 19 && height <= 19)) {
        const point = pointFromSgf(move, width, height);
        const shown = displayPoint(point);
        if (board[point.y * width + point.x]) add('circle', { cx: shown.x, cy: shown.y, r: 0.12,
          fill: board[point.y * width + point.x] === 'black' ? '#f9e7a6' : '#275c4b' });
      }
    }
    for (const connection of state.connections) {
      const from = displayPoint(connection.from);
      const to = displayPoint(connection.to);
      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      const ux = (to.x - from.x) / distance, uy = (to.y - from.y) / distance;
      const end = connection.kind === 'arrow' ? { x: to.x - ux * 0.25, y: to.y - uy * 0.25 } : to;
      const points = { x1: from.x, y1: from.y, x2: end.x, y2: end.y, 'stroke-linecap': 'round' };
      add('line', { ...points, stroke: '#fffcf0', 'stroke-width': 0.17 });
      add('line', { ...points, stroke: 'var(--banora-annotation,#206650)', 'stroke-width': 0.09,
        'data-connection': connection.kind, 'data-from': `${connection.from.x},${connection.from.y}`, 'data-to': `${connection.to.x},${connection.to.y}` });
      if (connection.kind === 'arrow') add('polygon', {
        points: `${to.x},${to.y} ${to.x - ux * 0.4 - uy * 0.2},${to.y - uy * 0.4 + ux * 0.2} ${to.x - ux * 0.4 + uy * 0.2},${to.y - uy * 0.4 - ux * 0.2}`,
        fill: 'var(--banora-annotation,#206650)', stroke: '#fffcf0', 'stroke-width': 0.03,
      });
    }
    for (const marker of state.markers) {
      if (!visible(marker.point)) continue;
      const {x,y} = displayPoint(marker.point);
      const ink = board[marker.point.y * width + marker.point.x] === 'black' ? '#fff2bd' : '#214e41';
      const attributes = { fill: 'none', stroke: ink, 'stroke-width': 0.06, 'data-marker': `${marker.point.x},${marker.point.y}` };
      if (marker.kind === 'circle') add('circle', { ...attributes, cx: x, cy: y, r: 0.27 });
      if (marker.kind === 'square') add('rect', { ...attributes, x: x - 0.24, y: y - 0.24, width: 0.48, height: 0.48 });
      if (marker.kind === 'triangle') add('path', { ...attributes, d: `M ${x} ${y - 0.29} L ${x + 0.29} ${y + 0.24} L ${x - 0.29} ${y + 0.24} Z` });
      if (marker.kind === 'cross') add('path', { ...attributes, d: `M ${x - 0.24} ${y - 0.24} L ${x + 0.24} ${y + 0.24} M ${x + 0.24} ${y - 0.24} L ${x - 0.24} ${y + 0.24}` });
      if (marker.kind === 'label') add('text', { x, y: y + 0.14, 'text-anchor': 'middle', 'font-size': 0.4,
        fill: ink, 'font-family': 'system-ui', 'font-weight': 650, 'data-marker': `${marker.point.x},${marker.point.y}` }, marker.label);
    }
    for (const stroke of state.strokes) add('polyline', {
      points: stroke.points.map(point => { const shown = displayPoint(point); return `${shown.x},${shown.y}`; }).join(' '),
      fill:'none', stroke:stroke.color, 'stroke-width':stroke.width, 'stroke-linecap':'round', 'stroke-linejoin':'round', 'data-stroke':stroke.id,
    });
    if (pendingStroke && options.drawing) add('polyline', {
      points: pendingStroke.points.map(point => { const shown = displayPoint(point); return `${shown.x},${shown.y}`; }).join(' '),
      fill:'none', stroke:options.drawing.color, 'stroke-width':options.drawing.width,
      'stroke-linecap':'round', 'stroke-linejoin':'round', opacity:0.7, 'data-preview':'ink',
    });
    if (hover && visible(hover) && !board[hover.y * width + hover.x] && !options.readOnly && !options.drawing) {
      const point = displayPoint(hover);
      add('circle', {cx:point.x, cy:point.y, r:0.44, fill:state.position.toPlay === 'black' ? '#20272a' : '#fff', opacity:0.4, 'data-preview':''});
    }
    if (document.activeElement === svg) {
      const point = displayPoint(focus);
      add('rect', {x:point.x - 0.48, y:point.y - 0.48, width:0.96, height:0.96, rx:0.09,
        fill:'none', stroke:'#12674e', 'stroke-width':0.07, 'data-cursor':`${focus.x},${focus.y}`});
    }
    svg.replaceChildren(fragment);
  }
  function announce(state: ControllerState): void {
    live.textContent = `Move ${state.position.moveNumber}. ${state.position.toPlay} to play. Black captures ${state.position.captures.black}, white captures ${state.position.captures.white}.`;
  }
  function activate(point: Point): void {
    if (options.onPoint) options.onPoint(Object.freeze({ ...point }));
    else if (!options.readOnly) {
      const result = controller.play(point);
      if (!result.ok) live.textContent = `Move rejected: ${result.reason}.`;
    }
  }
  function logicalPointer(event: PointerEvent): Point | null {
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const screen = svg.createSVGPoint(); screen.x = event.clientX; screen.y = event.clientY;
    const displayed = screen.matrixTransform(matrix.inverse());
    return toLogicalPoint({x:displayed.x-padding, y:displayed.y-padding}, current.position, options.transform);
  }
  function pointerPoint(event: PointerEvent): Point | null {
    const logical = logicalPointer(event);
    if (!logical) return null;
    const point = { x: Math.round(logical.x), y: Math.round(logical.y) };
    return isOnBoard(current.position, point) && visible(point) ? point : null;
  }
  function inkPoint(event: PointerEvent): Point | null {
    const point = logicalPointer(event), crop = cropFor(current);
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < crop.x - 0.00001 ||
      point.y < crop.y - 0.00001 || point.x > crop.x + crop.width - 1 + 0.00001 || point.y > crop.y + crop.height - 1 + 0.00001) return null;
    return {x:Math.max(crop.x, Math.min(crop.x+crop.width-1, point.x)), y:Math.max(crop.y, Math.min(crop.y+crop.height-1, point.y))};
  }
  function cancelInk(): void {
    const pointer = pendingStroke?.pointer;
    pendingStroke = null;
    if (pointer !== undefined && pointer !== null) cancelledPointer = pointer;
    if (pointer !== undefined && pointer !== null && svg.hasPointerCapture(pointer)) svg.releasePointerCapture(pointer);
  }
  function appendInk(point: Point): void {
    if (!pendingStroke) return;
    const last = pendingStroke.points.at(-1)!;
    if (Math.hypot(point.x-last.x, point.y-last.y) < 0.01) return;
    if (pendingStroke.points.length >= strokeLimits.pointsPerStroke) {
      cancelInk(); live.textContent = 'Stroke cancelled: more than 512 sampled points. Draw shorter strokes.';
    } else pendingStroke.points.push(point);
  }
  function finishInk(): void {
    const points = pendingStroke?.points;
    cancelInk();
    if (!points || points.length < 2 || !options.drawing || options.readOnly) { render(current); return; }
    const result = controller.addStroke(points, options.drawing);
    live.textContent = result.ok ? 'Ink stroke added. Undo removes it.' : `Ink rejected: ${result.reason}.`;
    render(current);
  }
  svg.addEventListener('pointerdown', event => {
    if (cancelledPointer === event.pointerId) cancelledPointer = null;
    if (!options.drawing || options.readOnly || event.button !== 0 || !event.isPrimary || pendingStroke) return;
    const point = inkPoint(event);
    if (!point) return;
    event.preventDefault(); svg.focus({preventScroll:true}); hover = null;
    pendingStroke = {pointer:event.pointerId, points:[point]};
    try { svg.setPointerCapture(event.pointerId); }
    catch { cancelInk(); live.textContent = 'Ink cancelled: pointer capture is unavailable.'; }
    render(current);
  }, {signal:abort.signal});
  svg.addEventListener('pointermove', event => {
    if (pendingStroke?.pointer === event.pointerId) {
      event.preventDefault(); const point = inkPoint(event); if (point) appendInk(point); render(current); return;
    }
    if (options.drawing) return;
    const point = pointerPoint(event); if (point?.x !== hover?.x || point?.y !== hover?.y) { hover = point; render(current); }
  }, { signal: abort.signal });
  svg.addEventListener('pointerleave', () => { hover = null; render(current); }, { signal: abort.signal });
  svg.addEventListener('pointerup', event => {
    if (cancelledPointer === event.pointerId) { cancelledPointer = null; return; }
    if (event.button !== 0) return;
    if (options.drawing) {
      if (pendingStroke?.pointer !== event.pointerId) return;
      event.preventDefault(); const point = inkPoint(event);
      if (point) { appendInk(point); finishInk(); }
      else { cancelInk(); render(current); live.textContent = 'Ink cancelled: release inside the board.'; }
      return;
    }
    const point = pointerPoint(event);
    if (point) { focus = point; svg.focus({ preventScroll: true }); activate(point); render(current); }
  }, { signal: abort.signal });
  for (const name of ['pointercancel','lostpointercapture'] as const) svg.addEventListener(name, event => {
    if (pendingStroke?.pointer === event.pointerId) { cancelInk(); render(current); live.textContent = 'Ink cancelled.'; }
  }, {signal:abort.signal});
  svg.addEventListener('focus', () => render(current), { signal: abort.signal });
  svg.addEventListener('blur', () => { cancelInk(); render(current); }, { signal: abort.signal });
  svg.addEventListener('keydown', event => {
    const crop = cropFor(current);
    const shifts: Record<string, Point> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };
    if (shifts[event.key]) {
      event.preventDefault();
      const shift = shifts[event.key]!;
      const shown = toDisplayPoint(focus, current.position, options.transform);
      const logical = toLogicalPoint({x:shown.x+shift.x, y:shown.y+shift.y}, current.position, options.transform);
      focus = { x: Math.max(crop.x, Math.min(crop.x + crop.width - 1, logical.x)),
        y: Math.max(crop.y, Math.min(crop.y + crop.height - 1, logical.y)) };
      render(current); live.textContent = `${columnLabel(focus.x)}${current.position.height - focus.y}. ${current.position.board[focus.y * current.position.width + focus.x] ?? 'Empty'}.`;
    } else if (event.key === 'Escape') { cancelInk(); render(current); live.textContent = 'Ink cancelled.'; }
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (options.drawing) {
        if (options.readOnly || (pendingStroke && pendingStroke.pointer !== null)) return;
        if (!pendingStroke) { pendingStroke = {pointer:null, points:[{...focus}]}; live.textContent = 'Ink started. Move the cursor and add points with Space; Enter finishes.'; }
        else { appendInk({...focus}); if (event.key === 'Enter') finishInk(); }
        render(current);
      } else activate(focus);
    }
    else if (event.key === 'PageUp' || event.key === 'PageDown') { event.preventDefault(); event.key === 'PageUp' ? controller.previous() : controller.next(); }
  }, { signal: abort.signal });
  cropFor(current);
  const unsubscribe = controller.subscribe(state => {
    if (state.record !== current.record || state.node.id !== current.node.id) cancelInk();
    render(state); announce(state);
  });
  return Object.freeze({ controller,
    exportSvg(config: DiagramOptions = {}) {
      if (disposed) throw new Error('Board view is disposed');
      return serializeBoardDiagram(svg,config).text;
    },
    async exportPng(config: DiagramOptions = {}) {
      if (disposed) throw new Error('Board view is disposed');
      return rasterizeBoardDiagram(document,serializeBoardDiagram(svg,config),abort.signal);
    },
    update(next: Omit<BoardOptions, 'controller'>) {
      if (disposed) throw new Error('Board view is disposed');
      const previous = options;
      options = { ...options, ...next, transform: normalizeBoardTransform(Object.hasOwn(next, 'transform') ? next.transform : options.transform),
        drawing: Object.hasOwn(next, 'drawing') ? next.drawing ? normalizeStrokeStyle(next.drawing) : null : options.drawing };
      try { cropFor(current); } catch (error) { options = previous; throw error; }
      cancelInk(); render(current);
    },
    dispose() {
      if (disposed) return;
      disposed = true; cancelInk(); abort.abort(); unsubscribe(); svg.remove(); live.remove();
      if (owned) controller.dispose();
    },
  });
}

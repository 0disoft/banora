import { comparePositions, isOnBoard } from './core.js';
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
import { mountTouchUI, normalizeTouchOptions } from './touch-aim.js';
import type { TouchOptions } from './touch-aim.js';
import {normalizeStoneTextures} from './stone-textures.js';
import type {StoneTextures} from './stone-textures.js';
import {mountPlacementAnimation,normalizePlacementAnimation} from './placement-animation.js';
import type {PlacementAnimationOptions} from './placement-animation.js';
import {BOARD_PADDING} from './board-layout.js';

export type { BoardCrop, BoardTransform } from './geometry.js';
export type { DiagramOptions } from './diagram-export.js';
export type { TouchOptions } from './touch-aim.js';
export {prepareStoneTexture} from './texture-loader.js';
export type {TexturePreparationOptions} from './texture-loader.js';
export type {PlacementAnimationOptions} from './placement-animation.js';
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
  readonly touch?: TouchOptions | null;
  readonly stoneTextures?:StoneTextures|null;
  readonly placementAnimation?:boolean|PlacementAnimationOptions|null;
  /** Pin a read-only board to a node in the current record generation. */
  readonly nodeId?: string | null;
  readonly compareTo?: string | null;
  /** Scope nodeId/compareTo to an import generation; defaults to their mount/change generation. */
  readonly referenceGeneration?: number;
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
const padding = BOARD_PADDING;
const letters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
const columnLabel = (index: number) => letters[index] ?? String(index + 1);
let boardSequence=0;

/** Browser globals are used only during mounting; importing this module is SSR-safe. */
export function mountBoard(container: HTMLElement, initial: BoardOptions = {}): BoardView {
  const document = container.ownerDocument;
  const textureId=`banora-texture-${++boardSequence}`;
  let options = { ...initial, transform: normalizeBoardTransform(initial.transform),
    drawing: initial.drawing ? normalizeStrokeStyle(initial.drawing) : null, touch: normalizeTouchOptions(initial.touch),
    stoneTextures:normalizeStoneTextures(initial.stoneTextures) };
  let animationOptions=normalizePlacementAnimation(initial.placementAnimation);
  const owned = !initial.controller;
  const controller = initial.controller ?? new RecordController();
  let disposed = false;
  let current = controller.getState();
  let nodeGeneration=options.referenceGeneration ?? current.recordGeneration,compareGeneration=nodeGeneration;
  let available=true;
  let focus: Point = { x: 0, y: 0 };
  let hover: Point | null = null;
  let pendingStroke: { pointer: number | null; points: Point[] } | null = null;
  let cancelledPointer: number | null = null;
  let touchAim: { pointer: number | null; point: Point | null; screen: Point | null } | null = null;
  const abort = new AbortController();
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('role', 'application');
  svg.setAttribute('tabindex', '0');
  svg.setAttribute('aria-label', 'Go board. Arrow keys move the cursor; Enter places a stone or marker; Page Up and Page Down navigate moves.');
  svg.style.cssText = 'display:block;width:100%;height:auto;touch-action:manipulation;outline-offset:4px;border-radius:12px;';
  const live = document.createElement('span');
  live.setAttribute('aria-live', 'polite');
  live.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;';
  try {validateGeneration(initial.referenceGeneration);validateReferences(initial);if (options.nodeId) current=controller.inspectNode(options.nodeId)!;cropFor(current);}
  catch (error) {if (owned) controller.dispose();throw error;}
  container.append(svg, live);
  const placement=mountPlacementAnimation(svg,abort.signal);
  const touchUI = mountTouchUI(container,svg,confirmTouch,() => {cancelTouch();render(current);svg.focus({preventScroll:true});live.textContent='Placement cancelled.';},abort.signal);
  document.defaultView?.addEventListener('resize',() => {
    if (touchAim) {cancelTouch();render(current);live.textContent='Placement cancelled: viewport changed.';}
  },{signal:abort.signal});

  function element(name: string, attributes: Record<string, string | number> = {}, text?: string): SVGElement {
    const node = document.createElementNS(namespace, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function validateReferences(config: Pick<BoardOptions,'nodeId'|'compareTo'>, changing=false): void {
    for (const key of ['nodeId','compareTo'] as const) {
      const id=config[key];
      if (changing && id===options[key]) continue;
      if (id != null && (typeof id !== 'string' || !id || !controller.inspectNode(id))) throw new RangeError('Board node reference does not exist');
    }
  }
  function validateGeneration(generation: number | undefined): void {
    if (generation!==undefined && (!Number.isSafeInteger(generation) || generation<0)) throw new RangeError('Reference generation must be a nonnegative integer');
  }
  function readOnly(): boolean {return !!options.readOnly || options.nodeId != null;}
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
    if (options.nodeId) {
      const pinned=nodeGeneration===state.recordGeneration ? controller.inspectNode(options.nodeId) : null;
      if (!pinned) {
        placement.cancel();
        available=false;current=state;cancelInk();cancelTouch();hover=null;
        svg.setAttribute('viewBox','0 0 12 3');svg.setAttribute('data-node-status','unavailable');
        svg.setAttribute('data-comparison-status','unavailable');svg.setAttribute('data-difference-count','0');
        svg.setAttribute('data-node-id',options.nodeId);svg.setAttribute('aria-label','Pinned node is unavailable. Choose another node or restore the branch.');
        svg.replaceChildren(element('text',{x:6,y:1.6,'text-anchor':'middle','font-size':0.4,'font-family':'system-ui',fill:'#687b69'},'Node unavailable'));
        touchUI.render(null,null,'',false,false);live.textContent='Pinned node is unavailable.';return;
      }
      state=pinned;
    }
    available=true;
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
    svg.setAttribute('data-node-id',state.node.id);svg.setAttribute('data-node-status','ready');
    svg.setAttribute('aria-roledescription', `${width} by ${height} Go board`);
    svg.style.touchAction = (options.drawing || options.touch.mode !== 'direct') && !readOnly() ? 'none' : 'manipulation';
    if (options.drawing && !readOnly()) svg.setAttribute('aria-label', 'Go board ink tool. Drag to draw. Arrow keys move the cursor; Space adds a point; Enter finishes the stroke; Escape cancels.');
    else if (options.nodeId) svg.setAttribute('aria-label','Pinned read-only Go board. Arrow keys move the cursor; record navigation is controlled by the host.');
    else if (readOnly() && !options.onPoint) svg.setAttribute('aria-label', 'Read-only Go board. Arrow keys move the cursor; Page Up and Page Down navigate moves.');
    else if (readOnly()) svg.setAttribute('aria-label','Interactive Go board. Arrow keys move the cursor; Enter activates the intersection; Page Up and Page Down navigate displayed moves.');
    else svg.setAttribute('aria-label', 'Go board. Arrow keys move the cursor; Enter places a stone or marker; Page Up and Page Down navigate moves.');
    const fragment = document.createDocumentFragment();
    const defs=element('defs');
    for (const color of ['black','white'] as const) {
      const texture=options.stoneTextures[color];if (!texture) continue;
      const pattern=element('pattern',{id:`${textureId}-${color}`,patternUnits:'objectBoundingBox',patternContentUnits:'objectBoundingBox',width:1,height:1});
      pattern.append(element('image',{href:texture.dataUrl,x:0,y:0,width:1,height:1,preserveAspectRatio:'xMidYMid slice'}));defs.append(pattern);
    }
    if (defs.childNodes.length) fragment.append(defs);
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
      add('circle', { cx: point.x, cy: point.y, r: 0.46, fill: options.stoneTextures[color] ? `url(#${textureId}-${color})` : `var(--banora-${color},${color === 'black' ? '#20272a' : '#fbfaf4'})`, stroke: color === 'black' ? '#101618' : '#716957', 'stroke-width': 0.023, 'data-stone': `${x},${y}`,
        ...(options.stoneTextures[color] ? {'data-texture':color} : {}) });
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
    if (touchAim?.point) {
      const point = displayPoint(touchAim.point), occupied = board[touchAim.point.y*width+touchAim.point.x];
      add('circle',{cx:point.x,cy:point.y,r:0.46,fill:occupied ? 'none' : state.position.toPlay === 'black' ? '#20272a' : '#fff',
        opacity:0.65,stroke:'#12674e','stroke-width':0.07,'data-preview':'touch','data-target':`${touchAim.point.x},${touchAim.point.y}`});
    }
    const reference=options.compareTo && compareGeneration===state.recordGeneration ? controller.inspectNode(options.compareTo) : null;
    const compatible=reference && reference.position.width===width && reference.position.height===height;
    const differences=compatible ? comparePositions(reference.position,state.position) : [];
    svg.setAttribute('data-comparison-status',!options.compareTo ? 'none' : !reference ? 'unavailable' : compatible ? 'ready' : 'different-size');
    svg.setAttribute('data-difference-count',String(differences.length));
    for (const difference of differences) if (visible(difference.point)) {
      const point=displayPoint(difference.point);
      const kind=difference.before===null ? 'added' : difference.after===null ? 'removed' : 'replaced';
      const color=kind==='added' ? '#0f766e' : kind==='removed' ? '#b34343' : '#a66e13';
      const attributes={x:point.x-0.49,y:point.y-0.49,width:0.98,height:0.98,rx:0.12,fill:'none'};
      add('rect',{...attributes,stroke:'#fffdf4','stroke-width':0.18});
      add('rect',{...attributes,stroke:color,'stroke-width':0.08,'stroke-dasharray':kind==='removed' ? '0.12 0.08' : 'none',
        'data-difference':kind,'data-point':`${difference.point.x},${difference.point.y}`,
        'aria-label':`${coordinate(difference.point)}: ${difference.before ?? 'empty'} to ${difference.after ?? 'empty'}`});
      add('text',{x:point.x+0.32,y:point.y-0.31,'font-size':0.28,'font-weight':700,'font-family':'system-ui',
        'text-anchor':'middle',fill:color,stroke:'#fffdf4','stroke-width':0.035,'paint-order':'stroke'},kind==='added' ? '+' : kind==='removed' ? '−' : '↔');
    }
    if (hover && visible(hover) && !board[hover.y * width + hover.x] && !readOnly() && !options.drawing) {
      const point = displayPoint(hover);
      add('circle', {cx:point.x, cy:point.y, r:0.44, fill:state.position.toPlay === 'black' ? '#20272a' : '#fff', opacity:0.4, 'data-preview':''});
    }
    if (document.activeElement === svg) {
      const point = displayPoint(focus);
      add('rect', {x:point.x - 0.48, y:point.y - 0.48, width:0.96, height:0.96, rx:0.09,
        fill:'none', stroke:'#12674e', 'stroke-width':0.07, 'data-cursor':`${focus.x},${focus.y}`});
    }
    svg.replaceChildren(fragment);
    placement.sync(state,options,animationOptions);
    touchUI.render(touchAim?.point ? displayPoint(touchAim.point) : null,touchAim?.screen ?? null,
      touchAim?.point ? coordinate(touchAim.point) : '',touchAim?.pointer === null,options.touch.magnifier);
  }
  function coordinate(point: Point): string {return `${columnLabel(point.x)}${current.position.height-point.y}`;}
  function cancelTouch(): void {
    const pointer = touchAim?.pointer; touchAim = null;
    if (pointer !== undefined && pointer !== null) {
      cancelledPointer = pointer;
      if (svg.hasPointerCapture(pointer)) svg.releasePointerCapture(pointer);
    }
  }
  function confirmTouch(): void {
    const point = touchAim?.pointer === null ? touchAim.point : null;
    cancelTouch();
    try {if (point && !readOnly() && !options.drawing) {focus=point;activate(point);}}
    finally {if (!disposed) {render(current);svg.focus({preventScroll:true});}}
  }
  function announce(state: ControllerState): void {
    if (!available) return;
    live.textContent = `Move ${state.position.moveNumber}. ${state.position.toPlay} to play. Black captures ${state.position.captures.black}, white captures ${state.position.captures.white}.`;
  }
  function activate(point: Point): void {
    if (!available) return;
    if (options.onPoint) options.onPoint(Object.freeze({ ...point }));
    else if (!readOnly()) {
      const result = controller.play(point);
      if (!result.ok) live.textContent = `Move rejected: ${result.reason}.`;
    }
  }
  function logicalPointer(event: PointerEvent): Point | null {
    if (!available) return null;
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
    if (!points || points.length < 2 || !options.drawing || readOnly()) { render(current); return; }
    const result = controller.addStroke(points, options.drawing);
    live.textContent = result.ok ? 'Ink stroke added. Undo removes it.' : `Ink rejected: ${result.reason}.`;
    render(current);
  }
  svg.addEventListener('pointerdown', event => {
    if (cancelledPointer === event.pointerId) cancelledPointer = null;
    if (!options.drawing && event.pointerType === 'touch' && options.touch.mode !== 'direct' && !readOnly() &&
      event.button === 0 && event.isPrimary && touchAim?.pointer == null) {
      const point = pointerPoint(event);
      if (!point) {cancelTouch();render(current);return;}
      cancelTouch(); event.preventDefault(); svg.focus({preventScroll:true}); hover=null;
      touchAim = {pointer:event.pointerId,point,screen:{x:event.clientX,y:event.clientY}};
      try {svg.setPointerCapture(event.pointerId);}
      catch {cancelTouch();live.textContent='Placement cancelled: pointer capture is unavailable.';}
      render(current); if (touchAim) live.textContent=`${coordinate(point)} selected. Drag to aim; release ${options.touch.mode === 'confirm' ? 'then confirm' : 'to place'}.`;
      return;
    }
    if (!options.drawing || readOnly() || event.button !== 0 || !event.isPrimary || pendingStroke) return;
    const point = inkPoint(event);
    if (!point) return;
    event.preventDefault(); svg.focus({preventScroll:true}); hover = null;
    pendingStroke = {pointer:event.pointerId, points:[point]};
    try { svg.setPointerCapture(event.pointerId); }
    catch { cancelInk(); live.textContent = 'Ink cancelled: pointer capture is unavailable.'; }
    render(current);
  }, {signal:abort.signal});
  svg.addEventListener('pointermove', event => {
    if (touchAim?.pointer === event.pointerId) {
      event.preventDefault(); touchAim.point=pointerPoint(event);touchAim.screen={x:event.clientX,y:event.clientY};
      render(current);live.textContent=touchAim.point ? `${coordinate(touchAim.point)} selected.` : 'Outside board. Release to cancel.';return;
    }
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
    if (touchAim?.pointer === event.pointerId) {
      event.preventDefault(); const point = pointerPoint(event);cancelTouch();
      try {
        if (point) {
          focus=point;
          if (options.touch.mode === 'confirm') {touchAim={pointer:null,point,screen:null};live.textContent=`${coordinate(point)} selected. Confirm placement or cancel. Enter confirms; Escape cancels.`;}
          else activate(point);
        } else live.textContent='Placement cancelled: release inside the board.';
      } finally {if (!disposed) render(current);}
      return;
    }
    // A cancelled/non-primary touch may not fall through into immediate placement.
    if (event.pointerType === 'touch' && options.touch.mode !== 'direct' && !readOnly() && !options.drawing) return;
    if (touchAim) cancelTouch();
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
    if (touchAim?.pointer === event.pointerId) {cancelTouch();render(current);live.textContent='Placement cancelled.';}
    if (pendingStroke?.pointer === event.pointerId) { cancelInk(); render(current); live.textContent = 'Ink cancelled.'; }
  }, {signal:abort.signal});
  svg.addEventListener('focus', () => render(current), { signal: abort.signal });
  svg.addEventListener('blur', () => { cancelInk(); if (touchAim?.pointer !== null) cancelTouch(); render(current); }, { signal: abort.signal });
  svg.addEventListener('keydown', event => {
    if (!available) return;
    const crop = cropFor(current);
    const shifts: Record<string, Point> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };
    if (shifts[event.key]) {
      event.preventDefault();
      const shift = shifts[event.key]!;
      const shown = toDisplayPoint(focus, current.position, options.transform);
      const logical = toLogicalPoint({x:shown.x+shift.x, y:shown.y+shift.y}, current.position, options.transform);
      focus = { x: Math.max(crop.x, Math.min(crop.x + crop.width - 1, logical.x)),
        y: Math.max(crop.y, Math.min(crop.y + crop.height - 1, logical.y)) };
      if (touchAim?.pointer === null) touchAim.point={...focus};
      render(current); live.textContent = `${columnLabel(focus.x)}${current.position.height - focus.y}. ${current.position.board[focus.y * current.position.width + focus.x] ?? 'Empty'}.`;
    } else if (event.key === 'Escape') { cancelInk(); cancelTouch(); render(current); live.textContent = 'Pending input cancelled.'; }
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (touchAim?.pointer === null) {confirmTouch();return;}
      if (touchAim) return;
      if (options.drawing) {
        if (readOnly() || (pendingStroke && pendingStroke.pointer !== null)) return;
        if (!pendingStroke) { pendingStroke = {pointer:null, points:[{...focus}]}; live.textContent = 'Ink started. Move the cursor and add points with Space; Enter finishes.'; }
        else { appendInk({...focus}); if (event.key === 'Enter') finishInk(); }
        render(current);
      } else activate(focus);
    }
    else if (event.key === 'PageUp' || event.key === 'PageDown') { event.preventDefault(); if (!options.nodeId) event.key === 'PageUp' ? controller.previous() : controller.next(); }
  }, { signal: abort.signal });
  cropFor(current);
  const unsubscribe = controller.subscribe(state => {
    if (state.record !== current.record || state.node.id !== current.node.id) {cancelInk();cancelTouch();}
    render(state); announce(current);
  });
  return Object.freeze({ controller,
    exportSvg(config: DiagramOptions = {}) {
      if (disposed) throw new Error('Board view is disposed');
      if (!available) throw new Error('Pinned node is unavailable');
      return serializeBoardDiagram(svg,config).text;
    },
    async exportPng(config: DiagramOptions = {}) {
      if (disposed) throw new Error('Board view is disposed');
      if (!available) throw new Error('Pinned node is unavailable');
      return rasterizeBoardDiagram(document,serializeBoardDiagram(svg,config),abort.signal);
    },
    update(next: Omit<BoardOptions, 'controller'>) {
      if (disposed) throw new Error('Board view is disposed');
      validateReferences(next,true);
      validateGeneration(next.referenceGeneration);
      const nextAnimation=Object.hasOwn(next,'placementAnimation') ? normalizePlacementAnimation(next.placementAnimation) : animationOptions;
      const previous = options;
      options = { ...options, ...next, transform: normalizeBoardTransform(Object.hasOwn(next, 'transform') ? next.transform : options.transform),
        drawing: Object.hasOwn(next, 'drawing') ? next.drawing ? normalizeStrokeStyle(next.drawing) : null : options.drawing,
        touch: Object.hasOwn(next,'touch') ? normalizeTouchOptions(next.touch) : options.touch,
        stoneTextures:Object.hasOwn(next,'stoneTextures') ? normalizeStoneTextures(next.stoneTextures) : options.stoneTextures };
      try {cropFor(options.nodeId ? controller.inspectNode(options.nodeId) ?? controller.getState() : controller.getState());}
      catch (error) {options=previous;throw error;}
      animationOptions=nextAnimation;
      if (next.referenceGeneration!==undefined || (Object.hasOwn(next,'nodeId') && next.nodeId!==previous.nodeId)) nodeGeneration=next.referenceGeneration ?? controller.getState().recordGeneration;
      if (next.referenceGeneration!==undefined || (Object.hasOwn(next,'compareTo') && next.compareTo!==previous.compareTo)) compareGeneration=next.referenceGeneration ?? controller.getState().recordGeneration;
      cancelInk(); cancelTouch(); render(controller.getState());
    },
    dispose() {
      if (disposed) return;
      disposed = true; cancelInk(); cancelTouch(); abort.abort(); unsubscribe(); touchUI.dispose(); svg.remove(); live.remove();
      if (owned) controller.dispose();
    },
  });
}

import type { Point } from './core.js';
import type {
  BoardBinding,
  BoardFrame,
  BoardSurfaceOptions,
  BoardSurfaceView,
} from './board-frame.js';
import { boardContains, boardMessage } from './board-frame.js';
import {
  normalizeBoardTransform,
  displayCrop,
  toDisplayPoint,
  toLogicalPoint,
} from './geometry.js';
import type { BoardCrop } from './geometry.js';
import { rasterizeBoardDiagram, serializeBoardDiagram } from './diagram-export.js';
import type { DiagramOptions } from './diagram-export.js';
import { normalizeStrokeStyle, strokeLimits } from './annotations.js';
import { mountTouchUI, normalizeTouchOptions } from './touch-aim.js';
import { normalizeStoneTextures } from './stone-textures.js';
import { mountPlacementAnimation, normalizePlacementAnimation } from './placement-animation.js';
import { BOARD_PADDING } from './board-layout.js';
import { paintBoard, paintBoardHover } from './board-paint.js';
const namespace = 'http://www.w3.org/2000/svg';
const padding = BOARD_PADDING;
const letters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';
const columnLabel = (index: number) => letters[index] ?? String(index + 1);
let boardSequence = 0;

/** Browser globals are used only during mounting; importing this module is SSR-safe. */
export function mountBoardSurface(
  container: HTMLElement,
  initial: BoardSurfaceOptions,
  controller: BoardBinding,
): BoardSurfaceView {
  const document = container.ownerDocument;
  const textureId = `banora-texture-${++boardSequence}`;
  let options = {
    ...initial,
    transform: normalizeBoardTransform(initial.transform),
    drawing: initial.drawing ? normalizeStrokeStyle(initial.drawing) : null,
    touch: normalizeTouchOptions(initial.touch),
    stoneTextures: normalizeStoneTextures(initial.stoneTextures),
  };
  let animationOptions = normalizePlacementAnimation(initial.placementAnimation);
  let disposed = false;
  let current = controller.getState();
  let nodeGeneration = options.referenceGeneration ?? current.recordGeneration,
    compareGeneration = nodeGeneration;
  let available = true;
  let focus: Point = { x: 0, y: 0 };
  let hover: Point | null = null;
  let hoverLayer: SVGElement | undefined;
  let pendingStroke: { pointer: number | null; points: Point[] } | null = null;
  let cancelledPointer: number | null = null;
  let touchAim: { pointer: number | null; point: Point | null; screen: Point | null } | null = null;
  const abort = new AbortController();
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('role', 'application');
  svg.setAttribute('tabindex', '0');
  svg.setAttribute(
    'aria-label',
    'Go board. Arrow keys move the cursor; Enter places a stone or marker; Page Up and Page Down navigate moves.',
  );
  svg.style.cssText =
    'display:block;width:100%;height:auto;touch-action:manipulation;outline-offset:4px;border-radius:12px;';
  const live = document.createElement('span');
  live.setAttribute('aria-live', 'polite');
  live.style.cssText =
    'position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;';
  validateGeneration(initial.referenceGeneration);
  validateReferences(initial);
  if (options.nodeId) current = controller.inspectNode(options.nodeId)!;
  cropFor(current);
  container.append(svg, live);
  const placement = mountPlacementAnimation(svg, abort.signal);
  const touchUI = mountTouchUI(
    container,
    svg,
    confirmTouch,
    () => {
      cancelTouch();
      render(current);
      svg.focus({ preventScroll: true });
      live.textContent = 'Placement cancelled.';
    },
    abort.signal,
    () => options.labels,
  );
  document.defaultView?.addEventListener(
    'resize',
    () => {
      if (touchAim) {
        cancelTouch();
        render(current);
        live.textContent = 'Placement cancelled: viewport changed.';
      }
    },
    { signal: abort.signal },
  );

  function element(
    name: string,
    attributes: Record<string, string | number> = {},
    text?: string,
  ): SVGElement {
    const node = document.createElementNS(namespace, name);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function validateReferences(
    config: Pick<BoardSurfaceOptions, 'nodeId' | 'compareTo'>,
    changing = false,
  ): void {
    for (const key of ['nodeId', 'compareTo'] as const) {
      const id = config[key];
      if (changing && id === options[key]) continue;
      if (id != null && (typeof id !== 'string' || !id || !controller.inspectNode(id)))
        throw new RangeError('Board node reference does not exist');
    }
  }
  function validateGeneration(generation: number | undefined): void {
    if (generation !== undefined && (!Number.isSafeInteger(generation) || generation < 0))
      throw new RangeError('Reference generation must be a nonnegative integer');
  }
  function readOnly(): boolean {
    return !!options.readOnly || options.nodeId != null;
  }
  function cropFor(state: BoardFrame): BoardCrop {
    const crop = options.crop ?? {
      x: 0,
      y: 0,
      width: state.position.width,
      height: state.position.height,
    };
    if (
      ![crop.x, crop.y, crop.width, crop.height].every(Number.isInteger) ||
      crop.width < 1 ||
      crop.height < 1 ||
      crop.x < 0 ||
      crop.y < 0 ||
      crop.x + crop.width > state.position.width ||
      crop.y + crop.height > state.position.height
    ) {
      throw new RangeError('Crop must be an integer rectangle inside the board');
    }
    return crop;
  }
  function visible(point: Point): boolean {
    const crop = cropFor(current);
    return (
      point.x >= crop.x &&
      point.y >= crop.y &&
      point.x < crop.x + crop.width &&
      point.y < crop.y + crop.height &&
      (current.visiblePoints === null ||
        current.visiblePoints.has(point.y * current.position.width + point.x))
    );
  }
  function displayPoint(point: Point): Point {
    const displayed = toDisplayPoint(point, current.position, options.transform);
    return { x: displayed.x + padding, y: displayed.y + padding };
  }
  function renderHover(): void {
    if (hoverLayer)
      paintBoardHover(hoverLayer, {
        state: current,
        hover,
        visible,
        readOnly,
        options,
        displayPoint,
        element,
      });
  }
  function render(state: BoardFrame): void {
    if (readOnly() || options.drawing) hover = null;
    if (options.nodeId) {
      const pinned =
        nodeGeneration === state.recordGeneration ? controller.inspectNode(options.nodeId) : null;
      if (!pinned) {
        placement.cancel();
        available = false;
        current = state;
        cancelInk();
        cancelTouch();
        hover = null;
        hoverLayer = undefined;
        svg.setAttribute('viewBox', '0 0 12 3');
        svg.setAttribute('data-node-status', 'unavailable');
        svg.setAttribute('data-comparison-status', 'unavailable');
        svg.setAttribute('data-difference-count', '0');
        svg.setAttribute('data-node-id', options.nodeId);
        svg.setAttribute(
          'aria-label',
          'Pinned node is unavailable. Choose another node or restore the branch.',
        );
        svg.replaceChildren(
          element(
            'text',
            {
              x: 6,
              y: 1.6,
              'text-anchor': 'middle',
              'font-size': 0.4,
              'font-family': 'system-ui',
              fill: '#687b69',
            },
            'Node unavailable',
          ),
        );
        touchUI.render(null, null, '', false, false);
        live.textContent = 'Pinned node is unavailable.';
        return;
      }
      state = pinned;
    }
    available = true;
    current = state;
    const { width, height } = state.position;
    // A host record replacement can invalidate an old crop. Reset it on size changes.
    if (
      options.crop &&
      (options.crop.x + options.crop.width > width || options.crop.y + options.crop.height > height)
    )
      options = { ...options, crop: null };
    const crop = cropFor(state);
    const displayedCrop = displayCrop(crop, state.position, options.transform);
    if (!visible(focus)) {
      focus = { x: crop.x, y: crop.y };
      if (current.visiblePoints !== null) {
        const index = [...current.visiblePoints].find((index) =>
          visible({ x: index % width, y: Math.floor(index / width) }),
        );
        if (index !== undefined) focus = { x: index % width, y: Math.floor(index / width) };
      }
    }
    svg.setAttribute(
      'viewBox',
      `${displayedCrop.x} ${displayedCrop.y} ${displayedCrop.width - 1 + padding * 2} ${displayedCrop.height - 1 + padding * 2}`,
    );
    svg.setAttribute('data-board-width', String(width));
    svg.setAttribute('data-board-height', String(height));
    svg.setAttribute('data-rotation', String(options.transform.rotation));
    svg.setAttribute('data-flip-x', String(options.transform.flipX));
    svg.setAttribute('data-node-id', state.nodeId);
    svg.setAttribute('data-node-status', 'ready');
    svg.setAttribute('aria-roledescription', `${width} by ${height} Go board`);
    svg.style.touchAction =
      (options.drawing || options.touch.mode !== 'direct') && !readOnly() ? 'none' : 'manipulation';
    if (options.drawing && !readOnly())
      svg.setAttribute(
        'aria-label',
        'Go board ink tool. Drag to draw. Arrow keys move the cursor; Space adds a point; Enter finishes the stroke; Escape cancels.',
      );
    else if (options.nodeId)
      svg.setAttribute(
        'aria-label',
        'Pinned read-only Go board. Arrow keys move the cursor; record navigation is controlled by the host.',
      );
    else if (readOnly() && !options.onPoint)
      svg.setAttribute(
        'aria-label',
        'Read-only Go board. Arrow keys move the cursor; Page Up and Page Down navigate moves.',
      );
    else if (readOnly())
      svg.setAttribute(
        'aria-label',
        'Interactive Go board. Arrow keys move the cursor; Enter activates the intersection; Page Up and Page Down navigate displayed moves.',
      );
    else
      svg.setAttribute(
        'aria-label',
        'Go board. Arrow keys move the cursor; Enter places a stone or marker; Page Up and Page Down navigate moves.',
      );
    if (options.labels?.board) svg.setAttribute('aria-label', options.labels.board);
    const reference =
      options.compareTo && compareGeneration === state.recordGeneration
        ? controller.inspectNode(options.compareTo)
        : null;
    hoverLayer = paintBoard({
      document,
      svg,
      state,
      options,
      crop,
      textureId,
      focus,
      hover,
      pendingStroke,
      touchAim,
      reference,
      element,
      displayPoint,
      visible,
      coordinate,
      readOnly,
    });
    if (state.recordState) placement.sync(state.recordState, options, animationOptions);
    else placement.cancel();
    touchUI.render(
      touchAim?.point ? displayPoint(touchAim.point) : null,
      touchAim?.screen ?? null,
      touchAim?.point ? coordinate(touchAim.point) : '',
      touchAim?.pointer === null,
      options.touch.magnifier,
    );
  }
  function coordinate(point: Point): string {
    return `${columnLabel(point.x)}${current.position.height - point.y}`;
  }
  function cancelTouch(): void {
    const pointer = touchAim?.pointer;
    touchAim = null;
    if (pointer !== undefined && pointer !== null) {
      cancelledPointer = pointer;
      if (svg.hasPointerCapture(pointer)) svg.releasePointerCapture(pointer);
    }
  }
  function confirmTouch(): void {
    const point = touchAim?.pointer === null ? touchAim.point : null;
    cancelTouch();
    try {
      if (point && !readOnly() && !options.drawing) {
        focus = point;
        activate(point);
      }
    } finally {
      if (!disposed) {
        render(current);
        svg.focus({ preventScroll: true });
      }
    }
  }
  function announce(state: BoardFrame): void {
    if (!available) return;
    live.textContent = boardMessage(
      options.labels?.state ??
        'Move {moveNumber}. {toPlay} to play. Black captures {blackCaptures}, white captures {whiteCaptures}.',
      {
        moveNumber: state.position.moveNumber,
        toPlay: options.labels?.[state.position.toPlay] ?? state.position.toPlay,
        blackCaptures: state.position.captures.black,
        whiteCaptures: state.position.captures.white,
      },
    );
  }
  function activate(point: Point): void {
    if (!available) return;
    if (
      options.variationHints &&
      !options.onPoint &&
      !options.nodeId &&
      !options.drawing &&
      controller.selectVariation?.(point)
    )
      return;
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
    const screen = svg.createSVGPoint();
    screen.x = event.clientX;
    screen.y = event.clientY;
    const displayed = screen.matrixTransform(matrix.inverse());
    return toLogicalPoint(
      { x: displayed.x - padding, y: displayed.y - padding },
      current.position,
      options.transform,
    );
  }
  function pointerPoint(event: PointerEvent): Point | null {
    const logical = logicalPointer(event);
    if (!logical) return null;
    const point = { x: Math.round(logical.x), y: Math.round(logical.y) };
    return boardContains(current.position, point) && visible(point) ? point : null;
  }
  function inkPoint(event: PointerEvent): Point | null {
    const point = logicalPointer(event),
      crop = cropFor(current);
    if (
      !point ||
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      point.x < crop.x - 0.00001 ||
      point.y < crop.y - 0.00001 ||
      point.x > crop.x + crop.width - 1 + 0.00001 ||
      point.y > crop.y + crop.height - 1 + 0.00001
    )
      return null;
    if (!visible({ x: Math.round(point.x), y: Math.round(point.y) })) return null;
    return {
      x: Math.max(crop.x, Math.min(crop.x + crop.width - 1, point.x)),
      y: Math.max(crop.y, Math.min(crop.y + crop.height - 1, point.y)),
    };
  }
  function cancelInk(): void {
    const pointer = pendingStroke?.pointer;
    pendingStroke = null;
    if (pointer !== undefined && pointer !== null) cancelledPointer = pointer;
    if (pointer !== undefined && pointer !== null && svg.hasPointerCapture(pointer))
      svg.releasePointerCapture(pointer);
  }
  function appendInk(point: Point): void {
    if (!pendingStroke) return;
    const last = pendingStroke.points.at(-1)!;
    if (Math.hypot(point.x - last.x, point.y - last.y) < 0.01) return;
    if (pendingStroke.points.length >= strokeLimits.pointsPerStroke) {
      cancelInk();
      live.textContent = 'Stroke cancelled: more than 512 sampled points. Draw shorter strokes.';
    } else pendingStroke.points.push(point);
  }
  function finishInk(): void {
    const points = pendingStroke?.points;
    cancelInk();
    if (!points || points.length < 2 || !options.drawing || readOnly()) {
      render(current);
      return;
    }
    const result = controller.addStroke(points, options.drawing);
    live.textContent = result.ok
      ? 'Ink stroke added. Undo removes it.'
      : `Ink rejected: ${result.reason}.`;
    render(current);
  }
  svg.addEventListener(
    'pointerdown',
    (event) => {
      if (cancelledPointer === event.pointerId) cancelledPointer = null;
      if (
        !options.drawing &&
        event.pointerType === 'touch' &&
        options.touch.mode !== 'direct' &&
        !readOnly() &&
        event.button === 0 &&
        event.isPrimary &&
        touchAim?.pointer == null
      ) {
        const point = pointerPoint(event);
        if (!point) {
          cancelTouch();
          render(current);
          return;
        }
        cancelTouch();
        event.preventDefault();
        svg.focus({ preventScroll: true });
        hover = null;
        touchAim = {
          pointer: event.pointerId,
          point,
          screen: { x: event.clientX, y: event.clientY },
        };
        try {
          svg.setPointerCapture(event.pointerId);
        } catch {
          cancelTouch();
          live.textContent = 'Placement cancelled: pointer capture is unavailable.';
        }
        render(current);
        if (touchAim)
          live.textContent = `${coordinate(point)} selected. Drag to aim; release ${options.touch.mode === 'confirm' ? 'then confirm' : 'to place'}.`;
        return;
      }
      if (!options.drawing || readOnly() || event.button !== 0 || !event.isPrimary || pendingStroke)
        return;
      const point = inkPoint(event);
      if (!point) return;
      event.preventDefault();
      svg.focus({ preventScroll: true });
      hover = null;
      pendingStroke = { pointer: event.pointerId, points: [point] };
      try {
        svg.setPointerCapture(event.pointerId);
      } catch {
        cancelInk();
        live.textContent = 'Ink cancelled: pointer capture is unavailable.';
      }
      render(current);
    },
    { signal: abort.signal },
  );
  svg.addEventListener(
    'pointermove',
    (event) => {
      if (touchAim?.pointer === event.pointerId) {
        event.preventDefault();
        touchAim.point = pointerPoint(event);
        touchAim.screen = { x: event.clientX, y: event.clientY };
        render(current);
        live.textContent = touchAim.point
          ? `${coordinate(touchAim.point)} selected.`
          : 'Outside board. Release to cancel.';
        return;
      }
      if (pendingStroke?.pointer === event.pointerId) {
        event.preventDefault();
        const point = inkPoint(event);
        if (point) appendInk(point);
        render(current);
        return;
      }
      if (options.drawing || readOnly() || !available) return;
      const point = pointerPoint(event);
      if (point?.x !== hover?.x || point?.y !== hover?.y) {
        hover = point;
        renderHover();
      }
    },
    { signal: abort.signal },
  );
  svg.addEventListener(
    'pointerleave',
    () => {
      if (!hover) return;
      hover = null;
      renderHover();
    },
    { signal: abort.signal },
  );
  svg.addEventListener(
    'pointerup',
    (event) => {
      if (cancelledPointer === event.pointerId) {
        cancelledPointer = null;
        return;
      }
      if (event.button !== 0) return;
      if (touchAim?.pointer === event.pointerId) {
        event.preventDefault();
        const point = pointerPoint(event);
        cancelTouch();
        try {
          if (point) {
            focus = point;
            if (options.touch.mode === 'confirm') {
              touchAim = { pointer: null, point, screen: null };
              live.textContent = `${coordinate(point)} selected. Confirm placement or cancel. Enter confirms; Escape cancels.`;
            } else activate(point);
          } else live.textContent = 'Placement cancelled: release inside the board.';
        } finally {
          if (!disposed) render(current);
        }
        return;
      }
      // A cancelled/non-primary touch may not fall through into immediate placement.
      if (
        event.pointerType === 'touch' &&
        options.touch.mode !== 'direct' &&
        !readOnly() &&
        !options.drawing
      )
        return;
      if (touchAim) cancelTouch();
      if (options.drawing) {
        if (pendingStroke?.pointer !== event.pointerId) return;
        event.preventDefault();
        const point = inkPoint(event);
        if (point) {
          appendInk(point);
          finishInk();
        } else {
          cancelInk();
          render(current);
          live.textContent = 'Ink cancelled: release inside the board.';
        }
        return;
      }
      const point = pointerPoint(event);
      if (point) {
        focus = point;
        svg.focus({ preventScroll: true });
        activate(point);
        render(current);
      }
    },
    { signal: abort.signal },
  );
  for (const name of ['pointercancel', 'lostpointercapture'] as const)
    svg.addEventListener(
      name,
      (event) => {
        if (touchAim?.pointer === event.pointerId) {
          cancelTouch();
          render(current);
          live.textContent = 'Placement cancelled.';
        }
        if (pendingStroke?.pointer === event.pointerId) {
          cancelInk();
          render(current);
          live.textContent = 'Ink cancelled.';
        }
      },
      { signal: abort.signal },
    );
  svg.addEventListener(
    'contextmenu',
    (event) => {
      if (!available || !options.onContextMenu) return;
      const point = pointerPoint(event);
      if (!point) return;
      event.preventDefault();
      options.onContextMenu(
        Object.freeze({ ...point }),
        Object.freeze({ x: event.clientX, y: event.clientY }),
      );
    },
    { signal: abort.signal },
  );
  svg.addEventListener('focus', () => render(current), { signal: abort.signal });
  svg.addEventListener(
    'blur',
    () => {
      cancelInk();
      if (touchAim?.pointer !== null) cancelTouch();
      render(current);
    },
    { signal: abort.signal },
  );
  svg.addEventListener(
    'keydown',
    (event) => {
      if (!available) return;
      const crop = cropFor(current);
      const shifts: Record<string, Point> = {
        ArrowLeft: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 },
        ArrowUp: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 },
      };
      if (
        options.onContextMenu &&
        (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey))
      ) {
        if (visible(focus)) {
          event.preventDefault();
          const bounds = svg.getBoundingClientRect();
          options.onContextMenu(
            Object.freeze({ ...focus }),
            Object.freeze({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }),
          );
        }
        return;
      }
      if (shifts[event.key]) {
        event.preventDefault();
        const shift = shifts[event.key]!;
        const shown = toDisplayPoint(focus, current.position, options.transform);
        const logical = toLogicalPoint(
          { x: shown.x + shift.x, y: shown.y + shift.y },
          current.position,
          options.transform,
        );
        let target = {
          x: Math.max(crop.x, Math.min(crop.x + crop.width - 1, logical.x)),
          y: Math.max(crop.y, Math.min(crop.y + crop.height - 1, logical.y)),
        };
        if (current.visiblePoints !== null) {
          const dx = logical.x - focus.x,
            dy = logical.y - focus.y;
          for (
            let steps = 0;
            steps < Math.max(current.position.width, current.position.height) && !visible(target);
            steps++
          )
            target = { x: target.x + dx, y: target.y + dy };
        }
        if (visible(target)) focus = target;
        if (touchAim?.pointer === null) touchAim.point = { ...focus };
        render(current);
        const stone = current.position.board[focus.y * current.position.width + focus.x];
        const description = current.overlays
          .filter(
            (overlay) =>
              overlay.point.x === focus.x && overlay.point.y === focus.y && overlay.ariaLabel,
          )
          .map((overlay) => overlay.ariaLabel)
          .join('. ');
        live.textContent =
          boardMessage(options.labels?.point ?? '{coordinate}. {stone}.', {
            coordinate: coordinate(focus),
            stone: stone ? (options.labels?.[stone] ?? stone) : (options.labels?.empty ?? 'Empty'),
          }) + (description ? ' ' + description : '');
      } else if (event.key === 'Escape') {
        cancelInk();
        cancelTouch();
        render(current);
        live.textContent = 'Pending input cancelled.';
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!visible(focus)) return;
        if (touchAim?.pointer === null) {
          confirmTouch();
          return;
        }
        if (touchAim) return;
        if (options.drawing) {
          if (readOnly() || (pendingStroke && pendingStroke.pointer !== null)) return;
          if (!pendingStroke) {
            pendingStroke = { pointer: null, points: [{ ...focus }] };
            live.textContent =
              'Ink started. Move the cursor and add points with Space; Enter finishes.';
          } else {
            appendInk({ ...focus });
            if (event.key === 'Enter') finishInk();
          }
          render(current);
        } else if (visible(focus)) activate(focus);
      } else if (event.key === 'PageUp' || event.key === 'PageDown') {
        event.preventDefault();
        if (!options.nodeId) {
          if (event.key === 'PageUp') controller.previous();
          else controller.next();
        }
      }
    },
    { signal: abort.signal },
  );
  cropFor(current);
  const unsubscribe = controller.subscribe((state) => {
    if (state.identity !== current.identity || state.nodeId !== current.nodeId) {
      cancelInk();
      cancelTouch();
    }
    render(state);
    announce(current);
  });
  return Object.freeze({
    announce(message: string) {
      if (disposed) throw new Error('Board view is disposed');
      if (typeof message !== 'string' || message.length > 4096)
        throw new TypeError('Announcement must be bounded text');
      live.textContent = message;
    },
    exportSvg(config: DiagramOptions = {}) {
      if (disposed) throw new Error('Board view is disposed');
      if (!available) throw new Error('Pinned node is unavailable');
      return serializeBoardDiagram(svg, config).text;
    },
    async exportPng(config: DiagramOptions = {}) {
      if (disposed) throw new Error('Board view is disposed');
      if (!available) throw new Error('Pinned node is unavailable');
      return rasterizeBoardDiagram(document, serializeBoardDiagram(svg, config), abort.signal);
    },
    update(next: BoardSurfaceOptions) {
      if (disposed) throw new Error('Board view is disposed');
      validateReferences(next, true);
      validateGeneration(next.referenceGeneration);
      const nextAnimation = Object.hasOwn(next, 'placementAnimation')
        ? normalizePlacementAnimation(next.placementAnimation)
        : animationOptions;
      const previous = options;
      options = {
        ...options,
        ...next,
        transform: normalizeBoardTransform(
          Object.hasOwn(next, 'transform') ? next.transform : options.transform,
        ),
        drawing: Object.hasOwn(next, 'drawing')
          ? next.drawing
            ? normalizeStrokeStyle(next.drawing)
            : null
          : options.drawing,
        touch: Object.hasOwn(next, 'touch') ? normalizeTouchOptions(next.touch) : options.touch,
        stoneTextures: Object.hasOwn(next, 'stoneTextures')
          ? normalizeStoneTextures(next.stoneTextures)
          : options.stoneTextures,
      };
      try {
        cropFor(
          options.nodeId
            ? (controller.inspectNode(options.nodeId) ?? controller.getState())
            : controller.getState(),
        );
      } catch (error) {
        options = previous;
        throw error;
      }
      animationOptions = nextAnimation;
      if (
        next.referenceGeneration !== undefined ||
        (Object.hasOwn(next, 'nodeId') && next.nodeId !== previous.nodeId)
      )
        nodeGeneration = next.referenceGeneration ?? controller.getState().recordGeneration;
      if (
        next.referenceGeneration !== undefined ||
        (Object.hasOwn(next, 'compareTo') && next.compareTo !== previous.compareTo)
      )
        compareGeneration = next.referenceGeneration ?? controller.getState().recordGeneration;
      cancelInk();
      cancelTouch();
      render(controller.getState());
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelInk();
      cancelTouch();
      abort.abort();
      unsubscribe();
      touchUI.dispose();
      hoverLayer = undefined;
      svg.remove();
      live.remove();
      controller.dispose();
    },
  });
}

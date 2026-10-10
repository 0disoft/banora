import type { BoardOverlay } from './board-state.js';
import type { Point } from './core.js';

type Add = (name: string, attrs: Record<string, string | number>, text?: string) => SVGElement;
/** Checked data primitives only; the SDK owns element creation and export behavior. */
export function paintBoardOverlays(
  overlays: readonly BoardOverlay[],
  heatmap: boolean,
  add: Add,
  displayPoint: (point: Point) => Point,
  visible: (point: Point) => boolean,
): void {
  for (const overlay of overlays) {
    if ((overlay.kind === 'heatmap') !== heatmap || !visible(overlay.point)) continue;
    const at = displayPoint(overlay.point);
    const common = {
      opacity: overlay.opacity ?? 1,
      'data-overlay': overlay.kind,
      'data-point': `${overlay.point.x},${overlay.point.y}`,
      ...(overlay.ariaLabel ? { 'aria-label': overlay.ariaLabel } : {}),
    };
    if (heatmap)
      add('rect', {
        ...common,
        x: at.x - 0.49,
        y: at.y - 0.49,
        width: 0.98,
        height: 0.98,
        fill: overlay.color,
      });
    else if (overlay.kind === 'ring')
      add('circle', {
        ...common,
        cx: at.x,
        cy: at.y,
        r: 0.4,
        fill: 'none',
        stroke: overlay.color,
        'stroke-width': 0.07,
      });
    else add('circle', { ...common, cx: at.x, cy: at.y, r: 0.35, fill: overlay.color });
    if (!heatmap && overlay.label !== undefined)
      add(
        'text',
        {
          x: at.x,
          y: at.y + 0.1,
          'text-anchor': 'middle',
          'font-family': 'system-ui',
          'font-size': 0.3,
          fill: overlay.textColor ?? '#ffffff',
          opacity: overlay.opacity ?? 1,
          'data-overlay-label': overlay.kind,
        },
        overlay.label,
      );
  }
}

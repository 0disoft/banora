import type { Point } from './core.js';
import type { BoardLabels } from './board-state.js';
import { boardMessage } from './board-frame.js';

export interface TouchOptions {
  readonly mode?: 'direct' | 'release' | 'confirm';
  readonly magnifier?: boolean;
}
export function normalizeTouchOptions(
  input?: TouchOptions | null,
): Readonly<Required<TouchOptions>> {
  if (input != null && (typeof input !== 'object' || Array.isArray(input)))
    throw new TypeError('Touch options must be an object or null');
  const mode = input?.mode === undefined ? (input ? 'release' : 'direct') : input.mode;
  const magnifier = input?.magnifier === undefined ? true : input.magnifier;
  if (!['direct', 'release', 'confirm'].includes(mode) || typeof magnifier !== 'boolean')
    throw new RangeError('Touch mode must be direct, release or confirm, with a boolean magnifier');
  return Object.freeze({ mode, magnifier });
}

/** View-owned transient UI; it never mutates a record or enters diagram exports. */
export function mountTouchUI(
  container: HTMLElement,
  svg: SVGSVGElement,
  confirm: () => void,
  cancel: () => void,
  signal: AbortSignal,
  labels: () => BoardLabels | undefined = () => undefined,
) {
  const document = container.ownerDocument,
    namespace = 'http://www.w3.org/2000/svg';
  const lens = document.createElement('div');
  lens.setAttribute('data-touch-lens', '');
  lens.setAttribute('aria-hidden', 'true');
  lens.style.cssText =
    'display:none;position:fixed;width:144px;height:144px;border:3px solid #275c4b;border-radius:50%;overflow:hidden;box-shadow:0 6px 24px #0004;pointer-events:none;z-index:1000;background:#d9b677;box-sizing:border-box;';
  const panel = document.createElement('div');
  panel.setAttribute('data-touch-confirm', '');
  panel.setAttribute('role', 'group');
  panel.style.cssText =
    'display:none;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;margin-top:12px;font:15px system-ui;color:#173d31;';
  const prompt = document.createElement('span');
  const accept = document.createElement('button'),
    reject = document.createElement('button');
  for (const button of [accept, reject]) {
    button.type = 'button';
    button.style.cssText =
      'font:inherit;padding:9px 14px;border:1px solid #9fb9a6;border-radius:8px;background:#fff;color:#173d31;cursor:pointer;';
  }
  reject.textContent = 'Cancel placement';
  panel.append(prompt, accept, reject);
  container.append(panel);
  document.body.append(lens);
  accept.addEventListener('click', confirm, { signal });
  reject.addEventListener('click', cancel, { signal });
  panel.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        cancel();
      }
    },
    { signal },
  );

  // Full board paints replace all root children, invalidating this single-frame cache.
  let cached: { source: Element | null; x: number; y: number } | null = null;
  return {
    render(
      point: Point | null,
      screen: Point | null,
      label: string,
      awaiting: boolean,
      magnifier: boolean,
    ) {
      panel.style.display = awaiting && point ? 'flex' : 'none';
      panel.setAttribute(
        'aria-label',
        boardMessage(labels()?.placement ?? 'Placement at {coordinate}', { coordinate: label }),
      );
      prompt.textContent = boardMessage(labels()?.selected ?? '{coordinate} selected.', {
        coordinate: label,
      });
      accept.textContent = boardMessage(labels()?.confirm ?? 'Confirm placement at {coordinate}', {
        coordinate: label,
      });
      reject.textContent = labels()?.cancel ?? 'Cancel placement';
      if (!point || !screen || awaiting || !magnifier) {
        lens.style.display = 'none';
        lens.replaceChildren();
        cached = null;
        return;
      }
      const window = document.defaultView!;
      const inherited = window.getComputedStyle(svg);
      let background: Element | undefined;
      for (const child of svg.children) {
        if (child.tagName !== 'rect') continue;
        background = child;
        break;
      }
      if (background) lens.style.background = window.getComputedStyle(background).fill;
      for (const name of ['board', 'grid', 'black', 'white', 'annotation']) {
        const key = `--banora-${name}`,
          value = inherited.getPropertyValue(key);
        if (value) lens.style.setProperty(key, value);
        else lens.style.removeProperty(key);
      }
      const size = Math.max(0, Math.min(144, window.innerWidth - 16, window.innerHeight - 16));
      const top = screen.y - size - 38 >= 8 ? screen.y - size - 38 : screen.y + 38;
      lens.style.width = lens.style.height = `${size}px`;
      lens.style.left = `${Math.max(8, Math.min(window.innerWidth - size - 8, screen.x - size / 2))}px`;
      lens.style.top = `${Math.max(8, Math.min(window.innerHeight - size - 8, top))}px`;
      lens.style.display = 'block';
      if (cached?.source === svg.firstElementChild && cached.x === point.x && cached.y === point.y)
        return;
      const patch = document.createElementNS(namespace, 'svg');
      patch.setAttribute('viewBox', `${point.x - 1.6} ${point.y - 1.6} 3.2 3.2`);
      patch.setAttribute('width', '100%');
      patch.setAttribute('height', '100%');
      for (const child of svg.children)
        if (!child.hasAttribute('data-preview') && !child.hasAttribute('data-cursor'))
          patch.append(child.cloneNode(true));
      const aim = document.createElementNS(namespace, 'circle');
      for (const [key, value] of Object.entries({
        cx: point.x,
        cy: point.y,
        r: 0.49,
        fill: 'none',
        stroke: '#12674e',
        'stroke-width': 0.08,
      }))
        aim.setAttribute(key, String(value));
      patch.append(aim);
      lens.replaceChildren(patch);
      cached = { source: svg.firstElementChild, x: point.x, y: point.y };
    },
    dispose() {
      cached = null;
      lens.replaceChildren();
      lens.remove();
      panel.remove();
    },
  };
}

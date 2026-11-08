import { diagramDimensions, xmlText } from './diagram-shared.js';
import type { DiagramOptions } from './diagram-shared.js';
export type { DiagramOptions } from './diagram-shared.js';
interface Diagram {
  readonly text: string;
  readonly width: number;
  readonly height: number;
}
const allowed = new Set([
  'svg',
  'g',
  'defs',
  'pattern',
  'clipPath',
  'circle',
  'ellipse',
  'line',
  'rect',
  'text',
  'tspan',
  'path',
  'polygon',
  'polyline',
  'image',
  'title',
]);
const styles = [
  'fill',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-anchor',
  'dominant-baseline',
  'opacity',
];
type PatternLookup = (id: string) => Element | undefined;
/** Lazy and export-local: preserve the first DOM match and never retain stale definitions. */
function patternLookup(svg: SVGSVGElement): PatternLookup {
  let patterns: Map<string, Element> | undefined;
  return (id) => {
    if (!patterns) {
      patterns = new Map();
      for (const node of svg.querySelectorAll('defs > pattern'))
        if (!patterns.has(node.id)) patterns.set(node.id, node);
    }
    return patterns.get(id);
  };
}

function paintFor(value: string, svg: SVGSVGElement, lookup: PatternLookup): string {
  if (!/url\s*\(/i.test(value)) return value;
  const match = /^url\(["']?([^"'()]+)["']?\)$/.exec(value);
  if (!match) throw new Error('External or inherited paint references cannot be exported');
  const source = match[1]!;
  let id: string;
  if (source.startsWith('#')) id = source.slice(1);
  else {
    const url = new URL(source, svg.ownerDocument.baseURI),
      page = new URL(svg.ownerDocument.URL);
    id = url.hash.slice(1);
    url.hash = '';
    page.hash = '';
    if (url.href !== page.href)
      throw new Error('External or inherited paint references cannot be exported');
  }
  const pattern = lookup(id);
  if (
    !pattern ||
    !/^banora-texture-\d+-(black|white)$/.test(id) ||
    pattern.children.length !== 1 ||
    pattern.firstElementChild?.tagName !== 'image'
  )
    throw new Error('External or inherited paint references cannot be exported');
  return `url(#${id})`;
}

/** Snapshot a mounted SDK drawing; no DOM access occurs during module import. */
export function serializeBoardDiagram(svg: SVGSVGElement, options: DiagramOptions = {}): Diagram {
  const box = svg.viewBox.baseVal;
  const { width, height } = diagramDimensions(box, options);
  const window = svg.ownerDocument.defaultView;
  if (!window) throw new Error('Diagram export requires a browser document');
  const copy = svg.cloneNode(true) as SVGSVGElement;
  const originals = [svg, ...svg.querySelectorAll('*')];
  const copies = [copy, ...copy.querySelectorAll('*')];
  const lookup = patternLookup(svg);
  for (let index = 0; index < originals.length; index++) {
    const original = originals[index]!,
      cloned = copies[index]!;
    if (
      !allowed.has(original.tagName) ||
      original.hasAttribute('data-cursor') ||
      original.hasAttribute('data-preview')
    ) {
      cloned.remove();
      continue;
    }
    cloned.removeAttribute('style');
    cloned.removeAttribute('class');
    cloned.removeAttribute('data-placement-animation');
    for (const child of cloned.childNodes)
      if (child.nodeType === 3) child.nodeValue = xmlText(child.nodeValue ?? '');
    for (const attribute of [...cloned.attributes]) {
      if (/^on/i.test(attribute.name)) cloned.removeAttribute(attribute.name);
      if (attribute.localName === 'href') {
        if (original.tagName !== 'image')
          cloned.removeAttributeNS(attribute.namespaceURI, attribute.localName);
        else if (!/^data:image\/(png|jpeg|webp|avif);base64,[A-Za-z0-9+/=]+$/.test(attribute.value))
          throw new Error('Diagram images must be embedded raster data');
      }
    }
    const computed = window.getComputedStyle(original);
    for (const key of styles) {
      const value = paintFor(computed.getPropertyValue(key), svg, lookup);
      if (value) cloned.setAttribute(key, value);
    }
  }
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copy.setAttribute('width', String(width));
  copy.setAttribute('height', String(height));
  copy.removeAttribute('tabindex');
  copy.removeAttribute('aria-roledescription');
  copy.setAttribute('role', 'img');
  const title = xmlText(options.title ?? 'Go position diagram');
  copy.setAttribute('aria-label', title);
  const caption = svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'title');
  caption.textContent = title;
  copy.prepend(caption);
  return Object.freeze({ text: copy.outerHTML, width, height });
}

export function rasterizeBoardDiagram(
  document: Document,
  diagram: Diagram,
  signal: AbortSignal,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Diagram export cancelled', 'AbortError'));
      return;
    }
    const image = document.createElement('img');
    const canvas = document.createElement('canvas');
    const url = URL.createObjectURL(
      new Blob([diagram.text], { type: 'image/svg+xml;charset=utf-8' }),
    );
    let settled = false;
    const cleanup = () => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', cancel);
      image.onload = image.onerror = null;
      image.removeAttribute('src');
      URL.revokeObjectURL(url);
      canvas.width = canvas.height = 0;
    };
    const fail = (error: unknown) => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(error);
      }
    };
    const cancel = () => fail(new DOMException('Diagram export cancelled', 'AbortError'));
    const timeout = setTimeout(() => fail(new Error('Diagram export timed out')), 10_000);
    signal.addEventListener('abort', cancel, { once: true });
    image.onerror = () => fail(new Error('Could not decode the position diagram'));
    image.onload = () => {
      if (settled) return;
      try {
        canvas.width = diagram.width;
        canvas.height = diagram.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('PNG export requires a 2D canvas context');
        context.drawImage(image, 0, 0, diagram.width, diagram.height);
        canvas.toBlob((blob) => {
          if (settled) return;
          if (!blob) {
            fail(new Error('PNG encoding failed'));
            return;
          }
          settled = true;
          cleanup();
          resolve(blob);
        }, 'image/png');
      } catch (error) {
        fail(error);
      }
    };
    image.src = url;
  });
}

/** Shared browser/headless export limits. */
export interface DiagramOptions {
  readonly width?: number;
  readonly height?: number;
  readonly title?: string;
}

export const xmlText = (text: string): string =>
  // oxlint-disable-next-line eslint/no-control-regex -- Replace characters forbidden in XML 1.0.
  text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF\p{Cs}]/gu, '\uFFFD');

export const escapeDiagramXml = (text: string): string =>
  xmlText(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

export function diagramDimensions(box: { width: number; height: number }, options: DiagramOptions) {
  const ratio = box.width / box.height;
  const width =
    options.width ?? (options.height === undefined ? 1024 : Math.round(options.height * ratio));
  const height = options.height ?? Math.round(width / ratio);
  if (
    ![width, height].every((value) => Number.isInteger(value) && value >= 1 && value <= 8192) ||
    width * height > 16_777_216
  )
    throw new RangeError('Diagram dimensions must be 1 to 8192 pixels and at most 16 megapixels');
  if (
    options.title !== undefined &&
    (typeof options.title !== 'string' || options.title.length > 1024)
  )
    throw new RangeError('Diagram title must be at most 1024 characters');
  return { width, height };
}

import type { BanoraLocale } from '@0disoft/banora/locale';
import { SUPPORTED_LOCALES, createUiMessages, formatUiMessage } from '@0disoft/banora/locale';
import { koreanUi } from './ui-korean.js';
import { uiCatalogs, uiPatterns } from './ui-catalogs.js';
let locale: BanoraLocale = 'en';
const listeners = new Set<() => void>();
const sdkMessages = Object.fromEntries(
  SUPPORTED_LOCALES.map((code) => [code, createUiMessages({ locale: code })]),
) as Record<BanoraLocale, ReturnType<typeof createUiMessages>>;
export const getUiLocale = () => locale;
export function subscribeUiLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function translateUi(text: string, activeLocale: BanoraLocale = locale): string {
  if (!SUPPORTED_LOCALES.includes(activeLocale)) throw new TypeError('Unsupported UI locale');
  if (activeLocale === 'en') return text;
  const catalog = uiCatalogs[activeLocale];
  const templates = uiPatterns[activeLocale];
  const sdk = sdkMessages[activeLocale];
  const value = text.trim();
  if (Object.hasOwn(catalog, value))
    return text.replace(value, catalog[value as keyof typeof catalog]);
  const format = (template: string, values: Record<string, string | number> = {}) =>
    formatUiMessage(template, values);
  const errorPrefixes: Readonly<Record<string, string>> = {
    'Export failed': templates.exportFailed,
    'Could not open file': templates.couldNotOpenFile,
    'Diagram export failed': templates.diagramExportFailed,
    'Texture unchanged': templates.textureUnchanged,
    'Cannot calculate': templates.cannotCalculate,
  };
  const patterns: [RegExp, (...values: string[]) => string][] = [
    [/^Move (\d+)$/, (number) => format(sdk.move, { number })],
    [/^Game (\d+)$/, (number) => format(sdk.game, { number })],
    [/^Board (\d+)$/, (number) => format(templates.board, { number })],
    [/^Opened (.+)\.$/, (name) => format(templates.opened, { name })],
    [/^(\d+) strokes? on this node$/, (number) => format(templates.strokes, { number })],
    [
      /^Captures  ● (\d+)  ○ (\d+)$/,
      (black, white) => format(templates.captures, { black, white }),
    ],
    [/^● Black to play$/, () => templates.blackToPlay],
    [/^○ White to play$/, () => templates.whiteToPlay],
    [
      /^Choose the second point for this (line|arrow)\. Escape cancels\.$/,
      (kind) => (kind === 'line' ? templates.secondLine : templates.secondArrow),
    ],
    [
      /^(Arrow|Line) (removed|added)\. Choose two points to draw another\.$/,
      (kind, action) =>
        kind === 'Line'
          ? action === 'added'
            ? templates.lineAdded
            : templates.lineRemoved
          : action === 'added'
            ? templates.arrowAdded
            : templates.arrowRemoved,
    ],
    [
      /^Provisional: (.+) · (\d+) dead stones · (\d+) seki stones · (\d+) neutral points$/,
      (winner, dead, seki, neutral) =>
        format(templates.provisional, {
          winner: winner
            .replace('Black', catalog.Black)
            .replace('White', catalog.White)
            .replace('Draw', templates.draw),
          dead,
          seki,
          neutral,
        }),
    ],
    [
      /^(Export failed|Could not open file|Diagram export failed|Texture unchanged|Cannot calculate): (.*)$/,
      (prefix, detail) => errorPrefixes[prefix] + ': ' + detail,
    ],
  ];
  for (const [pattern, render] of patterns) {
    const matched = pattern.exec(value);
    if (matched) return render(...matched.slice(1));
  }
  return text;
}
/** Call only on SDK/example-owned UI text, never on authored SGF fields or inputs. */
export function setUiText(element: HTMLElement, english: string): void {
  element.dataset.uiText = english;
  element.textContent = translateUi(english);
}
/** Bind initial static UI once, before authored fields are populated. No DOM observer. */
export function localizeUi(root: Element): () => void {
  const texts: { node: Text; english: string }[] = [];
  const attributes: { element: Element; name: string; english: string }[] = [];
  const walker = root.ownerDocument.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    if (
      node.parentElement?.closest(
        'script,style,svg,textarea,[data-ui-text],#game-name,#black-name,#white-name,#language',
      )
    )
      continue;
    if (Object.hasOwn(koreanUi, node.data.trim())) texts.push({ node, english: node.data });
  }
  for (const element of [root, ...root.querySelectorAll('*')]) {
    for (const name of ['aria-label', 'title', 'placeholder']) {
      const english = element.getAttribute(name);
      if (english && Object.hasOwn(koreanUi, english)) attributes.push({ element, name, english });
    }
  }
  const update = () => {
    for (const { node, english } of texts)
      if (root.contains(node)) node.data = translateUi(english);
    for (const { element, name, english } of attributes)
      element.setAttribute(name, translateUi(english));
  };
  update();
  return subscribeUiLanguage(update);
}
export function setUiLocale(next: BanoraLocale): void {
  if (!SUPPORTED_LOCALES.includes(next)) throw new TypeError('Unsupported UI locale');
  locale = next;
  for (const listener of [...listeners]) listener();
  for (const element of document.querySelectorAll<HTMLElement>('[data-ui-text]'))
    element.textContent = translateUi(element.dataset.uiText!);
}

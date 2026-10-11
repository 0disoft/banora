import type { BanoraLocale } from '@banora/sdk/locale';
import { koreanUi } from './ui-korean.js';
let locale: BanoraLocale = 'en';
const listeners = new Set<() => void>();
export const getUiLocale = () => locale;
export function subscribeUiLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function translateUi(text: string): string {
  if (locale === 'en') return text;
  const value = text.trim();
  if (Object.hasOwn(koreanUi, value)) return text.replace(value, koreanUi[value]!);
  const patterns: [RegExp, (...values: string[]) => string][] = [
    [/^Move (\d+)$/, (n) => `${n}수`],
    [/^Game (\d+)$/, (n) => `기보 ${n}`],
    [/^Opened (.+)\.$/, (name) => `${name} 열림`],
    [/^(\d+) strokes? on this node$/, (n) => `현재 위치에 ${n}개의 선`],
    [/^Captures  ● (\d+)  ○ (\d+)$/, (black, white) => `잡은 돌  ● ${black}  ○ ${white}`],
    [/^● Black to play$/, () => '● 흑 차례'],
    [/^○ White to play$/, () => '○ 백 차례'],
    [
      /^Choose the second point for this (line|arrow)\. Escape cancels\.$/,
      (kind) =>
        `${kind === 'line' ? '선' : '화살표'}의 두 번째 점을 선택하세요. Escape로 취소합니다.`,
    ],
    [
      /^(Arrow|Line) (removed|added)\. Choose two points to draw another\.$/,
      (kind, action) =>
        `${kind === 'Line' ? '선' : '화살표'}을 ${action === 'added' ? '추가' : '삭제'}했습니다. 두 점을 선택하면 다시 그릴 수 있습니다.`,
    ],
    [
      /^Provisional: (.+) · (\d+) dead stones · (\d+) seki stones · (\d+) neutral points$/,
      (winner, dead, seki, neutral) =>
        `임시 결과: ${winner.replace('Black', '흑').replace('White', '백').replace('Draw', '무승부')} · 사석 ${dead}개 · 빅 ${seki}개 · 공배 ${neutral}개`,
    ],
    [
      /^(Export failed|Could not open file|Diagram export failed|Texture unchanged|Cannot calculate): (.*)$/,
      (prefix, detail) =>
        `${({ 'Export failed': '저장 실패', 'Could not open file': '파일을 열 수 없음', 'Diagram export failed': '이미지 저장 실패', 'Texture unchanged': '이미지 유지', 'Cannot calculate': '계가할 수 없음' } as Record<string, string>)[prefix]}: ${detail}`,
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
  if (next !== 'en' && next !== 'ko') throw new TypeError('Unsupported UI locale');
  locale = next;
  for (const listener of [...listeners]) listener();
  for (const element of document.querySelectorAll<HTMLElement>('[data-ui-text]'))
    element.textContent = translateUi(element.dataset.uiText!);
}

import type { BanoraLocale } from '@banora/sdk/locale';
import { koreanUi } from './ui-korean.js';
import { chineseUi } from './ui-chinese.js';
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
  const chinese = locale === 'zh';
  const catalog: Readonly<Record<string, string>> = chinese ? chineseUi : koreanUi;
  const value = text.trim();
  if (Object.hasOwn(catalog, value)) return text.replace(value, catalog[value]!);
  const patterns: [RegExp, (...values: string[]) => string][] = [
    [/^Move (\d+)$/, (n) => (chinese ? `第 ${n} 手` : `${n}수`)],
    [/^Game (\d+)$/, (n) => (chinese ? `棋谱 ${n}` : `기보 ${n}`)],
    [/^Opened (.+)\.$/, (name) => (chinese ? `已打开 ${name}` : `${name} 열림`)],
    [
      /^(\d+) strokes? on this node$/,
      (n) => (chinese ? `当前局面有 ${n} 条笔画` : `현재 위치에 ${n}개의 선`),
    ],
    [
      /^Captures  ● (\d+)  ○ (\d+)$/,
      (black, white) =>
        chinese ? `提子  ● ${black}  ○ ${white}` : `잡은 돌  ● ${black}  ○ ${white}`,
    ],
    [/^● Black to play$/, () => (chinese ? '● 黑方落子' : '● 흑 차례')],
    [/^○ White to play$/, () => (chinese ? '○ 白方落子' : '○ 백 차례')],
    [
      /^Choose the second point for this (line|arrow)\. Escape cancels\.$/,
      (kind) =>
        chinese
          ? `请选择${kind === 'line' ? '线段' : '箭头'}的第二个点，Escape 取消。`
          : `${kind === 'line' ? '선' : '화살표'}의 두 번째 점을 선택하세요. Escape로 취소합니다.`,
    ],
    [
      /^(Arrow|Line) (removed|added)\. Choose two points to draw another\.$/,
      (kind, action) =>
        chinese
          ? `${kind === 'Line' ? '线段' : '箭头'}已${action === 'added' ? '添加' : '删除'}。选择两个点可再次绘制。`
          : `${kind === 'Line' ? '선' : '화살표'}을 ${action === 'added' ? '추가' : '삭제'}했습니다. 두 점을 선택하면 다시 그릴 수 있습니다.`,
    ],
    [
      /^Provisional: (.+) · (\d+) dead stones · (\d+) seki stones · (\d+) neutral points$/,
      (winner, dead, seki, neutral) =>
        chinese
          ? `暂定结果：${winner.replace('Black', '黑').replace('White', '白').replace('Draw', '和棋')} · 死子 ${dead} · 双活 ${seki} · 单官 ${neutral}`
          : `임시 결과: ${winner.replace('Black', '흑').replace('White', '백').replace('Draw', '무승부')} · 사석 ${dead}개 · 빅 ${seki}개 · 공배 ${neutral}개`,
    ],
    [
      /^(Export failed|Could not open file|Diagram export failed|Texture unchanged|Cannot calculate): (.*)$/,
      (prefix, detail) =>
        `${(chinese ? { 'Export failed': '保存失败', 'Could not open file': '无法打开文件', 'Diagram export failed': '图片保存失败', 'Texture unchanged': '图片未更改', 'Cannot calculate': '无法计分' } : ({ 'Export failed': '저장 실패', 'Could not open file': '파일을 열 수 없음', 'Diagram export failed': '이미지 저장 실패', 'Texture unchanged': '이미지 유지', 'Cannot calculate': '계가할 수 없음' } as Record<string, string>))[prefix]}: ${detail}`,
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
  if (next !== 'en' && next !== 'ko' && next !== 'zh') throw new TypeError('Unsupported UI locale');
  locale = next;
  for (const listener of [...listeners]) listener();
  for (const element of document.querySelectorAll<HTMLElement>('[data-ui-text]'))
    element.textContent = translateUi(element.dataset.uiText!);
}

import type { BanoraLocale } from '@0disoft/banora/locale';
import { koreanUi } from './ui-korean.js';
import { chineseUi } from './ui-chinese.js';
import { japaneseUi } from './ui-japanese.js';
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
  const activeLocale = locale;
  const catalog: Readonly<Record<string, string>> = { ko: koreanUi, zh: chineseUi, ja: japaneseUi }[
    activeLocale
  ];
  const choose = (ko: string, zh: string, ja: string) => ({ ko, zh, ja })[activeLocale];
  const errorPrefixes: Readonly<Record<string, string>> = {
    'Export failed': choose('저장 실패', '保存失败', '保存に失敗'),
    'Could not open file': choose('파일을 열 수 없음', '无法打开文件', 'ファイルを開けません'),
    'Diagram export failed': choose('이미지 저장 실패', '图片保存失败', '画像の保存に失敗'),
    'Texture unchanged': choose('이미지 유지', '图片未更改', '画像は変更されていません'),
    'Cannot calculate': choose('계가할 수 없음', '无法计分', '計算できません'),
  };
  const value = text.trim();
  if (Object.hasOwn(catalog, value)) return text.replace(value, catalog[value]!);
  const patterns: [RegExp, (...values: string[]) => string][] = [
    [/^Move (\d+)$/, (n) => choose(`${n}수`, `第 ${n} 手`, `${n}手目`)],
    [/^Game (\d+)$/, (n) => choose(`기보 ${n}`, `棋谱 ${n}`, `棋譜 ${n}`)],
    [/^Opened (.+)\.$/, (name) => choose(`${name} 열림`, `已打开 ${name}`, `${name}を開きました`)],
    [
      /^(\d+) strokes? on this node$/,
      (n) =>
        choose(`현재 위치에 ${n}개의 선`, `当前局面有 ${n} 条笔画`, `現在の局面に ${n} 本の線`),
    ],
    [
      /^Captures  ● (\d+)  ○ (\d+)$/,
      (black, white) =>
        choose(
          `잡은 돌  ● ${black}  ○ ${white}`,
          `提子  ● ${black}  ○ ${white}`,
          `アゲハマ  ● ${black}  ○ ${white}`,
        ),
    ],
    [/^● Black to play$/, () => choose('● 흑 차례', '● 黑方落子', '● 黒の手番')],
    [/^○ White to play$/, () => choose('○ 백 차례', '○ 白方落子', '○ 白の手番')],
    [
      /^Choose the second point for this (line|arrow)\. Escape cancels\.$/,
      (kind) =>
        choose(
          `${kind === 'line' ? '선' : '화살표'}의 두 번째 점을 선택하세요. Escape로 취소합니다.`,
          `请选择${kind === 'line' ? '线段' : '箭头'}的第二个点，Escape 取消。`,
          `${kind === 'line' ? '線' : '矢印'}の 2 点目を選択してください。Escape でキャンセル。`,
        ),
    ],
    [
      /^(Arrow|Line) (removed|added)\. Choose two points to draw another\.$/,
      (kind, action) =>
        choose(
          `${kind === 'Line' ? '선' : '화살표'}을 ${action === 'added' ? '추가' : '삭제'}했습니다. 두 점을 선택하면 다시 그릴 수 있습니다.`,
          `${kind === 'Line' ? '线段' : '箭头'}已${action === 'added' ? '添加' : '删除'}。选择两个点可再次绘制。`,
          `${kind === 'Line' ? '線' : '矢印'}を${action === 'added' ? '追加' : '削除'}しました。2 点を選択すると再び描画できます。`,
        ),
    ],
    [
      /^Provisional: (.+) · (\d+) dead stones · (\d+) seki stones · (\d+) neutral points$/,
      (winner, dead, seki, neutral) => {
        const result = winner
          .replace('Black', catalog.Black!)
          .replace('White', catalog.White!)
          .replace('Draw', choose('무승부', '和棋', '持碁'));
        return choose(
          `임시 결과: ${result} · 사석 ${dead}개 · 빅 ${seki}개 · 공배 ${neutral}개`,
          `暂定结果：${result} · 死子 ${dead} · 双活 ${seki} · 单官 ${neutral}`,
          `暫定結果：${result} · 死石 ${dead} · セキ ${seki} · ダメ ${neutral}`,
        );
      },
    ],
    [
      /^(Export failed|Could not open file|Diagram export failed|Texture unchanged|Cannot calculate): (.*)$/,
      (prefix, detail) => `${errorPrefixes[prefix]}: ${detail}`,
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
  if (next !== 'en' && next !== 'ko' && next !== 'zh' && next !== 'ja')
    throw new TypeError('Unsupported UI locale');
  locale = next;
  for (const listener of [...listeners]) listener();
  for (const element of document.querySelectorAll<HTMLElement>('[data-ui-text]'))
    element.textContent = translateUi(element.dataset.uiText!);
}

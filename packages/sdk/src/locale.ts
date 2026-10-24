import type { BoardLabels } from './board-state.js';
import { boardNoticeCatalogs } from './board-notice-locales.js';
import { boardFailureLabelKeys } from './board-notices.js';
import { formatUiFailure } from './locale-failures.js';
import type { BanoraLocale } from './locale-codes.js';
import { hi } from './locale-hi.js';
import { es } from './locale-es.js';
import { fr } from './locale-fr.js';
import { ru } from './locale-ru.js';
import { id } from './locale-id.js';
import { vi } from './locale-vi.js';
import { th } from './locale-th.js';
import { ms } from './locale-ms.js';
export { formatUiFailure } from './locale-failures.js';

export { SUPPORTED_LOCALES } from './locale-codes.js';
export type { BanoraLocale } from './locale-codes.js';
const english = {
  viewer: 'Go record viewer',
  game: 'Game {number}',
  gameLabel: 'Game ',
  selectGame: 'Select game',
  navigation: 'Record navigation',
  first: 'First node',
  previous: 'Previous move',
  next: 'Next move',
  last: 'Last node',
  pass: 'Pass',
  undo: 'Undo',
  redo: 'Redo',
  variations: 'Variations',
  comments: 'Comments',
  positionComments: 'Position comments',
  hasComment: 'Has comment',
  goodMove: 'Good move',
  badMove: 'Bad move',
  start: 'Start position',
  annotation: 'Annotation',
  comparison: 'Go position comparison',
  leftPosition: 'Left position',
  rightPosition: 'Right position',
  comparisonNode: 'Node {number}',
  comparisonRow: '{game} · {position} · {caption}',
  selectedNode: 'Selected node {id}',
  unavailableNode: 'Unavailable node {id}',
  noComments: 'No comments on this position.',
  comparisonNodeUnavailable: 'Node unavailable. Restore the branch or choose another position.',
  comparisonUnavailable:
    'Comparison unavailable. Choose two existing nodes or restore the removed branch.',
  comparisonDimensions:
    'Different board dimensions: {leftWidth} × {leftHeight} and {rightWidth} × {rightHeight}. No intersections are compared.',
  comparisonSummary:
    '{count} changed intersections · +{added} added · −{removed} removed · ↔{replaced} color changed',
  comparisonLimit:
    'First 500 nodes plus selected nodes shown. The API can compare any node in the record.',
  comparisonRejected: 'Comparison rejected: {reason}',
  black: 'Black',
  white: 'White',
  empty: 'Empty',
  colorPass: '{color} pass',
  selectNode: 'Select {label}',
  move: 'Move {number}',
  record: 'Go record',
  summary: '{black} / {white} · {color} to play · Captures {blackCaptures} / {whiteCaptures}',
  treeLimit: 'First 500 nodes shown; move controls navigate the complete record.',
  rejected: 'Action rejected: {reason}',
  playback: 'Record playback',
  interval: 'Interval ',
  playbackInterval: 'Playback interval',
  seconds: '{number} s',
  play: 'Play',
  pause: 'Pause',
  playRecord: 'Play record',
  pausePlayback: 'Pause playback',
  playbackHint: '← / → move through the record · Alt + ← / → while the board is focused',
  board:
    'Go board. Arrow keys move the cursor; Enter activates the intersection; Page Up and Page Down navigate moves.',
  boardPoint: '{coordinate}. {stone}.',
  boardState:
    'Move {moveNumber}. {toPlay} to play. Black captures {blackCaptures}, white captures {whiteCaptures}.',
  confirm: 'Confirm placement at {coordinate}',
  cancel: 'Cancel placement',
  pointSelected: '{coordinate} selected.',
  placementAt: 'Placement at {coordinate}',
} as const;
type TouchMessageKey = 'pointSelected' | 'placementAt';
export type UiMessages = {
  readonly [Key in Exclude<keyof typeof english, TouchMessageKey>]: string;
} & { readonly [Key in TouchMessageKey]?: string };
export interface LocaleOptions {
  readonly locale?: BanoraLocale;
  readonly messages?: Partial<UiMessages>;
}
const korean: Required<UiMessages> = {
  viewer: '바둑 기보 뷰어',
  game: '기보 {number}',
  gameLabel: '기보 ',
  selectGame: '기보 선택',
  navigation: '기보 탐색',
  first: '처음 위치',
  previous: '이전 수',
  next: '다음 수',
  last: '마지막 위치',
  pass: '패스',
  undo: '실행 취소',
  redo: '다시 실행',
  variations: '변화도',
  comments: '코멘트',
  positionComments: '현재 위치 코멘트',
  hasComment: '코멘트 있음',
  goodMove: '정수',
  badMove: '악수',
  start: '시작 위치',
  annotation: '주석',
  comparison: '위치 비교',
  leftPosition: '왼쪽 위치',
  rightPosition: '오른쪽 위치',
  comparisonNode: '위치 {number}',
  comparisonRow: '{game} · {position} · {caption}',
  selectedNode: '선택한 위치 {id}',
  unavailableNode: '없는 위치 {id}',
  noComments: '코멘트 없음',
  comparisonNodeUnavailable: '삭제된 위치입니다. 복원하거나 다른 위치를 선택하세요.',
  comparisonUnavailable: '비교할 위치를 선택하세요.',
  comparisonDimensions:
    '바둑판 크기가 다릅니다: {leftWidth} × {leftHeight} / {rightWidth} × {rightHeight}',
  comparisonSummary: '변경 {count} · +{added} 추가 · −{removed} 제거 · ↔{replaced} 색상 변경',
  comparisonLimit: '처음 500개와 선택한 위치를 표시합니다.',
  comparisonRejected: '비교할 수 없습니다: {reason}',
  black: '흑',
  white: '백',
  empty: '빈 교차점',
  colorPass: '{color} 패스',
  selectNode: '{label} 선택',
  move: '{number}수',
  record: '바둑 기보',
  summary: '{black} / {white} · {color} 차례 · 잡은 돌 흑 {blackCaptures} / 백 {whiteCaptures}',
  treeLimit: '처음 500개 노드를 표시합니다. 이동 버튼으로 전체 기보를 탐색할 수 있습니다.',
  rejected: '실행할 수 없습니다: {reason}',
  playback: '기보 자동 재생',
  interval: '간격 ',
  playbackInterval: '착수 간격',
  seconds: '{number}초',
  play: '재생',
  pause: '일시 정지',
  playRecord: '기보 재생',
  pausePlayback: '재생 일시 정지',
  playbackHint: '← / → 이전·다음 수 · 바둑판에 초점이 있을 때는 Alt + ← / →',
  board:
    '바둑판. 방향키로 커서를 이동하고 Enter로 교차점을 선택합니다. Page Up과 Page Down으로 수를 이동합니다.',
  boardPoint: '{coordinate}. {stone}.',
  boardState: '{moveNumber}수. {toPlay} 차례. 잡은 돌 흑 {blackCaptures}, 백 {whiteCaptures}.',
  confirm: '{coordinate}에 착수 확인',
  cancel: '착수 취소',
  pointSelected: '{coordinate} 선택됨.',
  placementAt: '{coordinate} 착수',
};
const chinese: Required<UiMessages> = {
  viewer: '围棋棋谱查看器',
  game: '棋谱 {number}',
  gameLabel: '棋谱 ',
  selectGame: '选择棋谱',
  navigation: '棋谱导航',
  first: '初始局面',
  previous: '上一手',
  next: '下一手',
  last: '最后局面',
  pass: '停一手',
  undo: '撤销',
  redo: '重做',
  variations: '变化图',
  comments: '评注',
  positionComments: '当前局面评注',
  hasComment: '有评注',
  goodMove: '好棋',
  badMove: '恶手',
  start: '初始局面',
  annotation: '注释',
  comparison: '局面对比',
  leftPosition: '左侧局面',
  rightPosition: '右侧局面',
  comparisonNode: '局面 {number}',
  comparisonRow: '{game} · {position} · {caption}',
  selectedNode: '已选局面 {id}',
  unavailableNode: '不存在的局面 {id}',
  noComments: '无评论',
  comparisonNodeUnavailable: '局面已删除，请恢复或选择其他局面。',
  comparisonUnavailable: '请选择要对比的局面。',
  comparisonDimensions: '棋盘大小不同：{leftWidth} × {leftHeight} / {rightWidth} × {rightHeight}',
  comparisonSummary: '变化 {count} · +{added} 新增 · −{removed} 移除 · ↔{replaced} 颜色变化',
  comparisonLimit: '显示前 500 个局面和已选局面。',
  comparisonRejected: '无法对比：{reason}',
  black: '黑',
  white: '白',
  empty: '空交叉点',
  colorPass: '{color}停一手',
  selectNode: '选择{label}',
  move: '第 {number} 手',
  record: '围棋棋谱',
  summary: '{black} / {white} · 轮到{color} · 提子 黑 {blackCaptures} / 白 {whiteCaptures}',
  treeLimit: '显示前 500 个节点，可通过导航按钮浏览完整棋谱。',
  rejected: '操作失败：{reason}',
  playback: '棋谱自动播放',
  interval: '间隔 ',
  playbackInterval: '落子间隔',
  seconds: '{number} 秒',
  play: '播放',
  pause: '暂停',
  playRecord: '播放棋谱',
  pausePlayback: '暂停播放',
  playbackHint: '← / → 上一手、下一手 · 棋盘获得焦点时使用 Alt + ← / →',
  board: '围棋棋盘。方向键移动光标，Enter 选择交叉点，Page Up 和 Page Down 浏览棋谱。',
  boardPoint: '{coordinate}。{stone}。',
  boardState: '第 {moveNumber} 手。轮到{toPlay}。提子：黑 {blackCaptures}，白 {whiteCaptures}。',
  confirm: '确认在 {coordinate} 落子',
  cancel: '取消落子',
  pointSelected: '已选择 {coordinate}。',
  placementAt: '在 {coordinate} 落子',
};
const japanese: Required<UiMessages> = {
  viewer: '囲碁棋譜ビューア',
  game: '棋譜 {number}',
  gameLabel: '棋譜 ',
  selectGame: '棋譜を選択',
  navigation: '棋譜の移動',
  first: '初期局面',
  previous: '前の手',
  next: '次の手',
  last: '最後の局面',
  pass: 'パス',
  undo: '元に戻す',
  redo: 'やり直す',
  variations: '変化図',
  comments: 'コメント',
  positionComments: '現在の局面のコメント',
  hasComment: 'コメントあり',
  goodMove: '好手',
  badMove: '悪手',
  start: '初期局面',
  annotation: '注釈',
  comparison: '局面比較',
  leftPosition: '左の局面',
  rightPosition: '右の局面',
  comparisonNode: '局面 {number}',
  comparisonRow: '{game} · {position} · {caption}',
  selectedNode: '選択した局面 {id}',
  unavailableNode: '存在しない局面 {id}',
  noComments: 'コメントなし',
  comparisonNodeUnavailable: '削除された局面です。復元するか別の局面を選択してください。',
  comparisonUnavailable: '比較する局面を選択してください。',
  comparisonDimensions:
    '碁盤のサイズが異なります：{leftWidth} × {leftHeight} / {rightWidth} × {rightHeight}',
  comparisonSummary: '変更 {count} · +{added} 追加 · −{removed} 除去 · ↔{replaced} 色変更',
  comparisonLimit: '最初の 500 局面と選択した局面を表示します。',
  comparisonRejected: '比較できません：{reason}',
  black: '黒',
  white: '白',
  empty: '空点',
  colorPass: '{color} パス',
  selectNode: '{label}を選択',
  move: '{number}手目',
  record: '囲碁棋譜',
  summary: '{black} / {white} · {color}の手番 · アゲハマ 黒 {blackCaptures} / 白 {whiteCaptures}',
  treeLimit: '最初の 500 ノードを表示します。移動ボタンで棋譜全体を確認できます。',
  rejected: '操作できません：{reason}',
  playback: '棋譜の自動再生',
  interval: '間隔 ',
  playbackInterval: '着手間隔',
  seconds: '{number}秒',
  play: '再生',
  pause: '一時停止',
  playRecord: '棋譜を再生',
  pausePlayback: '再生を一時停止',
  playbackHint: '← / → 前後の手に移動 · 碁盤にフォーカスがある場合は Alt + ← / →',
  board:
    '碁盤。方向キーでカーソルを移動し、Enter で交点を選択します。Page Up と Page Down で棋譜を移動します。',
  boardPoint: '{coordinate}。{stone}。',
  boardState: '{moveNumber}手目。{toPlay}の手番。アゲハマ 黒 {blackCaptures}、白 {whiteCaptures}。',
  confirm: '{coordinate}への着手を確定',
  cancel: '着手をキャンセル',
  pointSelected: '{coordinate}を選択しました。',
  placementAt: '{coordinate}への着手',
};
const catalogs: Readonly<Record<BanoraLocale, Required<UiMessages>>> = {
  en: english,
  ko: korean,
  zh: chinese,
  ja: japanese,
  hi,
  es,
  fr,
  ru,
  id,
  vi,
  th,
  ms,
};
/** Explicit and DOM-free: SDK defaults never depend on browser or machine language. */
export function createUiMessages(options: LocaleOptions = {}): Required<UiMessages> {
  if (
    options.locale !== undefined &&
    (typeof options.locale !== 'string' || !Object.hasOwn(catalogs, options.locale))
  )
    throw new TypeError('Unsupported UI locale');
  const messages = { ...catalogs[options.locale ?? 'en'] } as Record<string, string>;
  if (options.messages !== undefined) {
    if (
      !options.messages ||
      typeof options.messages !== 'object' ||
      Array.isArray(options.messages)
    )
      throw new TypeError('UI messages must be an object');
    for (const [key, value] of Object.entries(options.messages)) {
      if (!Object.hasOwn(english, key) || typeof value !== 'string' || value.length > 4096)
        throw new TypeError('Invalid UI message');
      messages[key] = value;
    }
  }
  return Object.freeze(messages) as Required<UiMessages>;
}
export function formatUiMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  );
}
export function createBoardLabels(options: LocaleOptions = {}): BoardLabels {
  const ui = createUiMessages(options);
  return Object.freeze({
    ...boardNoticeCatalogs[options.locale ?? 'en'],
    ...Object.fromEntries(
      Object.entries(boardFailureLabelKeys).map(([reason, key]) => [
        key,
        formatUiFailure(reason, options),
      ]),
    ),
    failureUnknown: formatUiFailure('unknown', options),
    board: ui.board,
    point: ui.boardPoint,
    state: ui.boardState,
    confirm: ui.confirm,
    cancel: ui.cancel,
    selected: ui.pointSelected,
    placement: ui.placementAt,
    black: ui.black,
    white: ui.white,
    empty: ui.empty,
  });
}

import type { BoardLabels } from './board-state.js';

export type BanoraLocale = 'en' | 'ko' | 'zh';
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
  start: 'Start position',
  annotation: 'Annotation',
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
} as const;
export type UiMessages = { readonly [Key in keyof typeof english]: string };
export interface LocaleOptions {
  readonly locale?: BanoraLocale;
  readonly messages?: Partial<UiMessages>;
}
const korean: UiMessages = {
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
  start: '시작 위치',
  annotation: '주석',
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
};
const chinese: UiMessages = {
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
  start: '初始局面',
  annotation: '注释',
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
};
const catalogs: Readonly<Record<BanoraLocale, UiMessages>> = {
  en: english,
  ko: korean,
  zh: chinese,
};
/** Explicit and DOM-free: SDK defaults never depend on browser or machine language. */
export function createUiMessages(options: LocaleOptions = {}): UiMessages {
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
  return Object.freeze(messages) as UiMessages;
}
export function formatUiMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : match,
  );
}
export function createBoardLabels(options: LocaleOptions = {}): BoardLabels {
  const ui = createUiMessages(options);
  return Object.freeze({
    board: ui.board,
    point: ui.boardPoint,
    state: ui.boardState,
    confirm: ui.confirm,
    cancel: ui.cancel,
    black: ui.black,
    white: ui.white,
    empty: ui.empty,
  });
}

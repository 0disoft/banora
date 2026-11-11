import type { Color } from './core.js';

interface Leaf {
  readonly hash: number;
  readonly keys: readonly string[];
}
interface Branch {
  readonly children: readonly (Node | null)[];
}
type Node = Leaf | Branch;
/** Immutable situation membership, not an ordered move log. Treat the index as SDK-owned. */
export interface RepetitionHistory {
  readonly size: number;
  readonly root: Node | null;
}
const empty: RepetitionHistory = Object.freeze({ size: 0, root: null });

function hashKey(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return hash >>> 0;
}
function leaf(hash: number, key: string): Leaf {
  return Object.freeze({ hash, keys: Object.freeze([key]) });
}
function branch(children: (Node | null)[]): Branch {
  return Object.freeze({ children: Object.freeze(children) });
}
function merge(before: Leaf, after: Leaf, depth: number): Branch {
  const children = Array<Node | null>(16).fill(null),
    a = (before.hash >>> (depth * 4)) & 15,
    b = (after.hash >>> (depth * 4)) & 15;
  if (a === b) children[a] = merge(before, after, depth + 1);
  else {
    children[a] = before;
    children[b] = after;
  }
  return branch(children);
}
function insert(node: Node | null, key: string, hash: number, depth = 0): Node {
  if (!node) return leaf(hash, key);
  if ('keys' in node) {
    if (node.hash !== hash) return merge(node, leaf(hash, key), depth);
    if (node.keys.includes(key)) return node;
    return Object.freeze({ hash, keys: Object.freeze([...node.keys, key]) });
  }
  const index = (hash >>> (depth * 4)) & 15,
    child = node.children[index]!;
  const next = insert(child, key, hash, depth + 1);
  if (next === child) return node;
  const children = [...node.children];
  children[index] = next;
  return branch(children);
}
function contains(history: RepetitionHistory, key: string, hash = hashKey(key)): boolean {
  let node = history.root,
    depth = 0;
  while (node && 'children' in node) node = node.children[(hash >>> (depth++ * 4)) & 15]!;
  return !!node && node.hash === hash && node.keys.includes(key);
}
export function boardKey(board: readonly (Color | null)[]): string {
  return board.map((color) => (color === null ? '.' : color === 'black' ? 'B' : 'W')).join('');
}
export function hasSituation(
  history: RepetitionHistory | null,
  board: string,
  toPlay?: Color,
): boolean {
  if (!history) return false;
  if (!toPlay) return contains(history, board + 'B') || contains(history, board + 'W');
  return contains(history, board + (toPlay === 'black' ? 'B' : 'W'));
}
export function rememberSituation(
  history: RepetitionHistory | null,
  board: string,
  toPlay: Color,
): RepetitionHistory {
  const previous = history ?? empty,
    key = board + (toPlay === 'black' ? 'B' : 'W');
  return rememberKey(previous, key, hashKey(key));
}
function rememberKey(previous: RepetitionHistory, key: string, hash: number): RepetitionHistory {
  const root = insert(previous.root, key, hash);
  return root === previous.root ? previous : Object.freeze({ size: previous.size + 1, root });
}

/** Check exact repetition before insertion, sharing hashes within this call only. */
export function tryRememberSituation(
  history: RepetitionHistory | null,
  board: string,
  toPlay: Color,
  positional = false,
): RepetitionHistory | null {
  let key: string, hash: number;
  if (history && positional) {
    // Preserve positional lookup order: black first, then white if absent.
    const black = board + 'B',
      blackHash = hashKey(black);
    if (contains(history, black, blackHash)) return null;
    const white = board + 'W',
      whiteHash = hashKey(white);
    if (contains(history, white, whiteHash)) return null;
    key = toPlay === 'black' ? black : white;
    hash = toPlay === 'black' ? blackHash : whiteHash;
  } else {
    key = board + (toPlay === 'black' ? 'B' : 'W');
    hash = hashKey(key);
    if (history && contains(history, key, hash)) return null;
  }
  return rememberKey(history ?? empty, key, hash);
}

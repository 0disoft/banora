import { createSgfNode } from './sgf.js';
import type { SgfNode, SgfRecord } from './sgf.js';

export interface CommentChange {
  readonly nodeId: string;
  readonly text: string;
  readonly expectedText?: string;
}
export interface CommentBatchEdit {
  readonly nodeId: string;
  readonly before: string;
  readonly after: string;
}
export interface CommentBatchPreview {
  readonly source: SgfRecord;
  readonly record: SgfRecord;
  readonly edits: readonly CommentBatchEdit[];
}
export class CommentBatchError extends Error {
  constructor(readonly reason: 'invalid-edit' | 'node-not-found' | 'stale-preview' | 'limit') {
    super('Comment batch rejected');
    this.name = 'CommentBatchError';
  }
}
/** Internal candidate builder; the controller alone validates limits and issues previews. */
export function buildCommentBatch(
  record: SgfRecord,
  changes: readonly CommentChange[],
): CommentBatchPreview {
  if (!Array.isArray(changes)) throw new CommentBatchError('invalid-edit');
  if (changes.length > 256) throw new CommentBatchError('limit');
  const requested = new Map<string, CommentChange>();
  let length = 0;
  for (const change of Array.from(changes)) {
    if (
      !change ||
      typeof change !== 'object' ||
      Array.isArray(change) ||
      Object.keys(change).some((key) => !['nodeId', 'text', 'expectedText'].includes(key)) ||
      typeof change.nodeId !== 'string' ||
      change.nodeId.length < 1 ||
      change.nodeId.length > 128 ||
      typeof change.text !== 'string' ||
      (change.expectedText !== undefined && typeof change.expectedText !== 'string') ||
      requested.has(change.nodeId)
    )
      throw new CommentBatchError('invalid-edit');
    const text = change.text.replace(/\r\n|\n\r|\r/g, '\n').replace(/[\t\v\f]/g, ' ');
    length += change.text.length + (change.expectedText?.length ?? 0);
    if (text.length > 65_536 || (change.expectedText?.length ?? 0) > 65_536 || length > 1_048_576)
      throw new CommentBatchError('limit');
    requested.set(change.nodeId, { ...change, text });
  }
  const edits: CommentBatchEdit[] = [];
  const seen = new Set<string>();
  const replacements = new Map<SgfNode, SgfNode>();
  const pending: { node: SgfNode; visited: boolean }[] = record.games
    .map((node) => ({ node, visited: false }))
    .reverse();
  let count = 0;
  while (pending.length) {
    const { node, visited } = pending.pop()!;
    if (!visited) {
      if (++count > 50_000) throw new CommentBatchError('limit');
      const change = requested.get(node.id);
      if (change) {
        seen.add(node.id);
        const before = node.properties.C?.[0] ?? '';
        if (change.expectedText !== undefined && before !== change.expectedText)
          throw new CommentBatchError('stale-preview');
        if (change.text !== before)
          edits.push(Object.freeze({ nodeId: node.id, before, after: change.text }));
      }
      pending.push({ node, visited: true });
      for (let index = node.children.length - 1; index >= 0; index--)
        pending.push({ node: node.children[index]!, visited: false });
      continue;
    }
    const change = requested.get(node.id);
    const changedComment = change && change.text !== (node.properties.C?.[0] ?? '');
    const changedChild = node.children.some((child) => replacements.has(child));
    if (!changedComment && !changedChild) continue;
    const properties = { ...node.properties };
    if (changedComment) {
      if (change.text) properties.C = [change.text];
      else delete properties.C;
    }
    replacements.set(
      node,
      createSgfNode(
        node.id,
        properties,
        node.children.map((child) => replacements.get(child) ?? child),
        node.rawProperties,
      ),
    );
  }
  if (seen.size !== requested.size) throw new CommentBatchError('node-not-found');
  const candidate = edits.length
    ? Object.freeze({
        games: Object.freeze(record.games.map((root) => replacements.get(root) ?? root)),
      })
    : record;
  return Object.freeze({ source: record, record: candidate, edits: Object.freeze(edits) });
}

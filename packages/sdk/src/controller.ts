import { isOnBoard, pass, play, setup } from './core.js';
import type { Color, MoveFailure, Point, Position, RulePolicy, SetupStone } from './core.js';
import {
  createSgfNode,
  DEFAULT_SGF_LIMITS,
  decodeSgf,
  expandSgfPoints,
  parseSgf,
  pointFromSgf,
  pointToSgf,
  recordNodeAt,
  serializeSgf,
} from './sgf.js';
import type { RecordLocator, SgfDiagnostic, SgfLimits, SgfNode, SgfRecord } from './sgf.js';
import {
  applyRecordNode,
  indexRecord,
  initialRecordPosition,
  refreshCommentIndex,
  replaceRecordChildren,
  sameRecordContent,
  sgfColor,
} from './record-runtime.js';
import type { RecordContentCache, RecordIndex } from './record-runtime.js';
import { createStroke, decodeStrokes, encodeStroke, strokeLimits } from './annotations.js';
import type { Stroke, StrokeStyle } from './annotations.js';
export type { Stroke, StrokeStyle } from './annotations.js';
import { CHECKPOINT_SCHEMA, parseRecordCheckpoint } from './checkpoint.js';
import type { RecordCheckpoint } from './checkpoint.js';
import { matches } from './json-schema.js';
import { buildCommentBatch, CommentBatchError } from './comment-batch.js';
import type { CommentChange, CommentBatchPreview } from './comment-batch.js';
export type { CommentChange, CommentBatchPreview, CommentBatchEdit } from './comment-batch.js';

export type MarkerKind = 'triangle' | 'square' | 'circle' | 'cross' | 'label';
export type MoveAssessment = 'good' | 'bad';
/** Imported SGF emphasis values 1/2 share the same visual assessment. */
export function getMoveAssessment(node: SgfNode): MoveAssessment | null {
  if (!node.properties.B && !node.properties.W) return null;
  return ['1', '2'].includes(node.properties.BM?.[0] ?? '')
    ? 'bad'
    : ['1', '2'].includes(node.properties.TE?.[0] ?? '')
      ? 'good'
      : null;
}
export interface Marker {
  readonly point: Point;
  readonly kind: MarkerKind;
  readonly label?: string;
}
export type ConnectionKind = 'line' | 'arrow';
export interface Connection {
  readonly kind: ConnectionKind;
  readonly from: Point;
  readonly to: Point;
}
export interface ControllerState {
  readonly record: SgfRecord;
  readonly node: SgfNode;
  readonly position: Position;
  readonly path: readonly string[];
  readonly gameIndex: number;
  readonly dirty: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly markers: readonly Marker[];
  readonly connections: readonly Connection[];
  readonly strokes: readonly Stroke[];
  /** Increases only when a successful import replaces this controller's record. */
  readonly recordGeneration: number;
}
export type ControllerFailure =
  | MoveFailure
  | 'unsaved-changes'
  | 'node-not-found'
  | 'no-history'
  | 'invalid-annotation'
  | 'invalid-edit'
  | 'import'
  | 'invalid-export'
  | 'invalid-checkpoint'
  | 'stale-preview'
  | 'limit';
export type CommandResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly reason: ControllerFailure;
      readonly diagnostics?: readonly SgfDiagnostic[];
    };
export interface ControllerOptions {
  readonly sgf?: string | Uint8Array;
  readonly size?: number;
  readonly rules?: Partial<RulePolicy>;
  readonly limits?: Partial<SgfLimits>;
}
export interface ExportTicket {
  readonly id: number;
  readonly text: string;
}
/** Immutable review data; only the issuing live controller can apply it. */
export interface RecordImportPreview {
  readonly record: SgfRecord;
  readonly node: SgfNode;
}
export type ImportPreparation =
  | { readonly ok: true; readonly preview: RecordImportPreview }
  | Extract<CommandResult, { readonly ok: false }>;
interface EditOptions {
  grouped?: boolean;
  /** Only validated comment edits may retain rule-relevant positions. */
  commentOnly?: boolean;
}
interface EditEntry {
  record: SgfRecord;
  selected: string;
}
const markerProperties: Readonly<Record<MarkerKind, string>> = {
  triangle: 'TR',
  square: 'SQ',
  circle: 'CR',
  cross: 'MA',
  label: 'LB',
};

export class RecordController {
  #record: SgfRecord;
  #recordGeneration = 0;
  #selected: string;
  #index: RecordIndex;
  #positionCache = new Map<string, Position>();
  #rules: Partial<RulePolicy> | undefined;
  #limits: Partial<SgfLimits>;
  #baselineRecord: SgfRecord;
  #baselineContent: RecordContentCache = new WeakMap();
  #serialized = new Map<SgfRecord, string>();
  #dirty = false;
  #undo: EditEntry[] = [];
  #redo: EditEntry[] = [];
  #group = false;
  #groupToken: symbol | undefined;
  #groupRecorded = false;
  #listeners = new Set<(state: ControllerState) => void>();
  #notifications: ControllerState[] = [];
  #snapshot: ControllerState | undefined;
  #notifying = false;
  #disposed = false;
  #nodeSequence = 0;
  #strokeSequence = 0;
  #ticketSequence = 0;
  #lastAcknowledged = 0;
  #tickets = new Map<number, { record: SgfRecord }>();
  #commentPreviews = new WeakSet<CommentBatchPreview>();
  #importPreviews = new WeakMap<RecordImportPreview, number>();
  /** Canonical exports checked with this controller's immutable limits. */
  #validatedExports = new WeakMap<SgfRecord, number>();

  constructor(options: ControllerOptions = {}) {
    this.#rules = options.rules ? Object.freeze({ ...options.rules }) : undefined;
    this.#limits = Object.freeze({ ...options.limits });
    const input = options.sgf ?? `(;FF[4]GM[1]CA[UTF-8]SZ[${options.size ?? 19}])`;
    const parsed =
      typeof input === 'string' ? parseSgf(input, this.#limits) : decodeSgf(input, this.#limits);
    if (!parsed.ok) throw new Error(parsed.diagnostics.map((item) => item.message).join('; '));
    this.#record = parsed.record;
    this.#selected = parsed.record.games[0]!.id;
    this.#index = indexRecord(this.#record);
    this.#baselineRecord = this.#record;
    this.getState();
  }

  #assertLive(): void {
    if (this.#disposed) throw new Error('RecordController is disposed');
  }
  #path(id = this.#selected): string[] {
    const path: string[] = [];
    let current: string | null = id;
    while (current !== null) {
      path.push(current);
      current = this.#index.parents.get(current) ?? null;
    }
    return path.reverse();
  }
  #position(path: readonly string[]): Position {
    let position: Position | undefined;
    let start = 0;
    for (let i = path.length - 1; i >= 0; i--) {
      const cached = this.#positionCache.get(path[i]!);
      if (cached) {
        position = cached;
        start = i + 1;
        break;
      }
    }
    position ??= initialRecordPosition(this.#index.nodes.get(path[0]!)!, this.#rules);
    for (let i = start; i < path.length; i++) {
      position = applyRecordNode(position, this.#index.nodes.get(path[i]!)!);
      this.#positionCache.set(path[i]!, position);
      if (this.#positionCache.size > 128)
        this.#positionCache.delete(this.#positionCache.keys().next().value!);
    }
    return position;
  }
  getState(): ControllerState {
    this.#assertLive();
    if (this.#snapshot) return this.#snapshot;
    return (this.#snapshot = this.#state(this.#selected));
  }
  /** Inspect another node without navigation, editing or subscriber notifications. */
  inspectNode(id: string): ControllerState | null {
    this.#assertLive();
    if (!this.#index.nodes.has(id)) return null;
    return id === this.#selected ? this.getState() : this.#state(id);
  }
  #state(id: string): ControllerState {
    const node = this.#index.nodes.get(id)!;
    const path = this.#path(id);
    const position = this.#position(path);
    const markers: Marker[] = [];
    for (const [kind, key] of Object.entries(markerProperties) as [MarkerKind, string][]) {
      for (const value of node.properties[key] ?? []) {
        if (kind === 'label')
          markers.push(
            Object.freeze({
              kind,
              point: pointFromSgf(value.slice(0, 2), position.width, position.height),
              label: value.slice(3),
            }),
          );
        else
          for (const point of expandSgfPoints(value, position.width, position.height)) {
            markers.push(Object.freeze({ kind, point: Object.freeze(point) }));
          }
      }
    }
    const connections: Connection[] = [];
    for (const [kind, key] of [
      ['line', 'LN'],
      ['arrow', 'AR'],
    ] as const) {
      for (const value of node.properties[key] ?? [])
        connections.push(
          Object.freeze({
            kind,
            from: pointFromSgf(value.slice(0, 2), position.width, position.height),
            to: pointFromSgf(value.slice(3), position.width, position.height),
          }),
        );
    }
    return Object.freeze({
      record: this.#record,
      node,
      position,
      path: Object.freeze(path),
      gameIndex: this.#index.games.get(id)!,
      dirty: this.#dirty,
      recordGeneration: this.#recordGeneration,
      canUndo: this.#undo.length > 0,
      canRedo: this.#redo.length > 0,
      markers: Object.freeze(markers),
      connections: Object.freeze(connections),
      strokes: decodeStrokes(node.properties.BPN, position),
    });
  }
  subscribe(listener: (state: ControllerState) => void): () => void {
    this.#assertLive();
    this.#listeners.add(listener);
    try {
      listener(this.getState());
    } catch (error) {
      this.#listeners.delete(listener);
      throw error;
    }
    return () => {
      this.#listeners.delete(listener);
    };
  }
  #notify(): void {
    this.#snapshot = undefined;
    this.#notifications.push(this.getState());
    if (this.#notifying) return;
    this.#notifying = true;
    try {
      while (this.#notifications.length) {
        const state = this.#notifications.shift()!;
        for (const listener of [...this.#listeners]) {
          if (!this.#listeners.has(listener)) continue;
          try {
            listener(state);
          } catch {
            console.error('Banora state listener failed');
          }
        }
      }
    } finally {
      this.#notifying = false;
    }
  }
  #reindex(commentOnly = false): void {
    if (commentOnly) refreshCommentIndex(this.#index, this.#record);
    else {
      this.#index = indexRecord(this.#record);
      this.#positionCache.clear();
    }
  }
  #refreshDirty(): void {
    this.#dirty = !sameRecordContent(this.#record, this.#baselineRecord, this.#baselineContent);
  }
  beginEditGroup(): () => void {
    this.#assertLive();
    this.endEditGroup();
    this.#group = true;
    const token = (this.#groupToken = Symbol('edit-group'));
    return () => {
      if (this.#groupToken === token) this.endEditGroup();
    };
  }
  endEditGroup(): void {
    this.#group = false;
    this.#groupRecorded = false;
    this.#groupToken = undefined;
  }

  #newNodeId(): string {
    let id: string;
    do {
      id = `e${++this.#nodeSequence}`;
    } while (this.#index.nodes.has(id));
    return id;
  }
  /** Only internal C-only builders may supply comments; all other edits fully reparse. */
  #validateCandidate(
    candidate: SgfRecord,
    comments?: readonly { nodeId: string; after: string }[],
  ): readonly SgfDiagnostic[] | undefined {
    let bytes = this.#validatedExports.get(this.#record);
    const encoder = new TextEncoder();
    let diagnostics: readonly SgfDiagnostic[] | undefined;
    if (comments && bytes !== undefined) {
      // Only C changes. Canonical one-node exports have identical headers and
      // delimiters, so their exact byte deltas also apply to the full collection.
      // Retain original raw C values: restoring decoded text may reuse its escapes.
      // A common batch comment often produces identical adjacent probes. Keep
      // only the last exact export for this call, including original raw escapes.
      let lastProbeText: string | undefined;
      let lastProbeValidation: ReturnType<typeof parseSgf> | undefined;
      let lastProbeBytes = 0;
      for (const { nodeId, after } of comments) {
        const node = this.#index.nodes.get(nodeId)!;
        const raw = node.rawProperties.C;
        const rawProperties: SgfNode['rawProperties'] = raw ? { C: raw } : {};
        const before = createSgfNode(
          'comment-validation',
          node.properties.C ? { C: node.properties.C } : {},
          [],
          rawProperties,
        );
        const probe = createSgfNode(
          'comment-validation',
          after ? { C: [after] } : {},
          [],
          rawProperties,
        );
        const text = serializeSgf({ games: [probe] });
        if (lastProbeText !== text || !lastProbeValidation) {
          lastProbeText = text;
          lastProbeValidation = parseSgf(text, this.#limits);
          lastProbeBytes = encoder.encode(text).length;
        }
        const validation = lastProbeValidation;
        if (!validation.ok && !diagnostics)
          // Probe offsets do not locate values in the full exported collection.
          diagnostics = Object.freeze(
            validation.diagnostics.map(({ code, message }) => Object.freeze({ code, message })),
          );
        bytes += lastProbeBytes - encoder.encode(serializeSgf({ games: [before] })).length;
      }
      // Check the final batch, allowing deletions to offset additions elsewhere.
      if (bytes > (this.#limits.maxBytes ?? DEFAULT_SGF_LIMITS.maxBytes))
        return Object.freeze([
          Object.freeze({ code: 'limit', message: 'SGF input exceeds byte limit' }),
        ]);
      if (diagnostics) return diagnostics;
    } else {
      // Imports/checkpoints have only validated input, whose canonical headers
      // may exceed stricter value limits. Establish export validity first.
      const text = serializeSgf(candidate);
      const validation = parseSgf(text, this.#limits);
      if (!validation.ok) return validation.diagnostics;
      bytes = encoder.encode(text).length;
      // Reuse this exact successful export for checkpoints and downloads.
      // Rejected candidates must not evict the active record or its baseline.
      this.#rememberSerialized(candidate, text);
    }
    this.#validatedExports.set(candidate, bytes);
  }
  #edit(
    replacement: SgfNode,
    selected = this.#selected,
    target = this.#selected,
    options: EditOptions = {},
  ): CommandResult {
    const path = this.#path(target);
    let updated = replacement;
    for (let i = path.length - 2; i >= 0; i--) {
      const parent = this.#index.nodes.get(path[i]!)!;
      updated = replaceRecordChildren(
        parent,
        parent.children.map((child) => (child.id === path[i + 1] ? updated : child)),
      );
    }
    const game = this.#index.games.get(target)!;
    const candidate = Object.freeze({
      games: Object.freeze(
        this.#record.games.map((root, index) => (index === game ? updated : root)),
      ),
    });
    const diagnostics = this.#validateCandidate(
      candidate,
      options.commentOnly
        ? [{ nodeId: target, after: replacement.properties.C?.[0] ?? '' }]
        : undefined,
    );
    if (diagnostics) return { ok: false, reason: 'limit', diagnostics };
    return this.#commit(candidate, selected, options);
  }
  /** Commit only a candidate already validated by this controller. */
  #commit(candidate: SgfRecord, selected: string, options: EditOptions = {}): CommandResult {
    // Rejected candidates must leave the active comment session intact.
    if (!options.grouped) this.endEditGroup();
    if (!this.#group || !this.#groupRecorded) {
      this.#undo.push({ record: this.#record, selected: this.#selected });
      if (this.#undo.length > 100) this.#undo.shift();
      this.#groupRecorded = true;
    }
    this.#redo = [];
    this.#record = candidate;
    this.#selected = selected;
    this.#reindex(options.commentOnly);
    this.#refreshDirty();
    this.#notify();
    return { ok: true };
  }

  goTo(id: string): CommandResult {
    this.#assertLive();
    if (!this.#index.nodes.has(id)) return { ok: false, reason: 'node-not-found' };
    this.endEditGroup();
    if (this.#selected === id) return { ok: true };
    this.#selected = id;
    this.#notify();
    return { ok: true };
  }
  previous(): CommandResult {
    this.#assertLive();
    const parent = this.#index.parents.get(this.#selected);
    return parent ? this.goTo(parent) : { ok: false, reason: 'node-not-found' };
  }
  next(variation = 0): CommandResult {
    this.#assertLive();
    const next = this.#index.nodes.get(this.#selected)!.children[variation];
    return next ? this.goTo(next.id) : { ok: false, reason: 'node-not-found' };
  }
  play(point: Point | null): CommandResult {
    this.#assertLive();
    const state = this.getState();
    const result = point ? play(state.position, point) : pass(state.position);
    if (!result.ok) return result;
    const key = sgfColor(state.position.toPlay);
    const value = point ? pointToSgf(point) : '';
    const existing = state.node.children.find((child) => child.properties[key]?.[0] === value);
    if (existing) return this.goTo(existing.id);
    if (this.#index.nodes.size >= (this.#limits.maxNodes ?? 50_000))
      return { ok: false, reason: 'limit' };
    const id = this.#newNodeId();
    const child = createSgfNode(id, { [key]: [value] });
    return this.#edit(
      createSgfNode(
        state.node.id,
        state.node.properties,
        [...state.node.children, child],
        state.node.rawProperties,
      ),
      id,
    );
  }
  /** Mutually exclusive SGF move annotations; targeting another node preserves selection. */
  setMoveAssessment(assessment: MoveAssessment | null, nodeId = this.#selected): CommandResult {
    this.#assertLive();
    if (assessment !== null && assessment !== 'good' && assessment !== 'bad')
      return { ok: false, reason: 'invalid-annotation' };
    const node = this.#index.nodes.get(nodeId);
    if (!node) return { ok: false, reason: 'node-not-found' };
    if (!node.properties.B && !node.properties.W) return { ok: false, reason: 'invalid-edit' };
    const properties = { ...node.properties };
    for (const key of ['TE', 'BM', 'DO', 'IT']) delete properties[key];
    if (assessment) properties[assessment === 'good' ? 'TE' : 'BM'] = ['1'];
    if (
      ['TE', 'BM', 'DO', 'IT'].every(
        (key) => JSON.stringify(properties[key]) === JSON.stringify(node.properties[key]),
      )
    )
      return { ok: true };
    return this.#edit(
      createSgfNode(node.id, properties, node.children, node.rawProperties),
      this.#selected,
      node.id,
    );
  }
  setComment(comment: string): CommandResult {
    this.#assertLive();
    comment = comment.replace(/\r\n|\n\r|\r/g, '\n').replace(/[\t\v\f]/g, ' ');
    if (comment.length > (this.#limits.maxValueLength ?? 65_536))
      return { ok: false, reason: 'limit' };
    const node = this.#index.nodes.get(this.#selected)!;
    if ((node.properties.C?.[0] ?? '') === comment) return { ok: true };
    const properties = { ...node.properties };
    if (comment) properties.C = [comment];
    else delete properties.C;
    return this.#edit(
      createSgfNode(node.id, properties, node.children, node.rawProperties),
      this.#selected,
      this.#selected,
      { grouped: true, commentOnly: true },
    );
  }
  /** Construct a validated preview without edits, navigation, notifications or export acknowledgment. */
  previewComments(
    changes: readonly CommentChange[],
  ):
    | { readonly ok: true; readonly preview: CommentBatchPreview }
    | Extract<CommandResult, { ok: false }> {
    this.#assertLive();
    try {
      const preview = buildCommentBatch(this.#record, changes, this.#index);
      if (preview.edits.length) {
        const diagnostics = this.#validateCandidate(preview.record, preview.edits);
        if (diagnostics) return { ok: false, reason: 'limit', diagnostics };
      }
      this.#commentPreviews.add(preview);
      return Object.freeze({ ok: true, preview });
    } catch (error) {
      if (error instanceof CommentBatchError) return { ok: false, reason: error.reason };
      throw error;
    }
  }
  /** Apply a preview from this controller only while its source is still current. */
  applyComments(preview: CommentBatchPreview): CommandResult {
    this.#assertLive();
    if (!preview || !this.#commentPreviews.has(preview))
      return { ok: false, reason: 'invalid-edit' };
    if (preview.source !== this.#record) return { ok: false, reason: 'stale-preview' };
    if (!preview.edits.length) return { ok: true };
    return this.#commit(preview.record, this.#selected, { commentOnly: true });
  }
  /** Apply a checked bounded batch as one notification and Undo unit. */
  setComments(changes: readonly CommentChange[]): CommandResult {
    const result = this.previewComments(changes);
    return result.ok ? this.applyComments(result.preview) : result;
  }
  removeBranch(id = this.#selected): CommandResult {
    this.#assertLive();
    if (!this.#index.nodes.has(id)) return { ok: false, reason: 'node-not-found' };
    const parentId = this.#index.parents.get(id);
    if (!parentId) return { ok: false, reason: 'invalid-edit' };
    const parent = this.#index.nodes.get(parentId)!;
    const selected = this.#path().includes(id) ? parentId : this.#selected;
    return this.#edit(
      createSgfNode(
        parent.id,
        parent.properties,
        parent.children.filter((child) => child.id !== id),
        parent.rawProperties,
      ),
      selected,
      parentId,
    );
  }
  reorderBranch(id: string, index: number): CommandResult {
    this.#assertLive();
    const node = this.#index.nodes.get(id);
    if (!node) return { ok: false, reason: 'node-not-found' };
    const parentId = this.#index.parents.get(id);
    if (!parentId) return { ok: false, reason: 'invalid-edit' };
    const parent = this.#index.nodes.get(parentId)!;
    if (!Number.isInteger(index) || index < 0 || index >= parent.children.length)
      return { ok: false, reason: 'invalid-edit' };
    if (parent.children[index]!.id === id) return { ok: true };
    const children = parent.children.filter((child) => child.id !== id);
    children.splice(index, 0, node);
    return this.#edit(
      createSgfNode(parent.id, parent.properties, children, parent.rawProperties),
      this.#selected,
      parentId,
    );
  }
  setSetup(stones: readonly SetupStone[], toPlay?: Color): CommandResult {
    this.#assertLive();
    const state = this.getState();
    const validated = setup(state.position, stones, toPlay);
    if (!validated.ok) return validated;
    if (!stones.length && toPlay === undefined) return { ok: true };
    const append = !!(state.node.properties.B || state.node.properties.W);
    const properties = append
      ? ({} as Record<string, readonly string[]>)
      : { ...state.node.properties };
    const points = new Map<string, Color | null>();
    for (const [key, color] of [
      ['AB', 'black'],
      ['AW', 'white'],
      ['AE', null],
    ] as const) {
      for (const value of properties[key] ?? [])
        for (const point of expandSgfPoints(value, state.position.width, state.position.height))
          points.set(pointToSgf(point), color);
      delete properties[key];
    }
    for (const stone of stones) points.set(pointToSgf(stone), stone.color);
    for (const [key, color] of [
      ['AB', 'black'],
      ['AW', 'white'],
      ['AE', null],
    ] as const) {
      const values = [...points]
        .filter(([, placed]) => placed === color)
        .map(([point]) => point)
        .sort();
      if (values.length) properties[key] = values;
    }
    if (toPlay !== undefined) properties.PL = [sgfColor(toPlay)];
    if (!append && JSON.stringify(properties) === JSON.stringify(state.node.properties))
      return { ok: true };
    if (!append)
      return this.#edit(
        createSgfNode(state.node.id, properties, state.node.children, state.node.rawProperties),
      );
    const child = createSgfNode(this.#newNodeId(), properties);
    return this.#edit(
      createSgfNode(
        state.node.id,
        state.node.properties,
        [...state.node.children, child],
        state.node.rawProperties,
      ),
      child.id,
    );
  }
  setConnection(from: Point, to: Point, kind: ConnectionKind, present = true): CommandResult {
    this.#assertLive();
    const state = this.getState();
    if (
      !isOnBoard(state.position, from) ||
      !isOnBoard(state.position, to) ||
      (from.x === to.x && from.y === to.y) ||
      !['line', 'arrow'].includes(kind)
    )
      return { ok: false, reason: 'invalid-annotation' };
    const key = kind === 'line' ? 'LN' : 'AR';
    const canonical = (value: string) =>
      kind === 'line' ? value.split(':').sort().join(':') : value;
    const target = canonical(`${pointToSgf(from)}:${pointToSgf(to)}`);
    const existing = state.node.properties[key] ?? [];
    const contained = existing.some((value) => canonical(value) === target);
    if (contained === present) return { ok: true };
    const values = present
      ? [...existing, target]
      : existing.filter((value) => canonical(value) !== target);
    const properties = { ...state.node.properties };
    if (values.length) properties[key] = values;
    else delete properties[key];
    return this.#edit(
      createSgfNode(state.node.id, properties, state.node.children, state.node.rawProperties),
    );
  }
  addStroke(points: readonly Point[], style: StrokeStyle = {}): CommandResult {
    this.#assertLive();
    const state = this.getState();
    if (!Array.isArray(points)) return { ok: false, reason: 'invalid-annotation' };
    if (
      state.strokes.length >= strokeLimits.strokes ||
      state.strokes.reduce((sum, stroke) => sum + stroke.points.length, 0) + points.length >
        strokeLimits.pointsPerNode
    )
      return { ok: false, reason: 'limit' };
    let id: string;
    do {
      id = `ink${++this.#strokeSequence}`;
    } while (state.strokes.some((stroke) => stroke.id === id));
    let stroke: Stroke;
    try {
      stroke = createStroke(id, points, state.position, style);
    } catch {
      return { ok: false, reason: 'invalid-annotation' };
    }
    const properties = {
      ...state.node.properties,
      BPN: [...(state.node.properties.BPN ?? []), encodeStroke(stroke)],
    };
    return this.#edit(
      createSgfNode(state.node.id, properties, state.node.children, state.node.rawProperties),
    );
  }
  removeStroke(id: string): CommandResult {
    this.#assertLive();
    const state = this.getState();
    const index = state.strokes.findIndex((stroke) => stroke.id === id);
    if (index < 0) return { ok: true };
    const values = [...state.node.properties.BPN!];
    values.splice(index, 1);
    return this.#replaceStrokes(values);
  }
  clearStrokes(): CommandResult {
    this.#assertLive();
    if (!this.getState().strokes.length) return { ok: true };
    return this.#replaceStrokes([]);
  }
  #replaceStrokes(values: readonly string[]): CommandResult {
    const node = this.getState().node;
    const properties = { ...node.properties };
    if (values.length) properties.BPN = values;
    else delete properties.BPN;
    return this.#edit(createSgfNode(node.id, properties, node.children, node.rawProperties));
  }
  setMarker(point: Point, kind: MarkerKind | null, label = 'A'): CommandResult {
    this.#assertLive();
    const state = this.getState();
    if (
      !isOnBoard(state.position, point) ||
      (kind !== null && !Object.hasOwn(markerProperties, kind)) ||
      label.length > (this.#limits.maxValueLength ?? 65_536) ||
      (kind === 'label' && !label.length)
    ) {
      return { ok: false, reason: 'invalid-annotation' };
    }
    label = label.replace(/[\r\n\t\v\f]/g, ' ');
    const existing = state.markers.filter(
      (marker) => marker.point.x === point.x && marker.point.y === point.y,
    );
    if (
      (kind === null && !existing.length) ||
      (existing.length === 1 &&
        existing[0]!.kind === kind &&
        (kind !== 'label' || existing[0]!.label === label))
    )
      return { ok: true };
    const properties = { ...state.node.properties };
    const target = pointToSgf(point);
    for (const [markerKind, key] of Object.entries(markerProperties)) {
      const values = properties[key] ?? [];
      const filtered =
        markerKind === 'label'
          ? values.filter((value) => value.slice(0, 2) !== target)
          : values
              .flatMap((value) =>
                expandSgfPoints(value, state.position.width, state.position.height).map(pointToSgf),
              )
              .filter((value) => value !== target);
      if (filtered.length) properties[key] = filtered;
      else delete properties[key];
    }
    if (kind !== null) {
      const key = markerProperties[kind];
      properties[key] = [
        ...(properties[key] ?? []),
        kind === 'label' ? `${target}:${label.replace(/[\r\n\t\v\f]/g, ' ')}` : target,
      ];
    }
    if (JSON.stringify(properties) === JSON.stringify(state.node.properties)) return { ok: true };
    return this.#edit(
      createSgfNode(state.node.id, properties, state.node.children, state.node.rawProperties),
    );
  }
  undo(): CommandResult {
    this.#assertLive();
    const entry = this.#undo.pop();
    if (!entry) return { ok: false, reason: 'no-history' };
    this.endEditGroup();
    this.#redo.push({ record: this.#record, selected: this.#selected });
    this.#record = entry.record;
    this.#selected = entry.selected;
    this.#reindex();
    this.#refreshDirty();
    this.#notify();
    return { ok: true };
  }
  redo(): CommandResult {
    this.#assertLive();
    const entry = this.#redo.pop();
    if (!entry) return { ok: false, reason: 'no-history' };
    this.endEditGroup();
    this.#undo.push({ record: this.#record, selected: this.#selected });
    this.#record = entry.record;
    this.#selected = entry.selected;
    this.#reindex();
    this.#refreshDirty();
    this.#notify();
    return { ok: true };
  }
  loadSgf(
    input: string | Uint8Array,
    options: { discardChanges?: boolean; locator?: RecordLocator } = {},
  ): CommandResult {
    const prepared = this.prepareImport(input, options);
    return prepared.ok ? this.applyImport(prepared.preview, options) : prepared;
  }
  /** Validate once under this controller's limits before asking the host for replacement approval. */
  prepareImport(
    input: string | Uint8Array,
    options: { locator?: RecordLocator } = {},
  ): ImportPreparation {
    this.#assertLive();
    const result =
      typeof input === 'string' ? parseSgf(input, this.#limits) : decodeSgf(input, this.#limits);
    if (!result.ok) return { ok: false, reason: 'import', diagnostics: result.diagnostics };
    const target =
      options.locator === undefined
        ? result.record.games[0]!
        : recordNodeAt(result.record, options.locator);
    if (!target) return { ok: false, reason: 'node-not-found' };
    const preview = Object.freeze({ record: result.record, node: target });
    this.#importPreviews.set(preview, this.#recordGeneration);
    return { ok: true, preview };
  }
  /** Apply an issued immutable preview without parsing again. Imports invalidate every older preview. */
  applyImport(
    preview: RecordImportPreview,
    options: { discardChanges?: boolean } = {},
  ): CommandResult {
    this.#assertLive();
    if (this.#importPreviews.get(preview) !== this.#recordGeneration)
      return { ok: false, reason: 'stale-preview' };
    if (this.#dirty && !options.discardChanges) return { ok: false, reason: 'unsaved-changes' };
    this.endEditGroup();
    this.#record = preview.record;
    this.#recordGeneration++;
    this.#selected = preview.node.id;
    this.#importPreviews = new WeakMap();
    this.#undo = [];
    this.#redo = [];
    this.#tickets.clear();
    this.#baselineRecord = this.#record;
    this.#baselineContent = new WeakMap();
    this.#serialized.clear();
    this.#dirty = false;
    this.#reindex();
    this.#notify();
    return { ok: true };
  }
  #rememberSerialized(record: SgfRecord, text: string): void {
    this.#serialized.delete(record);
    this.#serialized.set(record, text);
    if (this.#serialized.size > 2) this.#serialized.delete(this.#serialized.keys().next().value!);
  }
  #serialize(record: SgfRecord): string {
    const cached = this.#serialized.get(record);
    if (cached !== undefined) {
      // Keep the frequently reused export baseline while edited records rotate.
      this.#rememberSerialized(record, cached);
      return cached;
    }
    const text = serializeSgf(record);
    this.#rememberSerialized(record, text);
    return text;
  }
  /** Portable recovery data; creating a checkpoint never acknowledges an SGF export. */
  createCheckpoint(): RecordCheckpoint {
    this.#assertLive();
    const state = this.getState();
    let node = this.#record.games[state.gameIndex]!;
    const path: number[] = [];
    for (const id of state.path.slice(1)) {
      const index = node.children.findIndex((child) => child.id === id);
      path.push(index);
      node = node.children[index]!;
    }
    const checkpoint: RecordCheckpoint = Object.freeze({
      schemaVersion: 'banora.checkpoint/v1',
      sgf: this.#serialize(this.#record),
      baselineSgf: this.#serialize(this.#baselineRecord),
      selection: Object.freeze({ gameIndex: state.gameIndex, path: Object.freeze(path) }),
      rules: state.position.rules,
    });
    if (!matches(checkpoint, CHECKPOINT_SCHEMA))
      throw new RangeError('Record exceeds the portable checkpoint envelope.');
    return checkpoint;
  }
  /** Validate before replacement; restored history begins a new session. */
  loadCheckpoint(input: unknown, options: { discardChanges?: boolean } = {}): CommandResult {
    this.#assertLive();
    const parsed = parseRecordCheckpoint(input, this.#limits);
    if (!parsed.ok)
      return { ok: false, reason: 'invalid-checkpoint', diagnostics: parsed.diagnostics };
    if (this.#dirty && !options.discardChanges) return { ok: false, reason: 'unsaved-changes' };
    this.endEditGroup();
    this.#record = parsed.record;
    this.#selected = parsed.node.id;
    this.#importPreviews = new WeakMap();
    this.#rules = parsed.value.rules;
    this.#baselineRecord = parsed.baseline;
    this.#baselineContent = new WeakMap();
    this.#recordGeneration++;
    this.#undo = [];
    this.#redo = [];
    this.#tickets.clear();
    this.#serialized.clear();
    this.#reindex();
    this.#refreshDirty();
    this.#notify();
    return { ok: true };
  }
  prepareExport(): ExportTicket {
    this.#assertLive();
    const id = ++this.#ticketSequence;
    this.#tickets.set(id, { record: this.#record });
    if (this.#tickets.size > 8) this.#tickets.delete(this.#tickets.keys().next().value!);
    return Object.freeze({ id, text: this.#serialize(this.#record) });
  }
  acknowledgeExport(id: number): CommandResult {
    this.#assertLive();
    const baseline = this.#tickets.get(id);
    if (baseline === undefined || id <= this.#lastAcknowledged)
      return { ok: false, reason: 'invalid-export' };
    this.#baselineRecord = baseline.record;
    this.#baselineContent = new WeakMap();
    this.#lastAcknowledged = id;
    for (const key of this.#tickets.keys()) if (key <= id) this.#tickets.delete(key);
    this.#refreshDirty();
    this.#notify();
    return { ok: true };
  }
  cancelExport(id: number): void {
    this.#assertLive();
    this.#tickets.delete(id);
  }
  dispose(): void {
    this.#disposed = true;
    this.endEditGroup();
    this.#snapshot = undefined;
    this.#listeners.clear();
    this.#notifications = [];
    this.#tickets.clear();
    this.#importPreviews = new WeakMap();
    this.#positionCache.clear();
    this.#baselineContent = new WeakMap();
    this.#serialized.clear();
  }
}

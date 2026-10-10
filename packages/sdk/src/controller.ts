import { isOnBoard, pass, play, setup } from './core.js';
import type { Color, MoveFailure, Point, Position, RulePolicy, SetupStone } from './core.js';
import { createSgfNode, decodeSgf, expandSgfPoints, parseSgf, pointFromSgf, pointToSgf, serializeSgf } from './sgf.js';
import type { SgfDiagnostic, SgfLimits, SgfNode, SgfRecord } from './sgf.js';
import { applyRecordNode, indexRecord, initialRecordPosition, semanticRecord, sgfColor } from './record-runtime.js';
import type { RecordIndex } from './record-runtime.js';

export type MarkerKind = 'triangle' | 'square' | 'circle' | 'cross' | 'label';
export interface Marker { readonly point: Point; readonly kind: MarkerKind; readonly label?: string }
export type ConnectionKind = 'line' | 'arrow';
export interface Connection { readonly kind: ConnectionKind; readonly from: Point; readonly to: Point }
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
}
export type ControllerFailure = MoveFailure | 'unsaved-changes' | 'node-not-found' |
  'no-history' | 'invalid-annotation' | 'invalid-edit' | 'import' | 'invalid-export' | 'limit';
export type CommandResult = { readonly ok: true } |
  { readonly ok: false; readonly reason: ControllerFailure; readonly diagnostics?: readonly SgfDiagnostic[] };
export interface ControllerOptions {
  readonly sgf?: string | Uint8Array;
  readonly size?: number;
  readonly rules?: Partial<RulePolicy>;
  readonly limits?: Partial<SgfLimits>;
}
export interface ExportTicket { readonly id: number; readonly text: string }
interface EditEntry { record: SgfRecord; selected: string }
const markerProperties: Readonly<Record<MarkerKind, string>> = {
  triangle: 'TR', square: 'SQ', circle: 'CR', cross: 'MA', label: 'LB',
};

export class RecordController {
  #record: SgfRecord;
  #selected: string;
  #index: RecordIndex;
  #positionCache = new Map<string, Position>();
  #rules: Partial<RulePolicy> | undefined;
  #limits: Partial<SgfLimits>;
  #baseline: string;
  #dirty = false;
  #undo: EditEntry[] = [];
  #redo: EditEntry[] = [];
  #group = false;
  #groupRecorded = false;
  #listeners = new Set<(state: ControllerState) => void>();
  #notifications: ControllerState[] = [];
  #snapshot: ControllerState | undefined;
  #notifying = false;
  #disposed = false;
  #nodeSequence = 0;
  #ticketSequence = 0;
  #lastAcknowledged = 0;
  #tickets = new Map<number, string>();

  constructor(options: ControllerOptions = {}) {
    this.#rules = options.rules ? Object.freeze({ ...options.rules }) : undefined;
    this.#limits = Object.freeze({ ...options.limits });
    const input = options.sgf ?? `(;FF[4]GM[1]CA[UTF-8]SZ[${options.size ?? 19}])`;
    const parsed = typeof input === 'string' ? parseSgf(input, this.#limits) : decodeSgf(input, this.#limits);
    if (!parsed.ok) throw new Error(parsed.diagnostics.map(item => item.message).join('; '));
    this.#record = parsed.record;
    this.#selected = parsed.record.games[0]!.id;
    this.#index = indexRecord(this.#record);
    this.#baseline = semanticRecord(this.#record);
    this.getState();
  }

  #assertLive(): void { if (this.#disposed) throw new Error('RecordController is disposed'); }
  #path(id = this.#selected): string[] {
    const path: string[] = [];
    let current: string | null = id;
    while (current !== null) { path.push(current); current = this.#index.parents.get(current) ?? null; }
    return path.reverse();
  }
  #position(): Position {
    const path = this.#path();
    const root = this.#index.nodes.get(path[0]!)!;
    let position = initialRecordPosition(root, this.#rules);
    let start = 0;
    for (let i = path.length - 1; i >= 0; i--) {
      const cached = this.#positionCache.get(path[i]!);
      if (cached) { position = cached; start = i + 1; break; }
    }
    for (let i = start; i < path.length; i++) {
      position = applyRecordNode(position, this.#index.nodes.get(path[i]!)!);
      this.#positionCache.set(path[i]!, position);
      if (this.#positionCache.size > 128) this.#positionCache.delete(this.#positionCache.keys().next().value!);
    }
    return position;
  }
  getState(): ControllerState {
    this.#assertLive();
    if (this.#snapshot) return this.#snapshot;
    const node = this.#index.nodes.get(this.#selected)!;
    const position = this.#position();
    const markers: Marker[] = [];
    for (const [kind, key] of Object.entries(markerProperties) as [MarkerKind, string][]) {
      for (const value of node.properties[key] ?? []) {
        if (kind === 'label') markers.push(Object.freeze({ kind, point: pointFromSgf(value.slice(0, 2), position.width, position.height), label: value.slice(3) }));
        else for (const point of expandSgfPoints(value, position.width, position.height)) {
          markers.push(Object.freeze({ kind, point: Object.freeze(point) }));
        }
      }
    }
    const connections: Connection[] = [];
    for (const [kind, key] of [['line', 'LN'], ['arrow', 'AR']] as const) {
      for (const value of node.properties[key] ?? []) connections.push(Object.freeze({ kind,
        from: pointFromSgf(value.slice(0, 2), position.width, position.height),
        to: pointFromSgf(value.slice(3), position.width, position.height) }));
    }
    return this.#snapshot = Object.freeze({ record: this.#record, node, position, path: Object.freeze(this.#path()),
      gameIndex: this.#index.games.get(this.#selected)!, dirty: this.#dirty,
      canUndo: this.#undo.length > 0, canRedo: this.#redo.length > 0,
      markers: Object.freeze(markers), connections: Object.freeze(connections) });
  }
  subscribe(listener: (state: ControllerState) => void): () => void {
    this.#assertLive();
    this.#listeners.add(listener);
    try { listener(this.getState()); } catch (error) { this.#listeners.delete(listener); throw error; }
    return () => { this.#listeners.delete(listener); };
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
          try { listener(state); } catch (error) { console.error('Banora state listener failed', error); }
        }
      }
    } finally { this.#notifying = false; }
  }
  #reindex(): void { this.#index = indexRecord(this.#record); this.#positionCache.clear(); }
  #refreshDirty(): void { this.#dirty = semanticRecord(this.#record) !== this.#baseline; }
  beginEditGroup(): void { this.#assertLive(); this.endEditGroup(); this.#group = true; }
  endEditGroup(): void { this.#group = false; this.#groupRecorded = false; }

  #newNodeId(): string {
    let id: string;
    do { id = `e${++this.#nodeSequence}`; } while (this.#index.nodes.has(id));
    return id;
  }
  #edit(replacement: SgfNode, selected = this.#selected, target = this.#selected): CommandResult {
    const path = this.#path(target);
    let updated = replacement;
    for (let i = path.length - 2; i >= 0; i--) {
      const parent = this.#index.nodes.get(path[i]!)!;
      updated = createSgfNode(parent.id, parent.properties,
        parent.children.map(child => child.id === path[i + 1] ? updated : child), parent.rawProperties);
    }
    const game = this.#index.games.get(target)!;
    const candidate = Object.freeze({ games: Object.freeze(this.#record.games.map((root, index) => index === game ? updated : root)) });
    const validation = parseSgf(serializeSgf(candidate), this.#limits);
    if (!validation.ok) return { ok: false, reason: 'limit', diagnostics: validation.diagnostics };
    if (!this.#group || !this.#groupRecorded) {
      this.#undo.push({ record: this.#record, selected: this.#selected });
      if (this.#undo.length > 100) this.#undo.shift();
      this.#groupRecorded = true;
    }
    this.#redo = [];
    this.#record = candidate;
    this.#selected = selected;
    this.#reindex();
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
    this.endEditGroup();
    const state = this.getState();
    const result = point ? play(state.position, point) : pass(state.position);
    if (!result.ok) return result;
    const key = sgfColor(state.position.toPlay);
    const value = point ? pointToSgf(point) : '';
    const existing = state.node.children.find(child => child.properties[key]?.[0] === value);
    if (existing) return this.goTo(existing.id);
    if (this.#index.nodes.size >= (this.#limits.maxNodes ?? 50_000)) return { ok: false, reason: 'limit' };
    const id = this.#newNodeId();
    const child = createSgfNode(id, { [key]: [value] });
    return this.#edit(createSgfNode(state.node.id, state.node.properties, [...state.node.children, child], state.node.rawProperties), id);
  }
  setComment(comment: string): CommandResult {
    this.#assertLive();
    comment = comment.replace(/\r\n|\n\r|\r/g, '\n').replace(/[\t\v\f]/g, ' ');
    if (comment.length > (this.#limits.maxValueLength ?? 65_536)) return { ok: false, reason: 'limit' };
    const node = this.#index.nodes.get(this.#selected)!;
    if ((node.properties.C?.[0] ?? '') === comment) return { ok: true };
    const properties = { ...node.properties };
    if (comment) properties.C = [comment]; else delete properties.C;
    return this.#edit(createSgfNode(node.id, properties, node.children, node.rawProperties));
  }
  removeBranch(id = this.#selected): CommandResult {
    this.#assertLive();
    if (!this.#index.nodes.has(id)) return { ok: false, reason: 'node-not-found' };
    const parentId = this.#index.parents.get(id);
    if (!parentId) return { ok: false, reason: 'invalid-edit' };
    const parent = this.#index.nodes.get(parentId)!;
    const selected = this.#path().includes(id) ? parentId : this.#selected;
    this.endEditGroup();
    return this.#edit(createSgfNode(parent.id, parent.properties,
      parent.children.filter(child => child.id !== id), parent.rawProperties), selected, parentId);
  }
  reorderBranch(id: string, index: number): CommandResult {
    this.#assertLive();
    const node = this.#index.nodes.get(id);
    if (!node) return { ok: false, reason: 'node-not-found' };
    const parentId = this.#index.parents.get(id);
    if (!parentId) return { ok: false, reason: 'invalid-edit' };
    const parent = this.#index.nodes.get(parentId)!;
    if (!Number.isInteger(index) || index < 0 || index >= parent.children.length) return { ok: false, reason: 'invalid-edit' };
    if (parent.children[index]!.id === id) return { ok: true };
    const children = parent.children.filter(child => child.id !== id);
    children.splice(index, 0, node);
    this.endEditGroup();
    return this.#edit(createSgfNode(parent.id, parent.properties, children, parent.rawProperties), this.#selected, parentId);
  }
  setSetup(stones: readonly SetupStone[], toPlay?: Color): CommandResult {
    this.#assertLive();
    const state = this.getState();
    const validated = setup(state.position, stones, toPlay);
    if (!validated.ok) return validated;
    if (!stones.length && toPlay === undefined) return { ok: true };
    const append = !!(state.node.properties.B || state.node.properties.W);
    const properties = append ? {} as Record<string, readonly string[]> : { ...state.node.properties };
    const points = new Map<string, Color | null>();
    for (const [key, color] of [['AB', 'black'], ['AW', 'white'], ['AE', null]] as const) {
      for (const value of properties[key] ?? []) for (const point of expandSgfPoints(value, state.position.width, state.position.height)) points.set(pointToSgf(point), color);
      delete properties[key];
    }
    for (const stone of stones) points.set(pointToSgf(stone), stone.color);
    for (const [key, color] of [['AB', 'black'], ['AW', 'white'], ['AE', null]] as const) {
      const values = [...points].filter(([, placed]) => placed === color).map(([point]) => point).sort();
      if (values.length) properties[key] = values;
    }
    if (toPlay !== undefined) properties.PL = [sgfColor(toPlay)];
    if (!append && JSON.stringify(properties) === JSON.stringify(state.node.properties)) return { ok: true };
    this.endEditGroup();
    if (!append) return this.#edit(createSgfNode(state.node.id, properties, state.node.children, state.node.rawProperties));
    const child = createSgfNode(this.#newNodeId(), properties);
    return this.#edit(createSgfNode(state.node.id, state.node.properties, [...state.node.children, child], state.node.rawProperties), child.id);
  }
  setConnection(from: Point, to: Point, kind: ConnectionKind, present = true): CommandResult {
    this.#assertLive();
    const state = this.getState();
    if (!isOnBoard(state.position, from) || !isOnBoard(state.position, to) ||
      (from.x === to.x && from.y === to.y) || !['line', 'arrow'].includes(kind)) return { ok: false, reason: 'invalid-annotation' };
    const key = kind === 'line' ? 'LN' : 'AR';
    const canonical = (value: string) => kind === 'line' ? value.split(':').sort().join(':') : value;
    const target = canonical(`${pointToSgf(from)}:${pointToSgf(to)}`);
    const existing = state.node.properties[key] ?? [];
    const contained = existing.some(value => canonical(value) === target);
    if (contained === present) return { ok: true };
    const values = present ? [...existing, target] : existing.filter(value => canonical(value) !== target);
    const properties = { ...state.node.properties };
    if (values.length) properties[key] = values; else delete properties[key];
    this.endEditGroup();
    return this.#edit(createSgfNode(state.node.id, properties, state.node.children, state.node.rawProperties));
  }
  setMarker(point: Point, kind: MarkerKind | null, label = 'A'): CommandResult {
    this.#assertLive();
    const state = this.getState();
    if (!isOnBoard(state.position, point) || (kind !== null && !Object.hasOwn(markerProperties, kind)) ||
      label.length > (this.#limits.maxValueLength ?? 65_536) || (kind === 'label' && !label.length)) {
      return { ok: false, reason: 'invalid-annotation' };
    }
    this.endEditGroup();
    label = label.replace(/[\r\n\t\v\f]/g, ' ');
    const existing = state.markers.filter(marker => marker.point.x === point.x && marker.point.y === point.y);
    if ((kind === null && !existing.length) || (existing.length === 1 && existing[0]!.kind === kind &&
        (kind !== 'label' || existing[0]!.label === label))) return { ok: true };
    const properties = { ...state.node.properties };
    const target = pointToSgf(point);
    for (const [markerKind, key] of Object.entries(markerProperties)) {
      const values = properties[key] ?? [];
      const filtered = markerKind === 'label' ? values.filter(value => value.slice(0, 2) !== target) :
        values.flatMap(value => expandSgfPoints(value, state.position.width, state.position.height).map(pointToSgf)).filter(value => value !== target);
      if (filtered.length) properties[key] = filtered; else delete properties[key];
    }
    if (kind !== null) {
      const key = markerProperties[kind];
      properties[key] = [...(properties[key] ?? []), kind === 'label' ? `${target}:${label.replace(/[\r\n\t\v\f]/g, ' ')}` : target];
    }
    if (JSON.stringify(properties) === JSON.stringify(state.node.properties)) return { ok: true };
    return this.#edit(createSgfNode(state.node.id, properties, state.node.children, state.node.rawProperties));
  }
  undo(): CommandResult {
    this.#assertLive(); this.endEditGroup();
    const entry = this.#undo.pop();
    if (!entry) return { ok: false, reason: 'no-history' };
    this.#redo.push({ record: this.#record, selected: this.#selected });
    this.#record = entry.record; this.#selected = entry.selected;
    this.#reindex(); this.#refreshDirty(); this.#notify();
    return { ok: true };
  }
  redo(): CommandResult {
    this.#assertLive(); this.endEditGroup();
    const entry = this.#redo.pop();
    if (!entry) return { ok: false, reason: 'no-history' };
    this.#undo.push({ record: this.#record, selected: this.#selected });
    this.#record = entry.record; this.#selected = entry.selected;
    this.#reindex(); this.#refreshDirty(); this.#notify();
    return { ok: true };
  }
  loadSgf(input: string | Uint8Array, options: { discardChanges?: boolean } = {}): CommandResult {
    this.#assertLive();
    const result = typeof input === 'string' ? parseSgf(input, this.#limits) : decodeSgf(input, this.#limits);
    if (!result.ok) return { ok: false, reason: 'import', diagnostics: result.diagnostics };
    if (this.#dirty && !options.discardChanges) return { ok: false, reason: 'unsaved-changes' };
    this.endEditGroup();
    this.#record = result.record;
    this.#selected = result.record.games[0]!.id;
    this.#undo = []; this.#redo = []; this.#tickets.clear();
    this.#baseline = semanticRecord(this.#record); this.#dirty = false;
    this.#reindex(); this.#notify();
    return { ok: true };
  }
  prepareExport(): ExportTicket {
    this.#assertLive();
    const id = ++this.#ticketSequence;
    this.#tickets.set(id, semanticRecord(this.#record));
    if (this.#tickets.size > 8) this.#tickets.delete(this.#tickets.keys().next().value!);
    return Object.freeze({ id, text: serializeSgf(this.#record) });
  }
  acknowledgeExport(id: number): CommandResult {
    this.#assertLive();
    const baseline = this.#tickets.get(id);
    if (baseline === undefined || id <= this.#lastAcknowledged) return { ok: false, reason: 'invalid-export' };
    this.#baseline = baseline; this.#lastAcknowledged = id;
    for (const key of this.#tickets.keys()) if (key <= id) this.#tickets.delete(key);
    this.#refreshDirty(); this.#notify();
    return { ok: true };
  }
  cancelExport(id: number): void { this.#assertLive(); this.#tickets.delete(id); }
  dispose(): void {
    this.#disposed = true;
    this.#snapshot = undefined;
    this.#listeners.clear(); this.#notifications = []; this.#tickets.clear(); this.#positionCache.clear();
  }
}

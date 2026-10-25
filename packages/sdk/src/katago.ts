import { AnalysisError } from './analysis-types.js';
import type {
  AnalysisActionResult,
  AnalysisCancellation,
  AnalysisProvider,
  AnalysisRequest,
} from './analysis-types.js';
import {
  createKataGoQuery,
  decodeKataGoResult,
  kataGoOptions,
  snapshotKataGoRequest,
} from './katago-protocol.js';
import type { KataGoOptions } from './katago-protocol.js';
export { createKataGoQuery, decodeKataGoResult } from './katago-protocol.js';
export type { KataGoOptions, KataGoPerspective, KataGoQuery } from './katago-protocol.js';

/** Host writes each string as one JSON line, preserving call order. No newline included. */
export interface KataGoTransport {
  sendLine(line: string): void | Promise<void>;
}
export interface KataGoProviderOptions extends KataGoOptions {
  readonly id?: string;
  readonly maxPending?: number;
}
interface Pending {
  readonly request: AnalysisRequest;
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: AnalysisError) => void;
  unsubscribe: () => void;
  sent: boolean;
  readonly sendFailure: SendFailure;
}
interface SendFailure {
  deliver?: () => void;
}
// The transport may retain an unsettled write forever. Its rejection handler
// must capture only this detachable lease, never the provider or request scope.
function sendFailure(lease: SendFailure): () => void {
  return () => lease.deliver?.();
}
const MAX_LINE = 1048576;
let sequence = 0;
/** Host feeds engine stdout JSON lines explicitly; no process/socket/timer is created. */
export class KataGoProvider implements AnalysisProvider {
  readonly id: string;
  readonly #options: Readonly<Required<KataGoOptions>>;
  readonly #maxPending: number;
  readonly #prefix: string;
  #actionSequence = 0;
  #transport: KataGoTransport | null;
  #disposing = false;
  readonly #pending = new Map<string, Pending>();
  constructor(transport: KataGoTransport, options: KataGoProviderOptions) {
    this.#options = kataGoOptions(options);
    this.id = options.id ?? 'katago';
    this.#maxPending = options.maxPending ?? 8;
    if (
      typeof this.id !== 'string' ||
      !/^[A-Za-z0-9_-]{1,64}$/.test(this.id) ||
      !Number.isInteger(this.#maxPending) ||
      this.#maxPending < 1 ||
      this.#maxPending > 64 ||
      !transport ||
      typeof transport.sendLine !== 'function'
    )
      throw TypeError('Invalid KataGo provider identity, capacity or transport.');
    if (!Number.isSafeInteger(++sequence))
      throw RangeError('KataGo provider identities exhausted.');
    this.#prefix = `banora-katago-action-${sequence}-`;
    this.#transport = { sendLine: transport.sendLine.bind(transport) };
  }
  analyze(request: AnalysisRequest, cancellation: AnalysisCancellation): Promise<unknown> {
    try {
      if (!this.#transport || this.#disposing)
        throw new AnalysisError('disposed', 'KataGo provider is disposed.');
      if (cancellation.cancelled)
        throw new AnalysisError('cancelled', 'KataGo request was cancelled.');
      request = snapshotKataGoRequest(request);
      const query = createKataGoQuery(request, this.#options),
        line = JSON.stringify(query);
      if (line.length > MAX_LINE)
        throw new AnalysisError('limit', 'KataGo query exceeds the JSON line limit.');
      if (this.#pending.size >= this.#maxPending)
        throw new AnalysisError('limit', 'KataGo pending query capacity was reached.');
      if (this.#pending.has(request.id) || request.id.startsWith('banora-katago-action-'))
        throw new AnalysisError(
          'invalid-request',
          'KataGo query ID is already pending or reserved.',
        );
      return new Promise((resolve, reject) => {
        const pending: Pending = {
          request,
          resolve,
          reject,
          unsubscribe: () => {},
          sent: false,
          sendFailure: {},
        };
        this.#pending.set(request.id, pending);
        try {
          const unsubscribe = cancellation.onCancel(() =>
            this.#finish(
              pending,
              new AnalysisError('cancelled', 'KataGo request was cancelled.'),
              true,
            ),
          );
          if (this.#pending.get(request.id) !== pending) {
            unsubscribe();
            return;
          }
          pending.unsubscribe = unsubscribe;
        } catch {
          this.#finish(
            pending,
            new AnalysisError('provider', 'KataGo cancellation subscription failed.'),
            false,
          );
          return;
        }
        pending.sent = true;
        pending.sendFailure.deliver = () =>
          this.#finish(pending, new AnalysisError('provider', 'KataGo transport failed.'), false);
        this.#send(line, sendFailure(pending.sendFailure));
      });
    } catch (error) {
      return Promise.reject(
        error instanceof AnalysisError
          ? error
          : new AnalysisError('provider', 'KataGo request could not be submitted.'),
      );
    }
  }
  /** Ignore unrelated IDs/action acknowledgements and interim reports; validate finals. */
  receiveLine(input: string): AnalysisActionResult {
    try {
      if (!this.#transport || this.#disposing)
        throw new AnalysisError('disposed', 'KataGo provider is disposed.');
      if (typeof input !== 'string' || input.length > MAX_LINE + 2)
        throw new AnalysisError('limit', 'KataGo response exceeds the JSON line limit.');
      const line = input.replace(/\r?\n$/, '');
      if (line.length > MAX_LINE)
        throw new AnalysisError('limit', 'KataGo response exceeds the JSON line limit.');
      if (/[\r\n]/.test(line))
        throw new AnalysisError('invalid-result', 'Expected one KataGo JSON line.');
      let value: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(line);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error();
        value = parsed as Record<string, unknown>;
      } catch {
        throw new AnalysisError('invalid-result', 'Invalid KataGo JSON response.');
      }
      if (typeof value.id !== 'string' || value.id.length > 128)
        throw new AnalysisError('invalid-result', 'KataGo response has no bounded query ID.');
      const pending = this.#pending.get(value.id);
      if (!pending) return { ok: true };
      if (Object.hasOwn(value, 'error') || Object.hasOwn(value, 'warning')) {
        const warning = Object.hasOwn(value, 'warning'),
          error = new AnalysisError(
            warning ? 'unsupported' : 'provider',
            warning
              ? 'KataGo warned about the query; analysis was rejected.'
              : 'KataGo rejected the query.',
          );
        this.#finish(pending, error, warning);
        return { ok: false, reason: error.reason, message: error.message };
      }
      if (
        value.turnNumber !== pending.request.context.moves.length ||
        typeof value.isDuringSearch !== 'boolean'
      ) {
        const error = new AnalysisError(
          'invalid-result',
          'KataGo response turn or final status does not match.',
        );
        this.#finish(pending, error, true);
        return { ok: false, reason: error.reason, message: error.message };
      }
      if (value.isDuringSearch) return { ok: true };
      try {
        const result = decodeKataGoResult(pending.request, value, this.#options);
        this.#take(pending);
        pending.resolve(result);
        return { ok: true };
      } catch (error) {
        const failure =
          error instanceof AnalysisError
            ? error
            : new AnalysisError('invalid-result', 'Invalid KataGo response.');
        this.#finish(pending, failure, false);
        return { ok: false, reason: failure.reason, message: failure.message };
      }
    } catch (error) {
      const failure =
        error instanceof AnalysisError
          ? error
          : new AnalysisError('invalid-result', 'Invalid KataGo response.');
      if (failure.reason !== 'disposed')
        for (const pending of [...this.#pending.values()]) this.#finish(pending, failure, true);
      return { ok: false, reason: failure.reason, message: failure.message };
    }
  }
  /** Host calls on EOF/disconnect. Subsequent requests require a host-restored transport. */
  fail(): void {
    for (const pending of [...this.#pending.values()])
      this.#finish(pending, new AnalysisError('provider', 'KataGo transport disconnected.'), false);
  }
  dispose(): void {
    if (!this.#transport || this.#disposing) return;
    this.#disposing = true;
    for (const pending of [...this.#pending.values()])
      this.#finish(pending, new AnalysisError('disposed', 'KataGo provider is disposed.'), true);
    this.#transport = null;
  }
  #take(pending: Pending): boolean {
    if (this.#pending.get(pending.request.id) !== pending) return false;
    this.#pending.delete(pending.request.id);
    pending.sendFailure.deliver = undefined;
    try {
      pending.unsubscribe();
    } catch {
      console.error('KataGo cancellation cleanup failed.');
    }
    return true;
  }
  #finish(pending: Pending, error: AnalysisError, terminate: boolean): void {
    if (!this.#take(pending)) return;
    pending.reject(error);
    if (terminate && pending.sent && Number.isSafeInteger(++this.#actionSequence)) {
      this.#send(
        JSON.stringify({
          id: this.#prefix + this.#actionSequence,
          action: 'terminate',
          terminateId: pending.request.id,
          turnNumbers: [pending.request.context.moves.length],
        }),
        () => {},
      );
    }
  }
  #send(line: string, onError: () => void): void {
    try {
      const result = this.#transport?.sendLine(line);
      if (result) Promise.resolve(result).catch(onError);
    } catch {
      onError();
    }
  }
}

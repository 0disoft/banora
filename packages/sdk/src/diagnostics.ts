import type { ControllerFailure } from './controller.js';
import type { AnalysisFailureReason } from './analysis-types.js';
import type { SgfDiagnostic } from './sgf.js';
import type { AutomationError } from './automation.js';
import type { ScoreFailure } from './scoring.js';
import { SUPPORTED_LOCALES } from './locale-codes.js';
import type { BanoraLocale } from './locale-codes.js';

export type DiagnosticRecovery =
  | 'correct-input'
  | 'choose-position'
  | 'review-changes'
  | 'reopen-source'
  | 'check-storage'
  | 'check-provider'
  | 'wait'
  | 'retry'
  | 'report'
  | 'none';

const controller = {
  'out-of-bounds': 'choose-position',
  occupied: 'choose-position',
  'wrong-turn': 'correct-input',
  suicide: 'choose-position',
  ko: 'choose-position',
  superko: 'choose-position',
  'invalid-setup': 'correct-input',
  'unsaved-changes': 'review-changes',
  'node-not-found': 'choose-position',
  'no-history': 'none',
  'invalid-annotation': 'correct-input',
  'invalid-edit': 'correct-input',
  import: 'reopen-source',
  'invalid-export': 'review-changes',
  'invalid-checkpoint': 'reopen-source',
  'stale-preview': 'review-changes',
  limit: 'correct-input',
} as const satisfies Record<ControllerFailure, DiagnosticRecovery>;
const sgf = {
  syntax: 'correct-input',
  limit: 'correct-input',
  encoding: 'reopen-source',
  unsupported: 'correct-input',
  property: 'correct-input',
} as const satisfies Record<SgfDiagnostic['code'], DiagnosticRecovery>;
const analysis = {
  'invalid-context': 'correct-input',
  'unsupported-history': 'check-provider',
  'invalid-request': 'correct-input',
  'invalid-result': 'check-provider',
  provider: 'check-provider',
  unsupported: 'check-provider',
  cancelled: 'none',
  stale: 'review-changes',
  disposed: 'none',
  busy: 'wait',
  limit: 'correct-input',
} as const satisfies Record<AnalysisFailureReason, DiagnosticRecovery>;
const reasons = {
  controller,
  sgf,
  analysis,
  automation: {
    'invalid-request': 'correct-input',
    'invalid-input': 'correct-input',
    'command-failed': 'review-changes',
  } satisfies Record<AutomationError['code'], DiagnosticRecovery>,
  scoring: {
    'invalid-profile': 'correct-input',
    'invalid-position': 'choose-position',
    'invalid-options': 'correct-input',
    'invalid-selection': 'choose-position',
    'profile-mismatch': 'review-changes',
  } satisfies Record<ScoreFailure, DiagnosticRecovery>,
  storage: {
    unavailable: 'check-storage',
    blocked: 'check-storage',
    quota: 'check-storage',
    full: 'check-storage',
    conflict: 'review-changes',
    invalid: 'reopen-source',
    timeout: 'retry',
    failed: 'check-storage',
  },
  io: {
    read: 'reopen-source',
    write: 'retry',
    encoding: 'reopen-source',
    timeout: 'retry',
    network: 'retry',
    cancelled: 'none',
    unavailable: 'check-provider',
  },
} as const satisfies Record<string, Readonly<Record<string, DiagnosticRecovery>>>;
export type DiagnosticDomain = keyof typeof reasons;
export interface DiagnosticFailure {
  readonly domain: DiagnosticDomain;
  readonly code: string;
  readonly recovery: DiagnosticRecovery;
  /** A manual retry may help after checking state; never an automatic replay instruction. */
  readonly retryable: boolean;
}

/** Never stringify arbitrary errors, messages, stacks or unknown codes. */
export function describeDiagnosticFailure(
  domain: DiagnosticDomain,
  code: unknown,
): DiagnosticFailure {
  if (typeof domain !== 'string' || !Object.hasOwn(reasons, domain))
    throw TypeError('Invalid diagnostic domain.');
  const table: Readonly<Record<string, DiagnosticRecovery>> = reasons[domain];
  const known = typeof code === 'string' && Object.hasOwn(table, code);
  const recovery = known ? table[code]! : 'report';
  return Object.freeze({
    domain,
    code: known ? code : 'unknown',
    recovery,
    retryable: recovery === 'wait' || recovery === 'retry',
  });
}

const operations = [
  'import',
  'export',
  'navigate',
  'edit',
  'batch',
  'search',
  'scoring',
  'analysis',
  'checkpoint',
  'restore',
  'backup',
  'preferences',
  'diagram',
  'share',
  'puzzle',
] as const;
export type DiagnosticOperation = (typeof operations)[number];
export type DiagnosticStatus = 'success' | 'failure' | 'cancelled';
export type DiagnosticInput = {
  readonly operation: DiagnosticOperation;
  readonly durationMs?: number;
} & (
  | { readonly status: 'failure'; readonly failure: DiagnosticFailure }
  | { readonly status: 'success' | 'cancelled'; readonly failure?: never }
);
export type DiagnosticEvent = DiagnosticInput & {
  readonly id: string;
};
export interface DiagnosticEnvironment {
  readonly runtime?: 'browser' | 'node' | 'bun' | 'unknown';
  readonly runtimeMajor?: number;
  readonly platform?: 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown';
  readonly locale?: BanoraLocale;
}
export interface DiagnosticSummary {
  readonly operation: DiagnosticOperation;
  readonly success: number;
  readonly failure: number;
  readonly cancelled: number;
  readonly timed: number;
  readonly durationTotalMs: number;
  readonly durationMaxMs: number;
}
export interface DiagnosticReport {
  readonly schemaVersion: 'banora.diagnostics/v1';
  readonly environment: DiagnosticEnvironment;
  readonly capacity: number;
  readonly dropped: number;
  readonly events: readonly DiagnosticEvent[];
  /** Summaries cover retained events only, not lifetime traffic or external service SLOs. */
  readonly summary: readonly DiagnosticSummary[];
}

function fields(input: unknown, allowed: readonly string[]): Record<string, unknown> {
  // Read data descriptors rather than executing a getter that could leak private error text.
  try {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw 0;
    const proto = Object.getPrototypeOf(input);
    // Plain objects from another realm (classic script / iframe / VM) have a
    // different Object.prototype. Their prototype still has a null parent.
    if (proto !== null && Object.getPrototypeOf(proto) !== null) throw 0;
    const result: Record<string, unknown> = Object.create(null);
    for (const key of Reflect.ownKeys(input)) {
      if (typeof key !== 'string' || !allowed.includes(key)) throw 0;
      const descriptor = Object.getOwnPropertyDescriptor(input, key);
      if (!descriptor || !Object.hasOwn(descriptor, 'value')) throw 0;
      result[key] = descriptor.value;
    }
    return result;
  } catch {
    throw TypeError('Invalid diagnostic fields.');
  }
}
function environment(input: DiagnosticEnvironment): DiagnosticEnvironment {
  const data = fields(input, ['runtime', 'runtimeMajor', 'platform', 'locale']);
  const output: Record<string, string | number> = {};
  const choices = {
    runtime: ['browser', 'node', 'bun', 'unknown'],
    platform: ['windows', 'macos', 'linux', 'android', 'ios', 'unknown'],
    locale: SUPPORTED_LOCALES as readonly string[],
  };
  for (const key of ['runtime', 'platform', 'locale'] as const) {
    const value = data[key];
    if (value === undefined) continue;
    if (typeof value !== 'string' || !choices[key].includes(value))
      throw TypeError('Invalid diagnostic environment.');
    output[key] = value;
  }
  if (data.runtimeMajor !== undefined) {
    if (
      !output.runtime ||
      output.runtime === 'unknown' ||
      !Number.isInteger(data.runtimeMajor) ||
      (data.runtimeMajor as number) < 1 ||
      (data.runtimeMajor as number) > 999
    )
      throw TypeError('Invalid diagnostic runtime major.');
    output.runtimeMajor = data.runtimeMajor as number;
  }
  return Object.freeze(output) as DiagnosticEnvironment;
}

/** Explicit, bounded in-memory evidence; no subscriptions, clocks, storage, console or network. */
export class DiagnosticJournal {
  readonly #capacity: number;
  #sequence = 0;
  #dropped = 0;
  #events: DiagnosticEvent[] = [];
  constructor(options: { readonly capacity?: number } = {}) {
    const data = fields(options, ['capacity']);
    const capacity = data.capacity === undefined ? 64 : data.capacity;
    if (!Number.isInteger(capacity) || (capacity as number) < 1 || (capacity as number) > 256)
      throw RangeError('Diagnostic capacity must be 1–256.');
    this.#capacity = capacity as number;
  }
  get capacity(): number {
    return this.#capacity;
  }
  record(input: DiagnosticInput): DiagnosticEvent {
    const data = fields(input, ['operation', 'status', 'durationMs', 'failure']);
    if (
      typeof data.operation !== 'string' ||
      !operations.includes(data.operation as DiagnosticOperation) ||
      !['success', 'failure', 'cancelled'].includes(data.status as string)
    )
      throw TypeError('Invalid diagnostic operation or status.');
    const duration = data.durationMs;
    if (
      duration !== undefined &&
      (typeof duration !== 'number' ||
        !Number.isFinite(duration) ||
        duration < 0 ||
        duration > 86_400_000)
    )
      throw RangeError('Invalid diagnostic duration.');
    let failure: DiagnosticFailure | undefined;
    if (data.status === 'failure') {
      const source = fields(data.failure, ['domain', 'code', 'recovery', 'retryable']);
      if (typeof source.domain !== 'string' || !Object.hasOwn(reasons, source.domain))
        throw TypeError('Invalid diagnostic domain.');
      // Reconstruct policy; callers cannot forge retry advice or retain arbitrary code text.
      failure = describeDiagnosticFailure(source.domain as DiagnosticDomain, source.code);
    } else if (data.failure !== undefined)
      throw TypeError('Only failures carry diagnostic failure data.');
    if (this.#sequence === Number.MAX_SAFE_INTEGER)
      throw RangeError('Diagnostic sequence exhausted.');
    const event = Object.freeze({
      id: `operation-${++this.#sequence}`,
      operation: data.operation as DiagnosticOperation,
      status: data.status as DiagnosticStatus,
      ...(duration === undefined ? {} : { durationMs: Math.round(duration as number) }),
      ...(failure ? { failure } : {}),
    }) as DiagnosticEvent;
    if (this.#events.length === this.#capacity) {
      this.#events.shift();
      this.#dropped++;
    }
    this.#events.push(event);
    return event;
  }
  clear(): void {
    this.#events = [];
    this.#dropped = 0;
    // Do not reuse operation identifiers that a host may already have displayed.
  }
  createReport(context: DiagnosticEnvironment = {}): DiagnosticReport {
    const safeEnvironment = environment(context);
    const summary = new Map<
      DiagnosticOperation,
      {
        operation: DiagnosticOperation;
        success: number;
        failure: number;
        cancelled: number;
        timed: number;
        durationTotalMs: number;
        durationMaxMs: number;
      }
    >();
    for (const event of this.#events) {
      let aggregate = summary.get(event.operation);
      if (!aggregate) {
        aggregate = {
          operation: event.operation,
          success: 0,
          failure: 0,
          cancelled: 0,
          timed: 0,
          durationTotalMs: 0,
          durationMaxMs: 0,
        };
        summary.set(event.operation, aggregate);
      }
      aggregate[event.status]++;
      if (event.durationMs !== undefined) {
        aggregate.timed++;
        aggregate.durationTotalMs += event.durationMs;
        aggregate.durationMaxMs = Math.max(aggregate.durationMaxMs, event.durationMs);
      }
    }
    return Object.freeze({
      schemaVersion: 'banora.diagnostics/v1',
      environment: safeEnvironment,
      capacity: this.#capacity,
      dropped: this.#dropped,
      events: Object.freeze([...this.#events]),
      summary: Object.freeze([...summary.values()].map((value) => Object.freeze(value))),
    });
  }
}

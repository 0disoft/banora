import { diagnoseAutomation } from '@banora/sdk/automation';
import { DiagnosticJournal, describeDiagnosticFailure } from '@banora/sdk/diagnostics';
import type {
  DiagnosticDomain,
  DiagnosticEnvironment,
  DiagnosticReport,
} from '@banora/sdk/diagnostics';

export function diagnosticEnvironment(): DiagnosticEnvironment {
  const major = Number(process.versions.node.split('.')[0]);
  return {
    runtime: 'node',
    ...(Number.isInteger(major) && major >= 1 && major <= 999 ? { runtimeMajor: major } : {}),
    platform:
      process.platform === 'win32'
        ? 'windows'
        : process.platform === 'darwin'
          ? 'macos'
          : process.platform === 'linux'
            ? 'linux'
            : 'unknown',
  };
}
export interface CliDiagnosticResponse {
  readonly schemaVersion: 'banora.cli-diagnostics/v1';
  readonly ok: boolean;
  readonly diagnostics: DiagnosticReport;
  readonly operationIndex?: number;
  /** SDK execution only; excludes file reads and publication. */
  readonly durationMs?: number;
  readonly error?: { readonly code: 'usage' | 'input' | 'output' | 'limit' };
}
export function diagnose(request: unknown): CliDiagnosticResponse {
  const environment = diagnosticEnvironment();
  const start = performance.now();
  const result = diagnoseAutomation(request, environment);
  const elapsed = performance.now() - start;
  return {
    ...result,
    schemaVersion: 'banora.cli-diagnostics/v1',
    ...(Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= 86_400_000
      ? { durationMs: Math.round(elapsed) }
      : {}),
  };
}
/** CLI transport errors have no message/path or arbitrary error projection. */
export function diagnosticError(
  code: NonNullable<CliDiagnosticResponse['error']>['code'],
  domain: DiagnosticDomain = 'automation',
  reason: string = 'invalid-request',
  executed?: CliDiagnosticResponse,
): CliDiagnosticResponse {
  const journal = new DiagnosticJournal({ capacity: 256 });
  if (!executed)
    journal.record({
      operation: 'import',
      status: 'failure',
      failure: describeDiagnosticFailure(domain, reason),
    });
  return {
    ...(executed ?? {
      schemaVersion: 'banora.cli-diagnostics/v1',
      diagnostics: journal.createReport(diagnosticEnvironment()),
    }),
    ok: false,
    error: { code },
  };
}

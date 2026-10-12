import { studioControl } from './studio-control.js';

/** The CLI parenthesizes its callback; a formatter's final semicolon is a statement terminator. */
export function scenarioExpression(source: string): string {
  const callback = source.trimEnd().replace(/;$/, '');
  return `async (page) => { const studioControl = ${studioControl.toString()}; return (\n${callback}\n)(page, studioControl); }\n`;
}

/** Only an actual CLI Result can prove the complete scenario returned. */
export function requireScenarioResult(output: string, expected: string): void {
  const results = output.split(/^### /m).filter((section) => /^Result\r?\n/.test(section));
  let value: unknown;
  try {
    if (results.length === 1) value = JSON.parse(results[0]!.replace(/^Result\r?\n/, '').trim());
  } catch {
    /* Incomplete or malformed output cannot establish completion. */
  }
  if (value !== expected) throw new Error(`Scenario did not return ${expected}:\n${output}`);
}

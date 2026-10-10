import { expect, test } from 'bun:test';
import { requireScenarioResult, scenarioExpression } from './scenario-result.js';
import { runInNewContext } from 'node:vm';

const marker = 'banora-fixture-complete';
test('formatted callbacks execute through the CLI expression boundary without altering their bodies', async () => {
  for (const source of [
    `async page => { return page.value; }`,
    `// lint exception\nasync (page) => { const text = page.value + ';'; return text; };\n`,
    `async (page) => { return page.value; };\r\n\t`,
    `async (page) => { return page.value; } // final line comment`,
  ]) {
    const callback = runInNewContext('(' + scenarioExpression(source) + ')');
    expect(await callback({ value: marker })).toBe(
      source.includes("+ ';'") ? marker + ';' : marker,
    );
  }
  expect(() =>
    runInNewContext(
      '(' + scenarioExpression('async () => {}; throw Error("extra statement");') + ')',
    ),
  ).toThrow();
});
test('scenario completion requires the actual JSON Result, never echoed code or logs', () => {
  const echo = `### Ran Playwright code\nreturn '${marker}';\n`;
  expect(() => requireScenarioResult(echo, marker)).toThrow('did not return');
  expect(() => requireScenarioResult(`### Result\n"partial"\n${echo}`, marker)).toThrow(
    'did not return',
  );
  expect(() => requireScenarioResult(`### Console\n${marker}\n${echo}`, marker)).toThrow(
    'did not return',
  );
});
test('scenario results reject malformed, missing, ambiguous and non-string values', () => {
  for (const result of [
    '',
    'undefined',
    marker,
    JSON.stringify({ marker }),
    `"${marker}"\n### Result\n"${marker}"`,
  ]) {
    expect(() => requireScenarioResult(`### Result\n${result}`, marker)).toThrow('did not return');
  }
});
test('completed results work with LF/CRLF and subsequent CLI sections', () => {
  for (const newline of ['\n', '\r\n']) {
    const output = `### Result${newline}${JSON.stringify(marker)}${newline}### Ran Playwright code${newline}await run();${newline}`;
    expect(() => requireScenarioResult(output, marker)).not.toThrow();
  }
});

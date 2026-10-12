import { expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { RELEASE_PACKAGES, RELEASE_PACKAGE_NAMES } from './release-artifacts.js';

test('release units agree and SDK peers accept tested 0.1 updates without accepting a breaking minor', async () => {
  const sdk = JSON.parse(await readFile('packages/sdk/package.json', 'utf8'));
  const lock = Bun.JSONC.parse(await readFile('bun.lock', 'utf8')) as {
    workspaces: Record<string, { version: string; peerDependencies: Record<string, string> }>;
  };
  for (const key of RELEASE_PACKAGES) {
    const metadata = JSON.parse(await readFile(`packages/${key}/package.json`, 'utf8'));
    expect(metadata.name).toBe(RELEASE_PACKAGE_NAMES[key]);
    expect(metadata.version).toBe(sdk.version);
    const locked = lock.workspaces[`packages/${key}`]!;
    expect(locked.version).toBe(metadata.version);
    if (key === 'sdk') continue;
    const peer = metadata.peerDependencies['@0disoft/banora'];
    expect(locked.peerDependencies['@0disoft/banora']).toBe(peer);
    for (const version of ['0.1.0-dev.0', sdk.version, '0.1.1', '0.1.99'])
      expect(Bun.semver.satisfies(version, peer)).toBe(true);
    for (const version of ['0.0.0-stage', '0.2.0', '0.9.0', '1.0.0'])
      expect(Bun.semver.satisfies(version, peer)).toBe(false);
  }
});

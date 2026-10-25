export const browserSmokeScopes = Object.freeze([
  '--zoom-only',
  '--memory-only',
  '--viewer-disposal-only',
  '--performance-only',
  '--hover-only',
  '--ink-only',
  '--desktop-only',
  '--fullscreen-only',
  '--sizing-only',
  '--sound-only',
  '--workspace-only',
  '--tree-only',
  '--accessibility-only',
  '--support-only',
  '--search-only',
  '--preferences-only',
  '--recovery-only',
  '--locale-only',
  '--playback-only',
  '--controlled-only',
  '--analysis-only',
  '--puzzle-only',
  '--menu-only',
  '--scoring-only',
  '--rules-only',
  '--drop-only',
  '--animation-only',
  '--texture-only',
  '--share-only',
  '--touch-only',
  '--framework-only',
  '--comparison-only',
] as const);
type Browser = 'chrome' | 'msedge' | 'firefox' | 'webkit';
type Scope = (typeof browserSmokeScopes)[number];
const scopes = new Set<string>(browserSmokeScopes);

/** Validate before creating a server, browser session or artifact directory. */
export function parseBrowserOptions(args: readonly string[]): Readonly<{
  browser: Browser;
  engine: 'chromium' | 'firefox' | 'webkit';
  scope: Scope | undefined;
}> {
  let browser: Browser | undefined, scope: Scope | undefined;
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]!;
    if (argument === '--release-bundle') {
      // releaseInput retains ownership of duplicate/missing values and bundle verification.
      if (args[index + 1] && !args[index + 1]!.startsWith('--')) index++;
      continue;
    }
    if (argument.startsWith('--browser')) {
      const value = argument.slice('--browser='.length);
      if (
        browser !== undefined ||
        !argument.startsWith('--browser=') ||
        !['chrome', 'msedge', 'firefox', 'webkit'].includes(value)
      )
        throw Error('Use one --browser=chrome|msedge|firefox|webkit option.');
      browser = value as Browser;
    } else {
      if (!scopes.has(argument) || scope !== undefined)
        throw Error(
          'Use at most one supported browser smoke scope; unknown or duplicate options are rejected.',
        );
      scope = argument as Scope;
    }
  }
  browser ??= 'chrome';
  const engine = browser === 'firefox' || browser === 'webkit' ? browser : 'chromium';
  if (scope === '--zoom-only' && browser !== 'chrome')
    throw Error('Native zoom verification requires --browser=chrome.');
  if (
    (scope === '--performance-only' ||
      scope === '--memory-only' ||
      scope === '--viewer-disposal-only') &&
    engine !== 'chromium'
  )
    throw Error('Browser measurement requires a Chromium engine for CDP measurements.');
  return Object.freeze({ browser, engine, scope });
}

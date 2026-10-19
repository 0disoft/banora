// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const origin = new URL(page.url()).origin;
  await page.goto(`${origin}/studio/`);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('#language').selectOption('en');
  const verify = (ok, message) => {
    if (!ok) throw Error(message);
  };
  const width = () => page.locator('#board svg').getAttribute('data-board-width');
  const tab = (id) => page.locator(`[data-board-id="${id}"] [role="tab"]`);
  const close = (id) => page.locator(`[data-close-board="${id}"]`);
  const exportCurrent = async (name) => {
    const download = page.waitForEvent('download');
    await page.locator('#export').click();
    await (await download).saveAs(`output/playwright/${name}.sgf`);
  };
  verify((await width()) === '19', 'Default board is not 19 × 19');
  await page.locator('#file').setInputFiles({
    name: 'board-1.sgf',
    mimeType: 'application/x-go-sgf',
    buffer: Buffer.from('(;SZ[19]GN[])'),
  });
  await page.waitForFunction(
    () => document.querySelector('#status').textContent === 'Opened board-1.sgf.',
  );
  const emptyTitleFallback = (await tab(1).textContent()) === 'Board 1';
  await page.locator('#board svg').focus();
  await page.keyboard.press('Enter');
  await page.evaluate(() => {
    globalThis.workspaceStableTab = document.querySelector('#board-tab-1');
  });
  await page.locator('#comment').fill('First board note');
  await page.locator('#comment').blur();
  const retainedTab = await page.evaluate(
    () => globalThis.workspaceStableTab === document.querySelector('#board-tab-1'),
  );
  verify(
    emptyTitleFallback && retainedTab,
    `Workspace tabs: empty title fallback=${emptyTitleFallback}, retained after comment=${retainedTab}`,
  );
  await page.locator('#new-board-size').selectOption('13');
  await page.locator('#new').click();
  verify(
    (await width()) === '13' && (await page.locator('[role="tab"]').count()) === 2,
    '13-line tab not added',
  );
  verify(
    !(await page.locator('#unsaved').isVisible()),
    'Adding a tab asked to discard another board',
  );
  await page.locator('#board svg').focus();
  await page.keyboard.press('Enter');
  await page.locator('#comment').fill('Second board note');
  await page.locator('#comment').blur();
  await page.locator('#new-board-size').selectOption('9');
  await page.locator('#new').click();
  verify((await width()) === '9', '9-line tab not added');
  verify(
    await page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }),
    'Inactive dirty board was omitted from exit guard',
  );
  await tab(1).click();
  verify(
    (await width()) === '19' && (await page.locator('#move').textContent()) === 'Move 1',
    'First position lost',
  );
  verify((await page.locator('#comment').inputValue()) === 'First board note', 'First note lost');
  await page.locator('#undo').click();
  verify((await page.locator('#comment').inputValue()) === '', 'Per-board Undo lost');
  await page.locator('#redo').click();
  await tab(2).click();
  verify(
    (await page.locator('#comment').inputValue()) === 'Second board note',
    'Second note overwritten',
  );
  await exportCurrent('workspace-second');
  await page.locator('#file').setInputFiles({
    name: 'replay.sgf',
    mimeType: 'application/x-go-sgf',
    buffer: Buffer.from('(;SZ[13]GN[Replay <tag>];B[aa];W[bb])'),
  });
  await page.waitForFunction(
    () => document.querySelector('#game-name').textContent === 'Replay <tag>',
  );
  await page.evaluate(() => {
    globalThis.workspaceStableTab = document.querySelector('#board-tab-2');
  });
  await page.locator('#next').click();
  await page.locator('#previous').click();
  verify(
    await page.evaluate(
      () => globalThis.workspaceStableTab === document.querySelector('#board-tab-2'),
    ),
    'Move navigation rebuilt unchanged workspace tabs',
  );
  await page.getByRole('button', { name: 'Play record', exact: true }).click();
  await tab(3).click();
  await page.waitForTimeout(1100);
  verify((await page.locator('#move').textContent()) === 'Move 0', 'Playback advanced another tab');
  await tab(2).click();
  verify((await page.locator('#move').textContent()) === 'Move 0', 'Inactive playback continued');
  await close(1).click();
  await page.locator('#unsaved button[value="cancel"]').click();
  verify((await page.locator('[role="tab"]').count()) === 3, 'Cancelled close removed a tab');
  verify(
    (await page.locator('#comment').inputValue()) === 'First board note',
    'Cancelled close lost the note',
  );
  await close(1).click();
  const guarded = page.waitForEvent('download');
  await page.locator('#unsaved button[value="export"]').click();
  const downloaded = await guarded;
  verify(downloaded.suggestedFilename() === 'board-1.sgf', 'Export used another tab filename');
  await downloaded.saveAs('output/playwright/workspace-first.sgf');
  await page.waitForFunction(() => document.querySelectorAll('[role="tab"]').length === 2);
  await tab(2).focus();
  await page.keyboard.press('ArrowRight');
  verify(
    (await tab(3).getAttribute('aria-selected')) === 'true',
    'Arrow navigation did not activate next tab',
  );
  await page.keyboard.press('Home');
  verify((await tab(2).getAttribute('aria-selected')) === 'true', 'Home did not select first tab');
  for (const [locale, label] of [
    ['ko', '새 바둑판'],
    ['zh', '新建棋盘'],
    ['ja', '新しい碁盤'],
    ['en', 'New board'],
  ]) {
    await page.locator('#language').selectOption(locale);
    verify((await page.locator('#new').textContent()) === label, 'New-board translation missing');
    verify(
      (await tab(2).textContent()) === 'Replay <tag>',
      'Authored tab title translated or treated as HTML',
    );
  }
  for (const viewport of [
    { width: 320, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (let count = 0; count < 3; count++) await page.locator('#new').click();
    verify(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      'Tab strip overflowed narrow page',
    );
  }
  await page.screenshot({ path: 'output/playwright/workspace-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await tab(2).click();
  verify(
    await page
      .locator('.navigation')
      .evaluate((element) => element.getBoundingClientRect().bottom <= innerHeight),
    'Tabs pushed default playback dock out of view',
  );
  await page.screenshot({ path: 'output/playwright/workspace-desktop.png', fullPage: true });
  verify(errors.length === 0, errors.join('; '));
  return 'banora-workspace-complete';
};

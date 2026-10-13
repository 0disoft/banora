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
  const button = page.locator('#fullscreen');
  verify(await page.locator('.board-toolbar #fullscreen').isVisible(), 'Fullscreen icon is hidden');
  verify(
    await page.evaluate(() => document.fullscreenElement === null),
    'Fullscreen entered without a gesture',
  );
  await page.locator('#file').setInputFiles({
    name: 'fullscreen.sgf',
    mimeType: 'application/x-go-sgf',
    buffer: Buffer.from('(;SZ[19]XX[keep];B[dd]C[Fullscreen note];W[pp])'),
  });
  await page.locator('#next').click();
  await page.locator('#comment').fill('Fullscreen edited note');
  await page.locator('#comment').blur();
  await page.locator('#board-size').selectOption('custom');
  const before = await page
    .locator('.board-frame')
    .evaluate((element) => element.getBoundingClientRect().width);
  const exportRecord = async (name) => {
    const download = page.waitForEvent('download');
    await page.locator('#export').click();
    await (await download).saveAs(`output/playwright/${name}.sgf`);
  };
  await exportRecord('fullscreen-before');
  await button.click();
  await page.waitForFunction(() => document.fullscreenElement === document.documentElement);
  verify(
    (await button.getAttribute('aria-pressed')) === 'true',
    'Fullscreen button did not reflect native entry',
  );
  verify((await button.getAttribute('aria-label')) === 'Exit fullscreen', 'Exit label missing');
  verify(
    (await page.locator('.workspace-tabs').isVisible()) &&
      (await page.locator('.sidebar').isVisible()),
    'Fullscreen hid board controls',
  );
  await page.screenshot({ path: 'output/playwright/studio-fullscreen.png' });
  await button.click();
  await page.waitForFunction(() => document.fullscreenElement === null);
  verify(
    (await button.getAttribute('aria-pressed')) === 'false',
    'Fullscreen button did not reflect exit',
  );
  for (const [locale, enter, exit] of [
    ['ko', '전체 화면', '전체 화면 해제'],
    ['zh', '全屏', '退出全屏'],
    ['ja', '全画面表示', '全画面表示を解除'],
    ['en', 'Enter fullscreen', 'Exit fullscreen'],
  ]) {
    await page.locator('#language').selectOption(locale);
    verify((await button.getAttribute('aria-label')) === enter, 'Enter label not localized');
    await button.click();
    await page.waitForFunction(() => document.fullscreenElement === document.documentElement);
    verify((await button.getAttribute('aria-label')) === exit, 'Exit label not localized');
    // Native external exit must update the control without a second button click.
    await page.evaluate(() => document.exitFullscreen());
    await page.waitForFunction(
      () => document.querySelector('#fullscreen').getAttribute('aria-pressed') === 'false',
    );
  }
  await button.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.fullscreenElement === document.documentElement);
  // Browser UI Escape is not reproduced by renderer-only automation key injection.
  // Verify keyboard button exit and native external exit without replacing browser APIs.
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.fullscreenElement === null);
  verify(
    (await button.getAttribute('aria-pressed')) === 'false',
    'Keyboard exit left a stale fullscreen icon',
  );
  verify(
    (await page.locator('#board-size').inputValue()) === 'custom',
    'Fullscreen reset display sizing',
  );
  verify(
    (await page
      .locator('.board-frame')
      .evaluate((element) => element.getBoundingClientRect().width)) === before,
    'Fullscreen changed the custom width',
  );
  verify(
    (await page.locator('#move').textContent()) === 'Move 1' &&
      (await page.locator('#comment').inputValue()) === 'Fullscreen edited note' &&
      (await page.locator('#dirty').textContent()) === 'No changes',
    'Fullscreen changed record or selection',
  );
  await exportRecord('fullscreen-after');
  await page.setViewportSize({ width: 320, height: 900 });
  verify(await button.isVisible(), 'Fullscreen icon disappeared on a narrow screen');
  verify(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    'Fullscreen icon caused horizontal overflow',
  );
  verify(errors.length === 0, errors.join('; '));
  return 'banora-fullscreen-complete';
};

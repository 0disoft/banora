// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page, studioControl) => {
  const origin = new URL(page.url()).origin;
  const verify = (ok, message) => {
    if (!ok) throw Error(message);
  };
  const errors = [];
  const onError = (error) => errors.push(error.message);
  page.on('pageerror', onError);
  const input = (key) => page.locator(`#game-info-${key}`);
  const open = () => page.locator('#game-info-open').click();
  const source =
    '(;FF[4]GM[1]SZ[9]GN[Before]PB[Original]PW[Opponent]DT[legacy date]RE[legacy result]XX[preserve];B[aa]C[Original comment])(;SZ[9]GN[Other]PB[Other player]KM[7.5])';
  try {
    await page.goto(`${origin}/studio/`);
    await page.setViewportSize({ width: 1280, height: 920 });
    await page.locator('#language').selectOption('en');
    await page.locator('#file').setInputFiles({
      name: 'information.sgf',
      mimeType: 'application/x-go-sgf',
      buffer: Buffer.from(source),
    });
    await page.waitForFunction(() => document.querySelector('#game-name').textContent === 'Before');
    await open();
    verify((await input('komi').inputValue()) === '', 'Opening inserted missing komi');
    await page.locator('#game-info-save').click();
    verify((await page.locator('#dirty').innerText()) === 'No changes', 'No-op changed history');
    await open();
    await input('gameName').fill('Edited <tag>');
    await page.locator('#game-info-save').click();
    await open();
    verify(
      (await input('date').inputValue()) === 'legacy date' &&
        (await input('result').inputValue()) === 'legacy result',
      'Unchanged legacy values were repaired',
    );
    await input('date').fill('2026-02-29');
    await page.locator('#game-info-save').click();
    verify(
      (await page.locator('#game-info-dialog').isVisible()) &&
        (await page.locator('#game-info-status').innerText()).includes('Check'),
      'Invalid date was accepted',
    );
    await input('date').fill('2024-02-29');
    await input('blackPlayer').fill('Black <tag>');
    await input('whitePlayer').fill('White 日本');
    await input('komi').fill('6.5');
    await input('result').fill('B+R');
    await page.locator('#game-info-save').click();
    await studioControl(page, '#undo', 'record', () => page.locator('#undo').click());
    await open();
    verify(
      (await input('blackPlayer').inputValue()) === 'Original' &&
        (await input('komi').inputValue()) === '' &&
        (await input('date').inputValue()) === 'legacy date',
      'One Undo did not restore the complete patch',
    );
    await page.locator('#game-info-cancel').click();
    await studioControl(page, '#redo', 'record', () => page.locator('#redo').click());
    const saved = page.waitForEvent('download');
    await page.locator('#export').click();
    const file = await saved;
    await file.saveAs('output/playwright/game-info.sgf');
    await page.locator('#file').setInputFiles(await file.path());
    await page.waitForFunction(
      () => document.querySelector('#game-name').textContent === 'Edited <tag>',
    );
    await open();
    verify(
      (await input('date').inputValue()) === '2024-02-29' &&
        (await input('result').inputValue()) === 'B+R',
      'Export/reopen lost metadata',
    );
    for (const locale of ['zh', 'hi', 'es', 'fr', 'ru', 'id', 'ja', 'vi', 'ko', 'th', 'ms', 'en']) {
      // A host may change language while the modal is open; authored input stays literal.
      await page.locator('#language').selectOption(locale, { force: true });
      verify(
        (await input('blackPlayer').inputValue()) === 'Black <tag>',
        'Language switch translated authored data',
      );
      if (locale !== 'en')
        verify(
          (await page.locator('#game-info-title').innerText()) !== 'Game information',
          `Missing ${locale} translation`,
        );
    }
    await input('gameName').fill('Cancelled');
    await page.keyboard.press('Escape');
    verify(
      (await page.locator('#game-name').innerText()) === 'Edited <tag>',
      'Escape committed an edit',
    );
    await open();
    await input('gameName').fill('Wrong game');
    await page.evaluate(() => {
      const games = document.querySelector('#games');
      games.value = '1';
      games.dispatchEvent(new Event('change'));
    });
    verify(
      !(await page.locator('#game-info-dialog').isVisible()),
      'Changing games retained stale form',
    );
    await page
      .locator('#game-info-form')
      .evaluate((form) => form.dispatchEvent(new Event('submit', { cancelable: true })));
    verify(
      (await page.locator('#game-name').innerText()) === 'Other',
      'Late submission edited another game',
    );
    await open();
    await input('gameName').fill('Wrong tab');
    // Exercise native close followed by a tab switch before the queued close event.
    await page.evaluate(() => {
      document.querySelector('#game-info-dialog').close();
      document.querySelector('#new').click();
    });
    verify(
      !(await page.locator('#game-info-dialog').isVisible()),
      'Changing tabs retained stale form',
    );
    await page
      .locator('#game-info-form')
      .evaluate((form) => form.dispatchEvent(new Event('submit', { cancelable: true })));
    await open();
    verify((await input('gameName').inputValue()) === '', 'Stale form wrote into a new tab');
    await page.setViewportSize({ width: 390, height: 780 });
    await page.locator('#language').selectOption('ko', { force: true });
    verify(
      await page.evaluate(
        () =>
          document.querySelector('#game-info-dialog').getBoundingClientRect().width <= innerWidth,
      ),
      'Narrow metadata form overflowed',
    );
    await page.screenshot({ path: 'output/playwright/game-info-mobile.png' });
    await page.keyboard.press('Escape');
    verify(!errors.length, errors.join('\n'));
    return 'banora-game-info-complete';
  } finally {
    page.off('pageerror', onError);
  }
};

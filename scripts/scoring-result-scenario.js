// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page, studioControl) => {
  const origin = new URL(page.url()).origin;
  const verify = (ok, message) => {
    if (!ok) throw Error(message);
  };
  const errors = [];
  const onError = (error) => errors.push(error.message);
  page.on('pageerror', onError);
  const source =
    '(;FF[4]GM[1]CA[UTF-8]SZ[3]GN[Scoring result]KM[6.5]RE[W+R]XX[preserve-result]AB[aa][ba][bb][bc]AW[ab][ac];B[];W[])(;CA[UTF-8]SZ[3]GN[Second game]RE[B+R])';
  const action = (selector) =>
    studioControl(page, selector, 'scoring', () => page.locator(selector).click());
  const result = async () => {
    await page.locator('#game-info-open').click();
    const value = await page.locator('#game-info-result').inputValue();
    verify(
      (await page.locator('#game-info-komi').inputValue()) === '6.5',
      'Scoring changed stored komi',
    );
    await page.locator('#game-info-cancel').click();
    return value;
  };
  const download = async (name) => {
    const saved = page.waitForEvent('download');
    await page.locator('#export').click();
    await (await saved).saveAs(`output/playwright/${name}.sgf`);
  };
  try {
    await page.goto(`${origin}/studio/`);
    await page.setViewportSize({ width: 1280, height: 920 });
    await page.locator('#language').selectOption('en');
    await page.locator('#file').setInputFiles({
      name: 'score-result.sgf',
      mimeType: 'application/x-go-sgf',
      buffer: Buffer.from(source),
    });
    await page.waitForFunction(
      () => document.querySelector('#game-name').textContent === 'Scoring result',
    );
    await page.locator('#last').click();
    await download('scoring-result-before');
    await action('#score-open');
    verify(
      (await page.locator('#dirty').innerText()) === 'No changes',
      'Opening scoring edited the record',
    );
    await action('#score-save');
    verify(
      (await page.locator('#score-result-previous').innerText()) === 'W+R' &&
        (await page.locator('#score-result-new').innerText()) === 'W+3.5',
      'Confirmation did not show old and new RE',
    );
    await page.locator('#score-save-cancel').click();
    verify(
      (await result()) === 'W+R' && (await page.locator('#dirty').innerText()) === 'No changes',
      'Cancel saved a scoring result',
    );
    await action('#score-save');
    await page.locator('#score-save-confirm').click();
    verify((await result()) === 'W+3.5', 'Confirmation did not save RE');
    await studioControl(page, '#undo', 'record', () => page.locator('#undo').click());
    verify(
      (await result()) === 'W+R' && (await page.locator('#dirty').innerText()) === 'No changes',
      'One Undo did not restore previous RE and baseline',
    );
    await studioControl(page, '#redo', 'record', () => page.locator('#redo').click());
    verify((await result()) === 'W+3.5', 'Redo did not restore saved RE');
    await download('scoring-result-after');
    await action('#score-save');
    await page.evaluate(() => {
      const value = document.querySelector('#score-komi');
      value.value = '3';
      value.dispatchEvent(new Event('input'));
    });
    verify(
      !(await page.locator('#score-save-dialog').isVisible()),
      'Changed scoring options retained approval',
    );
    await page.locator('#score-save-confirm').evaluate((button) => button.click());
    verify((await result()) === 'W+3.5', 'Late confirmation saved a changed preview');
    await action('#score-save');
    verify(
      (await page.locator('#score-result-new').innerText()) === '0',
      'Draw was not encoded as RE[0]',
    );
    await page.locator('#score-save-confirm').click();
    verify((await result()) === '0', 'Draw result did not persist');
    await studioControl(page, '#undo', 'record', () => page.locator('#undo').click());
    await action('#score-save');
    await page.evaluate(() => {
      const games = document.querySelector('#games');
      games.value = '1';
      games.dispatchEvent(new Event('change'));
    });
    verify(
      !(await page.locator('#score-save-dialog').isVisible()),
      'Changing games retained scoring approval',
    );
    await page.locator('#score-save-confirm').evaluate((button) => button.click());
    await page.locator('#game-info-open').click();
    verify(
      (await page.locator('#game-info-result').inputValue()) === 'B+R',
      'Late confirmation overwrote another game',
    );
    await page.locator('#game-info-cancel').click();
    await action('#score-save');
    await page.evaluate(() => {
      document.querySelector('#score-save-dialog').close();
      document.querySelector('#new').click();
    });
    await page.locator('#score-save-confirm').evaluate((button) => button.click());
    await page.locator('#game-info-open').click();
    verify(
      (await page.locator('#game-info-result').inputValue()) === '',
      'Late confirmation wrote into a new tab',
    );
    await page.locator('#game-info-cancel').click();
    await action('#score-open');
    await action('#score-save');
    for (const locale of ['zh', 'hi', 'es', 'fr', 'ru', 'id', 'ja', 'vi', 'ko', 'th', 'ms', 'en']) {
      await page.locator('#language').selectOption(locale, { force: true });
      if (locale !== 'en')
        verify(
          (await page.locator('#score-save-confirm').innerText()) !== 'Confirm result',
          `Missing ${locale} scoring translation`,
        );
      verify(
        (await page.locator('#score-result-new').innerText()) === '0',
        'Locale changed SGF result notation',
      );
    }
    await page.setViewportSize({ width: 390, height: 780 });
    await page.locator('#language').selectOption('ko', { force: true });
    await page.screenshot({ path: 'output/playwright/scoring-result-mobile.png' });
    await page.keyboard.press('Escape');
    verify(
      !(await page.locator('#score-save-dialog').isVisible()),
      'Escape did not cancel scoring confirmation',
    );
    await page.locator('#language').selectOption('en');
    // A queued close from a previous confirmation must not clear a newly opened approval.
    await action('#score-save');
    await page.evaluate(() => {
      document.querySelector('#score-save-cancel').click();
      document.querySelector('#score-save').click();
    });
    await page.locator('#score-save-confirm').click();
    await page.locator('#game-info-open').click();
    verify(
      (await page.locator('#game-info-result').inputValue()) === '0',
      'Queued close revoked a newer valid approval',
    );
    await page.locator('#game-info-cancel').click();
    await action('#score-save');
    await page.locator('#language').selectOption('ko', { force: true });
    verify(
      (await page.locator('#score-result-previous').innerText()) === '0',
      'A previous missing-value placeholder replaced the authored RE on locale change',
    );
    await page.locator('#score-save-cancel').click();
    await page.locator('#language').selectOption('en');
    await download('scoring-result-new-tab');
    await page.goto(`${origin}/viewer/`);
    verify(
      (await page.locator('#score-save').count()) === 0,
      'Default scoring consumer unexpectedly permits record edits',
    );
    verify(!errors.length, errors.join('\n'));
    return 'banora-scoring-result-complete';
  } finally {
    page.off('pageerror', onError);
  }
};

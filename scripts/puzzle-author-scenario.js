// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const origin = new URL(page.url()).origin;
  const source =
    '(;FF[4]GM[1]SZ[5]GN[Correct]C[Wrong move]XX[preserve];B[aa]C[First];W[bb](;B[cc]TE[1]C[Correct])(;B[dd]BM[1]C[Incorrect]))(;SZ[5]GN[Private other game])';
  const errors = [];
  const onError = (error) => errors.push(error.message);
  page.on('pageerror', onError);
  const verify = (value, message) => {
    if (!value) throw Error(message);
  };
  const dialog = page.locator('#puzzle-author-dialog');
  const field = (name) => page.locator(`#puzzle-author-${name}`);
  const open = async (button = '#board-menu') => {
    await page.locator(button).click();
    await page.locator('[data-board-menu-section="puzzle-author"]').click();
    await dialog.waitFor({ state: 'visible' });
  };
  const select = async (name) => field('tree').selectOption(name);
  const play = async (x, y) => {
    const svg = page.locator('#puzzle-author-board svg');
    const box = await svg.boundingBox();
    const view = (await svg.getAttribute('viewBox')).split(' ').map(Number);
    await page.mouse.click(
      box.x + ((x + 1.25 - view[0]) * box.width) / view[2],
      box.y + ((y + 1.25 - view[1]) * box.height) / view[3],
    );
  };
  try {
    await page.goto(`${origin}/studio/`);
    await page.setViewportSize({ width: 1280, height: 1040 });
    await page.locator('#language').selectOption('en');
    await page.locator('#file').setInputFiles({
      name: 'author.sgf',
      mimeType: 'application/x-go-sgf',
      buffer: Buffer.from(source),
    });
    await page.waitForFunction(
      () => document.querySelector('#game-name').textContent === 'Correct',
    );
    await page.locator('#comment').fill('Dirty source');
    await page.locator('#comment').blur();
    verify(
      (await page.locator('#dirty').innerText()) === 'Unsaved changes',
      'Fixture did not remain dirty',
    );
    await open();
    verify((await field('name').inputValue()) === 'Correct', 'Authored title was not copied');
    await field('question').fill('Wrong move');
    await field('id').fill('studio-authored');
    await field('test').click();
    verify(
      (await field('status').innerText()).includes('Mark each ending'),
      'TE/BM or leaf order was inferred as a grade',
    );
    await select('answer-3');
    await field('outcome').selectOption('correct');
    await select('answer-4');
    await field('outcome').selectOption('incorrect');
    await field('test').click();
    verify(
      (await field('status').innerText()).includes('Choose an automatic reply'),
      'A sole opponent response was inferred',
    );
    await select('answer-1');
    await field('reply').selectOption('answer-2');
    await select('root');
    await field('hint').fill('Authored hint 日本語');
    await field('test').click();
    verify(
      await page.locator('#puzzle-author-board .banora-puzzle').isVisible(),
      'Playable preview did not mount',
    );
    await page.locator('#puzzle-author-board [data-puzzle-hint]').click();
    verify(
      (await page.locator('#puzzle-author-board [data-puzzle-hints]').innerText()).includes(
        'Authored hint 日本語',
      ),
      'Authored hint was not available',
    );
    await play(0, 0);
    verify(
      (await page.locator('#puzzle-author-board [data-stone]').count()) === 2,
      'Explicit automatic reply did not play',
    );
    for (const locale of ['en', 'ko', 'zh', 'ja', 'hi', 'es', 'fr', 'ru', 'id', 'vi', 'th', 'ms']) {
      await page.evaluate((locale) => {
        const control = document.querySelector('#language');
        control.value = locale;
        control.dispatchEvent(new Event('change', { bubbles: true }));
      }, locale);
      verify(
        (await field('name').inputValue()) === 'Correct' &&
          (await field('question').inputValue()) === 'Wrong move',
        `Authored metadata translated in ${locale}`,
      );
      verify(
        (await page.locator('#puzzle-author-board [data-stone]').count()) === 2,
        `Locale reset preview in ${locale}`,
      );
      if (locale !== 'en')
        verify(
          (await page.locator('#puzzle-author-title').innerText()) !== 'Create puzzle',
          `Untranslated authoring title in ${locale}`,
        );
      verify(
        (await page.locator('#puzzle-author-board [data-puzzle-title]').innerText()) ===
          'Correct' &&
          (await page.locator('#puzzle-author-board [data-puzzle-prompt]').innerText()) ===
            'Wrong move',
        `Authored trial text translated in ${locale}`,
      );
    }
    await page.evaluate(() => {
      const control = document.querySelector('#language');
      control.value = 'en';
      control.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await play(2, 2);
    verify(
      (await page
        .locator('#puzzle-author-board .banora-puzzle')
        .getAttribute('data-puzzle-status')) === 'correct',
      'Correct trial did not finish',
    );
    verify(
      (await page.locator('#puzzle-author-board [data-puzzle-feedback]').innerText()) === 'Correct',
      'Authored feedback was translated',
    );
    await page.screenshot({ path: 'output/playwright/puzzle-author-desktop.png' });
    await page.locator('#puzzle-author-board [data-puzzle-restart]').click();
    await play(0, 0);
    await play(3, 3);
    verify(
      (await page
        .locator('#puzzle-author-board .banora-puzzle')
        .getAttribute('data-puzzle-status')) === 'incorrect',
      'Incorrect trial did not finish',
    );
    const pending = page.waitForEvent('download');
    await field('download').click();
    const download = await pending;
    verify(
      download.suggestedFilename() === 'studio-authored.puzzle.json',
      'Puzzle filename is unsafe or unexpected',
    );
    await download.saveAs('output/playwright/studio-authored.puzzle.json');
    verify(
      (await page.locator('#dirty').innerText()) === 'Unsaved changes',
      'Puzzle export acknowledged the SGF baseline',
    );
    await field('close').click();
    verify(
      await page.locator('#board-menu').evaluate((button) => document.activeElement === button),
      'Modal did not return menu focus',
    );
    const saved = page.waitForEvent('download');
    await page.locator('#export').click();
    await (await saved).saveAs('output/playwright/puzzle-author-source.sgf');
    await open('#app-menu');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      const control = document.querySelector('#language');
      control.value = 'ko';
      control.dispatchEvent(new Event('change', { bubbles: true }));
    });
    verify(
      await dialog.evaluate(
        (element) =>
          element.scrollWidth <= element.clientWidth + 1 &&
          element.getBoundingClientRect().width <= innerWidth,
      ),
      'Mobile dialog overflowed horizontally',
    );
    await page.screenshot({ path: 'output/playwright/puzzle-author-ko-mobile.png' });
    await page.keyboard.press('Escape');
    verify(!(await dialog.isVisible()), 'Escape did not close authoring');
    await page.setViewportSize({ width: 1280, height: 1040 });
    await page.locator('#language').selectOption('en');
    await open();
    await page.evaluate(() => {
      const form = document.querySelector('#puzzle-author-dialog form');
      const comment = document.querySelector('#comment');
      comment.value = 'New source';
      comment.dispatchEvent(new Event('input', { bubbles: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    verify(
      !(await dialog.isVisible()) && (await field('tree').locator('option').count()) === 0,
      'Changed source retained a stale authoring draft',
    );
    // Native close/reopen can queue an older close event. It must not clear the new draft.
    await page.evaluate(() => {
      const open = document.querySelector('#puzzle-author-open'),
        dialog = document.querySelector('#puzzle-author-dialog');
      open.click();
      dialog.close();
      open.click();
    });
    await page.waitForTimeout(30);
    verify(
      (await dialog.isVisible()) && (await field('tree').locator('option').count()) === 5,
      'An old native close event cleared a reopened draft',
    );
    await field('close').click();
    // A session/tab replacement must also revoke the draft and its owned board.
    await open();
    await page.evaluate(() => {
      const games = document.querySelector('#games');
      games.value = '1';
      games.dispatchEvent(new Event('change'));
    });
    verify(
      !(await dialog.isVisible()) && (await field('tree').locator('option').count()) === 0,
      'Session replacement retained authoring state',
    );
    await open();
    await page.evaluate(() => {
      document.querySelector('#puzzle-author-dialog').close();
      document.querySelector('#new').click();
    });
    await field('download').evaluate((button) =>
      button.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })),
    );
    await open();
    verify(
      (await field('name').inputValue()) === '' &&
        (await field('tree').locator('option').count()) === 1,
      'Late submission or tab replacement reused the old draft',
    );
    await field('close').click();
    verify(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
    return 'banora-puzzle-author-complete';
  } finally {
    page.off('pageerror', onError);
  }
};

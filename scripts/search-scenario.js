// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (rootPage, studioControl) => {
  const origin = new URL(rootPage.url()).origin;
  const context = await rootPage.context().browser().newContext({ locale: 'en-US' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const open = async () => {
    await studioControl(page, '#search-open', 'search', () => page.locator('#search-open').click());
    await page.locator('#search-dialog').waitFor({ state: 'visible' });
  };
  const close = async () => page.locator('#search-close').click();
  const query = async (value) => {
    await page.locator('#search-query').fill(value);
    await page.locator('#search-form button[type="submit"]').click();
  };
  const upload = async (sgf, expectedTitle) => {
    await page.locator('#file').setInputFiles({
      name: 'search.sgf',
      mimeType: 'application/x-go-sgf',
      buffer: Buffer.from(sgf),
    });
    // Selecting a file does not await Studio's asynchronous read and import.
    await page.waitForFunction(
      (title) => document.getElementById('game-name')?.textContent === title,
      expectedTitle,
    );
  };
  try {
    await page.goto(`${origin}/studio/`);
    await upload(
      `(;SZ[5]GN[Authored <tag>]XX[keep];B[aa]C[needle original](;W[bb]C[needle second])(;W[cc]C[needle branch]))(;SZ[9]${';B[];W[]'.repeat(300)};C[needle late]MN[700])`,
      'Authored <tag>',
    );
    await open();
    await page.locator('#search-field').selectOption('comments');
    await query('needle');
    check((await page.locator('.search-result').count()) === 4, 'Search omitted a game/branch');
    check(
      (await page.locator('#dirty').textContent()) === 'No changes',
      'Search edited the record',
    );
    check((await page.locator('tag').count()) === 0, 'Authored title became markup');
    await page.locator('#search-limit').selectOption('1');
    for (let index = 0; index < 4; index++) {
      await page.locator('#search-select-page').click();
      if (index < 3) await page.locator('#search-next').click();
    }
    check(
      (await page.locator('#search-selected').textContent()) === '4 / 256',
      'Selections did not survive paging',
    );
    check(
      (await page.locator('.search-result label').textContent()).includes('Move 700'),
      'Search lost MN or long-record move count',
    );
    await page.locator('.search-result button').click();
    check(
      !(await page.locator('#search-dialog').isVisible()) &&
        (await page.locator('#move').textContent()) === 'Move 700',
      'Long search target did not navigate',
    );
    check(
      await page
        .locator('#board svg[role="application"]')
        .evaluate((element) => document.activeElement === element),
      'Search navigation lost board focus',
    );
    await open();
    await page.locator('#search-comment').fill('Edited <img> 한국어');
    await page.locator('#search-preview').click();
    check(
      (await page.locator('.search-change').count()) === 4 &&
        !(await page.locator('#search-apply').isDisabled()),
      'Preview missed selected pages',
    );
    check(
      (await page.locator('#dirty').textContent()) === 'No changes' &&
        (await page.locator('#comment').inputValue()) === 'needle late',
      'Preview changed source',
    );
    check(
      (await page.locator('#search-diff img').count()) === 0,
      'Preview interpreted authored text',
    );
    await page.locator('#search-cancel').click();
    check(
      (await page.locator('#search-apply').isDisabled()) &&
        (await page.locator('#search-comment').inputValue()) === 'Edited <img> 한국어',
      'Cancel discarded typed text or retained Apply',
    );
    await close();
    await page.locator('#comment').fill('needle intervening');
    await page.locator('#comment').blur();
    await open();
    await page.locator('#search-preview').click();
    await page.keyboard.press('Control+z');
    check(
      (await page.locator('#search-apply').isDisabled()) &&
        (await page.locator('#search-status').textContent()) === 'Record changed. Preview again.',
      'Changed source did not invalidate preview',
    );
    check(
      (await page.locator('#search-comment').inputValue()) === 'Edited <img> 한국어',
      'Stale preview discarded typed text',
    );
    await page.locator('#search-preview').click();
    await page.locator('#search-apply').click();
    check(
      (await page.locator('#search-status').textContent()) === 'Comments updated.' &&
        (await page.locator('#search-apply').isDisabled()),
      'Apply remained repeatable or failed',
    );
    check(
      (await page.locator('#move').textContent()) === 'Move 700' &&
        (await page.locator('#comment').inputValue()) === 'Edited <img> 한국어',
      'Batch changed selected position',
    );
    check(
      (await page.locator('#search-count').textContent()) === '0–0 / 0',
      'Empty results retained an invalid page range',
    );
    await close();
    await page.locator('#undo').click();
    check(
      (await page.locator('#dirty').textContent()) === 'No changes' &&
        (await page.locator('#comment').inputValue()) === 'needle late',
      'Batch was not one Undo unit',
    );
    await page.locator('#redo').click();
    const downloaded = page.waitForEvent('download');
    await page.locator('#export').click();
    await (await downloaded).saveAs('output/playwright/search-edited.sgf');
    await open();
    await page.locator('#search-limit').selectOption('20');
    await query('Edited');
    check(
      (await page.locator('.search-result').count()) === 4,
      'Redo did not restore every batch comment',
    );
    await page.locator('#search-select-page').click();
    await page.locator('#search-comment').fill('');
    await page.locator('#search-preview').click();
    await page.locator('#search-apply').click();
    check(
      (await page.locator('#search-results').textContent()) === 'No results',
      'Cleared comments remained in results',
    );
    await close();
    await page.locator('#undo').click();
    check(
      (await page.locator('#dirty').textContent()) === 'No changes',
      'Undo clear did not restore exported baseline',
    );
    await open();
    await query('missing');
    check(
      (await page.locator('#search-results').textContent()) === 'No results' &&
        (await page.locator('#search-select-page').isDisabled()),
      'Empty state not actionable',
    );
    await query('Edited');
    await page.locator('#search-select-page').click();
    const staleButton = await page.locator('.search-result button').first().elementHandle();
    const staleCheckbox = await page.locator('.search-result input').first().elementHandle();
    await close();
    await upload(`(;SZ[5]GN[Cap review]${';C[cap]'.repeat(300)})`, 'Cap review');
    check(
      await staleButton.evaluate((element) => !element.isConnected),
      'Import did not discard the old search result',
    );
    await staleButton.evaluate((element) => element.click());
    await staleCheckbox.evaluate((element) => {
      element.checked = true;
      element.dispatchEvent(new Event('change'));
    });
    check(
      (await page.locator('#comment').inputValue()) === '' &&
        (await page.locator('#move').textContent()) === 'Move 0',
      'A stale result navigated the newly imported record',
    );
    await open();
    check(
      (await page.locator('#search-selected').textContent()) === '0 / 256',
      'Import retained selection from another record',
    );
    await query('cap');
    await page.locator('#search-limit').selectOption('50');
    for (let index = 0; index < 6; index++) {
      await page.locator('#search-select-page').click();
      if (index < 5) await page.locator('#search-next').click();
    }
    check(
      (await page.locator('#search-selected').textContent()) === '256 / 256' &&
        (await page.locator('#search-select-page').isDisabled()),
      'Selection cap failed',
    );
    check(
      (await page.locator('#search-results input:disabled').count()) === 44,
      'Unselected rows allowed cap overflow',
    );
    await page.locator('#search-comment').fill('x'.repeat(5000));
    await page.locator('#search-preview').click();
    check(
      (await page.locator('#search-status').textContent()) ===
        'Select fewer positions or shorten the comment.' &&
        (await page.locator('#search-apply').isDisabled()),
      'Over-limit batch not rejected',
    );
    check(
      (await page.locator('#search-comment').inputValue()).length === 5000 &&
        (await page.locator('#dirty').textContent()) === 'No changes',
      'Failed preview lost input or changed source',
    );
    await page.locator('#search-clear').click();
    await page.locator('#search-results input:not(:disabled)').first().check();
    await page.locator('#search-comment').fill('Before');
    for (const [locale, previewLabel] of [
      ['en', 'Preview changes'],
      ['ko', '변경 내용 미리보기'],
      ['zh', '预览修改'],
      ['ja', '変更をプレビュー'],
    ]) {
      await close();
      await page.locator('#language').selectOption(locale);
      await open();
      await page.locator('#search-preview').click();
      check(
        (await page.locator('#search-preview').textContent()) === previewLabel &&
          (await page.locator('.search-change pre').last().textContent()) === 'Before',
        'Translation changed authored preview',
      );
      await page.setViewportSize({ width: locale === 'en' ? 1440 : 320, height: 900 });
      check(
        await page.locator('#search-dialog').evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.left >= 11 &&
            rect.right <= innerWidth - 11 &&
            element.scrollWidth <= element.clientWidth + 1
          );
        }),
        'Search modal overflow',
      );
    }
    await page.screenshot({ path: 'output/playwright/search-mobile.png' });
    await page.keyboard.press('Escape');
    check(
      !(await page.locator('#search-dialog').isVisible()) &&
        (await page.locator('#search-apply').isDisabled()),
      'Escape retained an applicable preview',
    );
    await page.locator('#language').selectOption('en');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('#board-menu').click();
    await page.locator('[data-board-menu-section="search"]').click();
    await close();
    if (
      await page
        .locator('#board-menu-panel')
        .evaluate((element) => element.matches(':popover-open'))
    )
      await page.locator('#board-menu-panel [data-close]').click();
    check(
      (await page.locator('.file-toolbar #search-open').count()) === 1,
      'Search menu controls were not restored',
    );
    await open();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.screenshot({ path: 'output/playwright/search-desktop.png' });
    await close();
    check(errors.length === 0, `Search page errors: ${errors.join('; ')}`);
    return 'banora-search-complete';
  } finally {
    await context.close();
  }
};

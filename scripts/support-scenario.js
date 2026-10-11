// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (rootPage) => {
  const origin = new URL(rootPage.url()).origin;
  const context = await rootPage.context().browser().newContext({ locale: 'en-US' });
  const page = await context.newPage();
  const errors = [],
    remote = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin)
      remote.push(request.url());
  });
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const open = async () => {
    await page.locator('#support-open').click();
    await page.locator('#support-dialog').waitFor({ state: 'visible' });
  };
  const close = async () => page.locator('#support-close').click();
  const report = async () => JSON.parse(await page.locator('#diagnostic-json').textContent());
  const upload = (sgf) =>
    page.locator('#file').setInputFiles({
      name: 'PrivateFilename.sgf',
      mimeType: 'application/x-go-sgf',
      buffer: Buffer.from(sgf),
    });
  try {
    await page.goto(`${origin}/studio/`);
    await upload('(;SZ[5]GN[Success]PB[PrivateIdentity]C[PrivateComment];B[aa]C[PrivateComment])');
    await open();
    await page.locator('#diagnostic-panel summary').first().click();
    check(!(await page.locator('#diagnostic-enabled').isChecked()), 'Diagnostics defaulted on');
    check(
      (await report()).events.length === 0 &&
        (await page.locator('#diagnostic-download').isDisabled()),
      'Disabled collection retained history/download',
    );
    await page.locator('#support-query').fill('Search record');
    check((await page.locator('#support-actions button').count()) === 1, 'Action discovery failed');
    await page.locator('#support-actions button').click();
    await page.locator('#search-dialog').waitFor({ state: 'visible' });
    check(!(await page.locator('#support-dialog').isVisible()), 'Help did not close before search');
    await page.locator('#search-query').fill('Private');
    await page.locator('#search-form button').click();
    await page.locator('#search-close').click();
    await open();
    await page.locator('#diagnostic-enabled').check();
    await close();
    await page.locator('#next').click();
    await upload('(;SZ[5];B[PrivateInvalidPoint])');
    await page.locator('#comment').fill('PrivateEditedComment');
    await page.locator('#comment').blur();
    await page.locator('#search-open').click();
    await page.locator('#search-query').fill('Private');
    await page.locator('#search-form button').click();
    await page.locator('#search-select-page').click();
    await page.locator('#search-comment').fill('PrivateBatchComment');
    await page.locator('#search-preview').click();
    await page.locator('#search-close').click();
    const dirty = await page.locator('#dirty').textContent();
    await open();
    const before = await report();
    check(
      before.events.some((e) => e.operation === 'navigate' && e.status === 'success'),
      'Navigation evidence missing',
    );
    check(
      before.events.some((e) => e.operation === 'import' && e.failure?.code === 'property'),
      'Actual import failure missing',
    );
    check(
      before.events.some((e) => e.operation === 'edit') &&
        before.events.some((e) => e.operation === 'batch') &&
        before.events.some((e) => e.operation === 'search'),
      'Edit/search/batch evidence missing',
    );
    check(
      !JSON.stringify(before).includes('Private'),
      'Diagnostic report leaked authored/query/file content',
    );
    check(
      (await page.locator('#diagnostic-events').textContent()).includes('Check the input.'),
      'Failure recovery guidance missing',
    );
    const download = page.waitForEvent('download');
    await page.locator('#diagnostic-download').click();
    await (await download).saveAs('output/playwright/support-diagnostics.json');
    await page.evaluate(() => {
      window.restoreDiagnosticUrl = URL.createObjectURL;
      URL.createObjectURL = () => {
        throw Error('PrivateUrlFailure');
      };
    });
    await page.locator('#diagnostic-download').click();
    check(
      (await page.locator('#diagnostic-status').textContent()) ===
        'Could not download diagnostics.',
      'Download failure leaked raw exception or offered false success',
    );
    await page.evaluate(() => {
      URL.createObjectURL = window.restoreDiagnosticUrl;
      delete window.restoreDiagnosticUrl;
    });
    check(
      (await page.locator('#dirty').textContent()) === dirty,
      'Diagnostic download acknowledged SGF export',
    );
    await page.locator('#support-query').fill('Settings');
    await page
      .locator('#support-actions')
      .getByRole('button', { name: 'Settings', exact: true })
      .click();
    check(
      await page.locator('#board-menu-panel #settings-reset').isVisible(),
      'Settings action did not open its menu',
    );
    await page.locator('#board-menu-panel [data-close]').click();
    for (const [name, section] of [
      ['Tool', 'tools'],
      ['View', 'view'],
      ['Touch placement', 'touch'],
      ['Animation', 'animation'],
      ['Stone textures', 'textures'],
      ['Compare positions', 'comparison'],
      ['Share', 'share'],
      ['Score position', 'scoring'],
    ]) {
      await open();
      await page.locator('#support-query').fill(name);
      await page.locator('#support-actions').getByRole('button', { name, exact: true }).click();
      check(
        (await page.locator('#board-menu-title').textContent()) === name &&
          (await page
            .locator('#board-menu-panel')
            .evaluate(
              (element, selected) =>
                element.matches(':popover-open') && element.dataset.section === selected,
              section,
            )),
        `Action routed to wrong section: ${name}`,
      );
      await page.locator('#board-menu-panel [data-close]').click();
    }
    for (const [name, id] of [
      ['Board theme', 'theme'],
      ['Display size', 'board-size'],
    ]) {
      await open();
      await page.locator('#support-query').fill(name);
      await page.locator('#support-actions').getByRole('button', { name, exact: true }).click();
      check(
        await page.locator(`#${id}`).evaluate((element) => document.activeElement === element),
        'Setting action did not focus its control',
      );
    }
    await page.evaluate(() => {
      for (let n = 0; n < 36; n++) {
        document.querySelector('#first').click();
        document.querySelector('#next').click();
      }
    });
    await open();
    const full = await report();
    check(
      full.events.length === 64 && full.dropped > 0,
      'Diagnostic retention cap/truncation missing',
    );
    await page.locator('#diagnostic-clear').click();
    check((await report()).events.length === 0, 'Clear retained records');
    check(
      (await page.locator('#comment').inputValue()) === 'PrivateEditedComment',
      'Clear changed authored text',
    );
    await page.locator('#diagnostic-enabled').uncheck();
    check((await report()).events.length === 0, 'Disable retained records');
    await close();
    await page.locator('#previous').click();
    await open();
    check((await report()).events.length === 0, 'Disabled diagnostics recorded actions');
    const [feedback] = await page.locator('#support-dialog a').all();
    check(
      (await feedback.getAttribute('href')) === 'https://github.com/0disoft/banora/issues' &&
        (await feedback.getAttribute('rel')).includes('noreferrer'),
      'Feedback link invalid or leaking referrer',
    );
    for (const [locale, title] of [
      ['en', 'Help'],
      ['ko', '도움말'],
      ['zh', '帮助'],
      ['ja', 'ヘルプ'],
    ]) {
      await close();
      await page.locator('#language').selectOption(locale);
      await open();
      await page.locator('#support-query').fill('');
      check(
        (await page.locator('#support-title').textContent()) === title,
        'Help translation failed',
      );
      check(
        (await page.locator('#game-name').textContent()) === 'Success' &&
          (await page.locator('#games option:checked').textContent()) === 'Success',
        'A record title was translated as interface text',
      );
      await page.setViewportSize({ width: locale === 'en' ? 1440 : 320, height: 900 });
      check(
        await page.locator('#support-dialog').evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.left >= 11 &&
            rect.right <= innerWidth - 11 &&
            element.scrollWidth <= element.clientWidth + 1
          );
        }),
        'Support modal overflow',
      );
    }
    await page.screenshot({ path: 'output/playwright/support-mobile.png' });
    await page.keyboard.press('Escape');
    await page.locator('#support-dialog').waitFor({ state: 'hidden' });
    await page.reload();
    await open();
    await page.locator('#diagnostic-panel summary').first().click();
    check(
      !(await page.locator('#diagnostic-enabled').isChecked()) &&
        (await report()).events.length === 0,
      'Consent/history persisted after reload',
    );
    await close();
    await page.locator('#language').selectOption('en');
    await page.locator('#drafts-open').click();
    await page.locator('#draft-autosave').uncheck();
    await page.locator('#draft-close').click();
    // Delay the public File API, not SDK/controller internals, to reproduce consent changes during real file reading.
    await page.evaluate(() => {
      const original = File.prototype.arrayBuffer;
      window.restoreFileRead = original;
      File.prototype.arrayBuffer = function () {
        return new Promise((resolve) => {
          window.releaseFileRead = async () => resolve(await original.call(this));
        });
      };
    });
    const release = async () => {
      await page.evaluate(async () => {
        const complete = window.releaseFileRead;
        delete window.releaseFileRead;
        await complete();
      });
      await page.waitForFunction(() =>
        document.querySelector('#status').textContent.includes('Invalid SGF point'),
      );
    };
    await upload('(;SZ[5];B[PrivatePending])');
    await open();
    await page.locator('#diagnostic-enabled').check();
    await release();
    check(
      (await report()).events.length === 0,
      'An off-started file read was recorded after opt-in',
    );
    await close();
    await upload('(;SZ[5];B[PrivatePending])');
    await open();
    await page.locator('#diagnostic-enabled').uncheck();
    await page.locator('#diagnostic-enabled').check();
    await release();
    check((await report()).events.length === 0, 'Old file completion crossed disable/re-enable');
    await close();
    await page.locator('#next').click();
    await upload('(;SZ[5];B[PrivatePending])');
    await open();
    await page.locator('#diagnostic-clear').click();
    await release();
    check((await report()).events.length === 0, 'A pending read repopulated cleared diagnostics');
    await page.evaluate(() => {
      File.prototype.arrayBuffer = window.restoreFileRead;
      delete window.restoreFileRead;
    });
    await close();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('#board-menu').click();
    await page.locator('[data-board-menu-section="support"]').click();
    await page.locator('#board-menu-panel #support-open').click();
    await close();
    if (
      await page
        .locator('#board-menu-panel')
        .evaluate((element) => element.matches(':popover-open'))
    )
      await page.locator('#board-menu-panel [data-close]').click();
    check(
      (await page.locator('.file-toolbar #support-open').count()) === 1,
      'Support menu controls not restored',
    );
    await open();
    await page.screenshot({ path: 'output/playwright/support-desktop.png' });
    await close();
    check(errors.length === 0, `Support page errors: ${errors.join('; ')}`);
    check(remote.length === 0, 'Support made remote requests');
    return 'banora-support-complete';
  } finally {
    await context.close();
  }
};

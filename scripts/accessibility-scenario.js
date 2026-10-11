// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (rootPage) => {
  const origin = new URL(rootPage.url()).origin;
  const context = await rootPage.context().browser().newContext({ locale: 'en-US' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const titles = {
    en: ['This record has changes.', 'Remove this continuation?'],
    ko: ['기보에 저장하지 않은 변경이 있습니다.', '이후 진행을 삭제할까요?'],
    zh: ['棋谱有未保存的更改。', '删除后续变化？'],
    ja: ['棋譜に未保存の変更があります。', '以降の変化を削除しますか？'],
  };
  async function guard(name, scope, background = '#language') {
    const dialog = page.getByRole('dialog', { name, exact: true });
    await dialog.waitFor({ state: 'visible' });
    check((await dialog.count()) === 1, `${scope}: ambiguous or missing accessible name`);
    await page.locator(background).evaluate((element) => element.focus());
    check(
      await dialog.evaluate((element) => element.contains(document.activeElement)),
      `${scope}: modal allowed background focus`,
    );
    await page.keyboard.press('Tab');
    check(
      await dialog.evaluate((element) => element.contains(document.activeElement)),
      `${scope}: keyboard focus left the modal`,
    );
    check(
      await dialog.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.left >= 0 &&
          rect.right <= innerWidth + 1 &&
          rect.top >= 0 &&
          rect.bottom <= innerHeight + 1 &&
          element.scrollWidth <= element.clientWidth + 1
        );
      }),
      `${scope}: dialog clipped in the layout viewport`,
    );
    if (scope.endsWith('ko-320') || scope.endsWith('sharing-en-320') || scope === 'unsaved-en-1280')
      await dialog.screenshot({ path: `output/playwright/accessibility-${scope}.png` });
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'hidden' });
  }
  try {
    await page.goto(`${origin}/studio/`);
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: width === 320 ? 480 : 900 });
      for (const [locale, [unsaved, removal]] of Object.entries(titles)) {
        await page.locator('#language').selectOption(locale);
        if (!(await page.locator('#first').isDisabled())) await page.locator('#first').click();
        const note = `Authored accessibility review ${locale} ${width}`;
        await page.locator('#comment').fill(note);
        await page.locator('#comment').blur();
        const dirty = await page.locator('#dirty').textContent();
        const count = await page.locator('#tree button').count();
        await page.locator('#new').focus();
        await page.keyboard.press('Enter');
        await guard(unsaved, `unsaved-${locale}-${width}`);
        check(
          (await page.locator('#comment').inputValue()) === note &&
            (await page.locator('#dirty').textContent()) === dirty &&
            (await page.locator('#tree button').count()) === count,
          'Keyboard cancellation discarded the dirty record',
        );
        check(
          await page.locator('#new').evaluate((element) => element === document.activeElement),
          'Replacement cancellation did not restore the invoking control focus',
        );
        await page.locator('#next').click();
        const move = await page.locator('#move').textContent();
        await page.locator('#board-menu').click();
        await page.locator('[data-board-menu-section="tools"]').click();
        await page.locator('#remove-branch').focus();
        await page.keyboard.press('Enter');
        await guard(removal, `removal-${locale}-${width}`);
        check(
          (await page.locator('#tree button').count()) === count &&
            (await page.locator('#move').textContent()) === move,
          'Keyboard cancellation removed a continuation or moved selection',
        );
        if (
          await page
            .locator('#board-menu-panel')
            .evaluate((element) => element.matches(':popover-open'))
        )
          await page.locator('#board-menu-panel [data-close]').click();
      }
    }
    for (const framework of ['react', 'vue', 'svelte']) {
      await page.goto(`${origin}/${framework}/`);
      const notes = page
        .locator('#viewer-host')
        .getByRole('textbox', { name: 'Position comments', exact: true });
      await notes.waitFor({ state: 'visible' });
      const link = await page.evaluate(async () => {
        const sdk = await import('/sdk/index.js');
        const controller = new sdk.RecordController({ sgf: '(;SZ[5]XX[a11y-fixture])' });
        try {
          const result = sdk.createShareLink(controller.getState(), location.href, {
            kind: 'record',
          });
          if (!result.ok) throw Error('Authored share fixture failed');
          return result.value;
        } finally {
          controller.dispose();
        }
      });
      for (const width of [1280, 320]) {
        await page.setViewportSize({ width, height: width === 320 ? 480 : 900 });
        // These reference consumers expose English controls; they have no language picker.
        {
          const note = `Authored sharing accessibility ${framework} ${width}`;
          await notes.fill(note);
          await notes.blur();
          const svg = page.locator('#board-host svg');
          const dimension = await svg.getAttribute('data-board-width');
          await page.locator('[data-share="input"]').fill(link);
          await page.locator('[data-share="open"]').focus();
          await page.keyboard.press('Enter');
          await guard(titles.en[0], `${framework}-sharing-en-${width}`, '#theme');
          check(
            (await notes.inputValue()) === note &&
              (await svg.getAttribute('data-board-width')) === dimension,
            `${framework}: sharing cancellation replaced authored work`,
          );
        }
      }
    }
    check(errors.length === 0, `Accessibility page error: ${errors.join('; ')}`);
    return 'banora-accessibility-complete';
  } finally {
    await context.close();
  }
};

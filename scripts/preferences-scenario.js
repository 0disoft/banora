// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (rootPage, studioControl) => {
  const origin = new URL(rootPage.url()).origin;
  const context = await rootPage.context().browser().newContext({ locale: 'en-US' });
  const page = await context.newPage();
  const errors = [];
  context.on('page', (opened) => opened.on('pageerror', (error) => errors.push(error.message)));
  page.on('pageerror', (error) => errors.push(error.message));
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const saved = (target) => target.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  const inputState = () =>
    page.evaluate(() => {
      const value = (id) => document.getElementById(id).value;
      const checked = (id) => document.getElementById(id).checked;
      return {
        locale: value('language'),
        boardSize: value('board-size'),
        theme: value('theme'),
        moveNumbers: checked('numbers'),
        rotation: value('rotation'),
        flipX: checked('flip-x'),
        touchMode: value('touch-mode'),
        touchMagnifier: checked('touch-magnifier'),
        animation: checked('animation'),
        animationDuration: value('animation-duration'),
        playbackInterval: document.querySelector('#playback select').value,
        autosave: checked('draft-autosave'),
      };
    });
  const backup = async (name) => {
    await studioControl(page, '#drafts-open', 'drafts', () => page.locator('#drafts-open').click());
    const download = page.waitForEvent('download');
    await page.locator('#backup-save').click();
    await (await download).saveAs(`output/playwright/${name}.banora.json`);
    await page.locator('#draft-close').click();
  };
  const openSettings = async () => {
    await page.locator('#board-menu').click();
    await page.locator('[data-board-menu-section="preferences"]').click();
  };
  const closeMenu = async () => page.locator('#board-menu-panel [data-close]').click();
  try {
    await page.goto(`${origin}/studio/`);
    await page.evaluate(() => {
      localStorage.setItem('banora.studio.locale', 'ko');
      localStorage.setItem('banora.studio.board-size', 'small');
      localStorage.setItem('banora.studio.drafts-enabled', 'false');
      const values = {
        locale: 'ja',
        theme: 'flat',
        moveNumbers: true,
        rotation: 90,
        flipX: true,
        touchMode: 'confirm',
        touchMagnifier: false,
        animation: true,
        animationDuration: 320,
        playbackInterval: 2500,
      };
      for (const [key, value] of Object.entries(values))
        localStorage.setItem(
          `banora.studio.preferences.${key}`,
          JSON.stringify({
            schemaVersion: 'banora.studio-preference/v1',
            value,
          }),
        );
      localStorage.setItem('host-record', 'keep');
      localStorage.setItem('banora.studio.preferences.futureField', 'keep');
    });
    await page.reload();
    check(
      JSON.stringify(await inputState()) ===
        JSON.stringify({
          locale: 'ja',
          boardSize: 'small',
          theme: 'flat',
          moveNumbers: true,
          rotation: '90',
          flipX: true,
          touchMode: 'confirm',
          touchMagnifier: false,
          animation: true,
          animationDuration: '320',
          playbackInterval: '2500',
          autosave: false,
        }),
      'Persisted controls were not restored',
    );
    check((await page.locator('html').getAttribute('lang')) === 'ja', 'Saved locale not applied');
    check(
      (await page.locator('#board').getAttribute('data-display-size')) === 'small',
      'Saved size not applied',
    );
    check(!(await page.locator('#animation-duration').isDisabled()), 'Saved animation not enabled');
    const migrated = await saved(page);
    check(
      !Object.hasOwn(migrated, 'banora.studio.locale') &&
        !Object.hasOwn(migrated, 'banora.studio.board-size') &&
        !Object.hasOwn(migrated, 'banora.studio.drafts-enabled'),
      'Legacy keys survived successful migration',
    );
    await page.locator('#next').click();
    await page.locator('#next').click();
    await page.locator('#next').click();
    check(
      (await page.locator('#board [data-move-number="1"]').count()) === 1,
      'Saved move numbers not applied to board',
    );
    check(
      (await page.locator('#board [data-board-surface]').getAttribute('fill')).includes('#e8e1ce'),
      'Saved theme not applied to board',
    );
    check(
      (await page.locator('#board [data-stone="2,2"]').getAttribute('cx')) === '7.25' &&
        (await page.locator('#board [data-stone="2,2"]').getAttribute('cy')) === '7.25',
      'Saved rotation/reflection not applied to board',
    );
    const second = await context.newPage();
    await second.goto(`${origin}/studio/`);
    await page.locator('#language').selectOption('ko');
    await studioControl(second, '#theme', 'view', () =>
      second.locator('#theme').selectOption('wood'),
    );
    check(
      JSON.parse((await saved(page))['banora.studio.preferences.locale']).value === 'ko',
      'Another tab overwrote an unrelated locale',
    );
    check(
      (await page.locator('#theme').inputValue()) === 'flat',
      'Another tab changed this session',
    );
    await second.close();
    await page.locator('#language').selectOption('en');
    await studioControl(page, '#drafts-open', 'drafts', () => page.locator('#drafts-open').click());
    await studioControl(page, '#draft-autosave', 'drafts', () =>
      page.locator('#draft-autosave').check(),
    );
    await page.locator('#draft-close').click();
    await page.locator('#comment').fill('Preference reset keeps this 한국어 note');
    await page.locator('#comment').blur();
    await page.waitForFunction(
      () => document.querySelector('#draft-status').textContent === 'Draft saved',
    );
    const before = {
      move: await page.locator('#move').textContent(),
      stones: await page.locator('#board [data-stone]').count(),
    };
    await backup('preferences-before');
    await page.setViewportSize({ width: 320, height: 900 });
    await openSettings();
    await studioControl(page, '#settings-reset', 'preferences', () =>
      page.locator('#settings-reset').click(),
    );
    check(
      JSON.stringify(await inputState()) ===
        JSON.stringify({
          locale: 'en',
          boardSize: 'default',
          theme: 'wood',
          moveNumbers: false,
          rotation: '0',
          flipX: false,
          touchMode: 'release',
          touchMagnifier: true,
          animation: false,
          animationDuration: '160',
          playbackInterval: '1000',
          autosave: true,
        }),
      'Reset did not apply every default',
    );
    check(
      (await page.locator('#comment').inputValue()) === 'Preference reset keeps this 한국어 note' &&
        (await page.locator('#move').textContent()) === before.move &&
        (await page.locator('#board [data-stone]').count()) === before.stones &&
        (await page.locator('#dirty').textContent()) === 'Unsaved changes' &&
        !(await page.locator('#undo').isDisabled()),
      'Reset changed record, selection, dirty state or Undo',
    );
    check(
      (await page.locator('#board [data-move-number]').count()) === 0,
      'Reset retained board numbers',
    );
    check(
      (await page.locator('#board [data-board-surface]').getAttribute('fill')).includes(
        '#d9b677',
      ) &&
        (await page.locator('#board [data-stone="2,2"]').getAttribute('cx')) === '3.25' &&
        (await page.locator('#board [data-stone="2,2"]').getAttribute('cy')) === '3.25',
      'Reset did not update rendered theme/transform',
    );
    check(await page.locator('#animation-duration').isDisabled(), 'Reset retained animation');
    const reset = await saved(page);
    check(
      reset['host-record'] === 'keep' && reset['banora.studio.preferences.futureField'] === 'keep',
      'Reset cleared unrelated storage',
    );
    for (const [locale, text] of [
      ['ko', '저장된 설정 초기화'],
      ['zh', '重置已保存的设置'],
      ['ja', '保存済みの設定をリセット'],
      ['en', 'Reset saved settings'],
    ]) {
      await page.locator('#language').selectOption(locale);
      check(
        (await page.locator('#settings-reset').textContent()) === text,
        'Reset label not translated',
      );
      check(
        await page.locator('#board-menu-panel').evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return (
            rect.left >= 11 &&
            rect.right <= innerWidth - 11 &&
            element.scrollWidth <= element.clientWidth + 1
          );
        }),
        'Settings menu overflow',
      );
    }
    await page.screenshot({ path: 'output/playwright/preferences-mobile.png' });
    await closeMenu();
    await backup('preferences-after');
    await studioControl(page, '#drafts-open', 'drafts', () => page.locator('#drafts-open').click());
    await page.waitForFunction(
      () =>
        document.querySelector('#draft-list').options.length > 0 &&
        [...document.querySelector('#draft-list').options].some((item) => item.value),
    );
    await page.locator('#draft-close').click();
    await page.locator('#undo').click();
    check(
      (await page.locator('#comment').inputValue()) !== 'Preference reset keeps this 한국어 note',
      'Reset broke Undo',
    );
    await page.locator('#redo').click();
    check(
      (await page.locator('#comment').inputValue()) === 'Preference reset keeps this 한국어 note',
      'Reset broke Redo',
    );
    await page.close();

    const future = await context.newPage();
    await future.goto(`${origin}/studio/`);
    await future.evaluate(() => {
      localStorage.setItem(
        'banora.studio.preferences.theme',
        JSON.stringify({ schemaVersion: 'banora.studio-preference/v2', value: 'future' }),
      );
      localStorage.setItem('banora.studio.preferences.autosave', 'corrupt');
    });
    await future.reload();
    check(!(await future.locator('#draft-autosave').isChecked()), 'Invalid autosave failed open');
    await studioControl(future, '#theme', 'view', () =>
      future.locator('#theme').selectOption('flat'),
    );
    check(
      JSON.parse((await saved(future))['banora.studio.preferences.theme']).schemaVersion.endsWith(
        '/v2',
      ),
      'Future setting silently overwritten',
    );
    check(
      (await future.locator('#settings-status').textContent()).includes('newer Studio'),
      'Unsupported settings not explained',
    );
    await studioControl(future, '#settings-reset', 'preferences', () =>
      future.locator('#settings-reset').click(),
    );
    check(
      (await future.locator('#settings-status').textContent()) === '',
      'Reset did not recover invalid settings',
    );
    await future.close();

    const denied = await context.newPage();
    await denied.addInitScript(() =>
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('Denied', 'SecurityError');
        },
      }),
    );
    await denied.goto(`${origin}/studio/`);
    check(
      !(await denied.locator('#draft-autosave').isChecked()),
      'Denied preference read enabled retention',
    );
    await denied.locator('#language').selectOption('en');
    await studioControl(denied, '#theme', 'view', () =>
      denied.locator('#theme').selectOption('flat'),
    );
    check(
      (await denied.locator('#theme').inputValue()) === 'flat' &&
        (await denied.locator('#settings-status').textContent()) ===
          'Settings stay in this session only.',
      'Unavailable storage blocked usable session preferences',
    );
    await denied.locator('#comment').fill('Can still edit');
    await denied.locator('#comment').blur();
    check(
      (await denied.locator('#dirty').textContent()) === 'Unsaved changes',
      'Denied storage blocked editing',
    );
    await denied.close();
    check(errors.length === 0, `Preference page errors: ${errors.join('; ')}`);
    return 'banora-preferences-complete';
  } finally {
    await context.close();
  }
};

// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page, studioControl) => {
  const origin = new URL(page.url()).origin;
  const factor = Number(new URL(page.url()).searchParams.get('zoom'));
  const errors = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  const verify = (condition, message) => {
    if (!condition) throw Error(message);
  };
  // Playwright's CSS-size screenshot clip truncates native browser zoom. Capture
  // the compositor viewport without a clip, preserving its actual physical pixels.
  const capture = async (name) => {
    const client = await page.context().newCDPSession(page);
    try {
      const { data } = await client.send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      });
      const pending = page.waitForEvent('download');
      await page.evaluate((encoded) => {
        const link = document.createElement('a');
        link.href = `data:image/png;base64,${encoded}`;
        link.download = 'zoom.png';
        document.body.append(link);
        link.click();
        link.remove();
      }, data);
      await (await pending).saveAs(`output/playwright/zoom-${factor}-${name}.png`);
    } finally {
      await client.detach();
    }
  };
  const fits = async (locator, name) => {
    verify(
      await locator.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.left >= -1 &&
          rect.right <= innerWidth + 1 &&
          rect.top >= -1 &&
          rect.bottom <= innerHeight + 1 &&
          element.scrollWidth <= element.clientWidth + 1
        );
      }),
      `${name} overflows at ${factor * 100}%`,
    );
  };
  const noHorizontalScroll = async () =>
    verify(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `Page overflows at ${factor * 100}%`,
    );
  const panel = page.locator('#board-menu-panel');
  const trigger = page.locator('#board-menu');
  const titles = {
    en: 'This record has changes.',
    ko: '기보에 저장하지 않은 변경이 있습니다.',
    zh: '棋谱有未保存的更改。',
    ja: '棋譜に未保存の変更があります。',
  };
  for (const locale of ['en', 'ko', 'zh', 'ja']) {
    await page.locator('#language').selectOption(locale);
    await noHorizontalScroll();
    for (const section of [
      'tools',
      'view',
      'textures',
      'touch',
      'animation',
      'comparison',
      'share',
      'drafts',
      'search',
      'support',
      'preferences',
      'scoring',
    ]) {
      await trigger.click();
      await panel.locator(`[data-board-menu-section="${section}"]`).click();
      await fits(panel, `${locale}/${section}`);
      await panel.locator('[data-close]').click();
      verify((await trigger.getAttribute('aria-expanded')) === 'false', 'Menu not closed');
    }
    await page.locator('#comment').fill(`Authored localized zoom ${locale}`);
    await page.locator('#comment').blur();
    await studioControl(page, '#new', 'record', async () => {
      await page.locator('#new').focus();
      await page.keyboard.press('Enter');
    });
    const guard = page.getByRole('dialog', { name: titles[locale], exact: true });
    await guard.waitFor({ state: 'visible' });
    await fits(guard, `${locale}/replacement`);
    await page.keyboard.press('Tab');
    verify(
      await guard.evaluate((element) => element.contains(document.activeElement)),
      'Localized guard lost focus',
    );
    await page.keyboard.press('Escape');
    await guard.waitFor({ state: 'hidden' });
    verify(
      (await page.locator('#comment').inputValue()) === `Authored localized zoom ${locale}`,
      'Cancelled guard discarded data',
    );
    await trigger.click();
    await panel.locator('[data-board-menu-section="tools"]').click();
    await panel.locator('#undo').click();
    await page.keyboard.press('Escape');
    verify(
      await trigger.evaluate((element) => element === document.activeElement),
      'Localized Undo lost focus',
    );
  }
  await page.locator('#language').selectOption('en');
  await page.locator('#file').setInputFiles({
    name: 'zoom.sgf',
    mimeType: 'application/x-go-sgf',
    buffer: Buffer.from(
      '(;FF[4]CA[UTF-8]SZ[9]GN[Native zoom]XX[preserve](;B[aa];W[bb]C[한국어 中文 日本語])(;B[cc]))',
    ),
  });
  await page.waitForFunction(
    () => document.querySelector('#game-name').textContent === 'Native zoom',
  );
  await page.locator('#next').focus();
  await page.keyboard.press('Enter');
  verify((await page.locator('#move').innerText()) === 'Move 1', 'Keyboard navigation failed');
  const board = page.locator('#board svg[role="application"]');
  await board.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  verify((await page.locator('#dirty').textContent()) !== 'No changes', 'Keyboard edit failed');
  await trigger.click();
  await panel.locator('[data-board-menu-section="tools"]').click();
  await panel.locator('#undo').click();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => ['app-menu', 'new'].includes(document.activeElement.id));
  verify(
    await trigger.evaluate((element) => element === document.activeElement),
    `Menu focus not restored: ${await page.evaluate(() => ({ active: document.activeElement?.id, expanded: document.querySelector('#board-menu').getAttribute('aria-expanded') })).then(JSON.stringify)}`,
  );
  verify(
    (await page.locator('#dirty').textContent()) === 'No changes',
    'Undo did not restore baseline',
  );
  await page.locator('#comment').fill(`Authored ${factor * 100}% zoom`);
  await page.locator('#comment').blur();
  await studioControl(page, '#new', 'record', async () => {
    await page.locator('#new').focus();
    await page.keyboard.press('Enter');
  });
  const dialog = page.getByRole('dialog', { name: 'This record has changes.', exact: true });
  await fits(dialog, 'Replacement dialog');
  await page.keyboard.press('Tab');
  verify(
    await dialog.evaluate((element) => element.contains(document.activeElement)),
    'Dialog lost keyboard focus',
  );
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => ['app-menu', 'new'].includes(document.activeElement.id));
  verify(
    await page
      .locator('#app-menu,#new')
      .evaluateAll((elements) => elements.includes(document.activeElement)),
    'Guard focus not restored',
  );
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export').click();
  const file = `output/playwright/zoom-${factor}-roundtrip.sgf`;
  await (await downloadPromise).saveAs(file);
  await page.locator('#file').setInputFiles(file);
  await page.waitForFunction(() => document.querySelector('#dirty').textContent === 'No changes');
  await page.locator('#next').click();
  verify(
    (await page.locator('#comment').inputValue()) === `Authored ${factor * 100}% zoom`,
    'Export/reopen lost authored comments',
  );
  await noHorizontalScroll();
  await trigger.click();
  await panel.locator('[data-board-menu-section="tools"]').click();
  await capture('studio');
  await panel.locator('[data-close]').click();
  for (const framework of ['react', 'vue', 'svelte']) {
    await page.goto(`${origin}/${framework}/`);
    await noHorizontalScroll();
    const notes = page.locator('#viewer-host').getByRole('textbox', { name: 'Position comments' });
    await notes.fill(`Zoom ${factor} ${framework}`);
    await notes.blur();
    verify(
      (await notes.inputValue()) === `Zoom ${factor} ${framework}`,
      `${framework} edit failed`,
    );
    await capture(framework);
  }
  verify(errors.length === 0, `Page errors: ${errors.join('; ')}`);
  const measured = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    outerWidth,
    outerHeight,
    dpr: devicePixelRatio,
    scale: visualViewport.scale,
    bodyZoom: getComputedStyle(document.body).zoom,
    userAgent: navigator.userAgent,
  }));
  const reportDownload = page.waitForEvent('download');
  await page.evaluate(
    (value) => {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(value)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'native-zoom.json';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    { factor, ...measured },
  );
  await (await reportDownload).saveAs(`output/playwright/zoom-${factor}.json`);
  return `banora-zoom-${factor}-complete`;
};

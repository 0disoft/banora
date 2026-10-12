// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const origin = new URL(page.url()).origin;
  await page.goto(`${origin}/studio/`);
  await page.locator('#language').selectOption('en');
  const panel = page.locator('#board-menu-panel');
  const trigger = page.locator('#board-menu');
  const verify = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const open = async (section) => {
    await trigger.click();
    await page.locator(`[data-board-menu-section="${section}"]`).click();
  };
  const close = async () => {
    await panel.locator('[data-close]').click();
    verify((await trigger.getAttribute('aria-expanded')) === 'false', 'Menu remained expanded');
    verify(
      (await panel.locator('.board-menu-content > *').count()) === 0,
      'Borrowed controls not restored',
    );
  };
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 900 });
    for (const section of [
      'record',
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
      await open(section);
      const fits = await panel.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return (
          rect.left >= 11 &&
          rect.right <= innerWidth - 11 &&
          rect.top >= 11 &&
          rect.bottom <= innerHeight - 11 &&
          element.scrollWidth <= element.clientWidth + 1
        );
      });
      verify(fits, `${section} menu overflow at ${width}px`);
      await close();
    }
  }
  await page.locator('#app-menu').click();
  await page.locator('[data-board-menu-section="record"]').click();
  verify(
    await panel.locator('#games').isVisible(),
    'Header menu did not expose collection selection',
  );
  verify(await panel.locator('#new').isVisible(), 'Header menu did not expose new record');
  await panel.locator('[data-close]').click();
  verify(
    await page.locator('#app-menu').evaluate((element) => element === document.activeElement),
    'Header menu did not restore its own focus',
  );
  await open('drafts');
  await panel.locator('#drafts-open').click();
  await page.locator('#drafts-dialog').waitFor({ state: 'visible' });
  await page.locator('#draft-close').click();
  if (await panel.evaluate((element) => element.matches(':popover-open'))) await close();
  verify(
    (await page.locator('.file-toolbar #drafts-open').count()) === 1,
    'Recovery controls were not restored after opening a modal from the menu',
  );
  await open('tools');
  await panel.locator('#tool').selectOption('play');
  await page.keyboard.press('Escape');
  verify((await trigger.getAttribute('aria-expanded')) === 'false', 'Escape did not close menu');
  verify(
    await trigger.evaluate((element) => element === document.activeElement),
    'Menu lost keyboard focus',
  );
  const dirty = await page.locator('#dirty').textContent();
  const move = await page.locator('#move').textContent();
  await page.locator('#board svg[role="application"]').focus();
  await page.keyboard.press('Enter');
  verify(
    (await page.locator('#dirty').textContent()) !== dirty,
    'Board edit did not reach shared history',
  );
  await open('tools');
  await panel.locator('#undo').click();
  verify(
    (await page.locator('#dirty').textContent()) === dirty &&
      (await page.locator('#move').textContent()) === move,
    'Menu Undo failed to restore shared history',
  );
  await page.keyboard.press('Escape');
  verify(
    (await trigger.getAttribute('aria-expanded')) === 'false' &&
      (await trigger.evaluate((element) => element === document.activeElement)),
    'Escape after the final Undo lost menu focus',
  );
  await open('tools');
  await panel.locator('[data-back]').click();
  await panel.locator('[data-board-menu-section="scoring"]').click();
  await panel.locator('#score-open').click();
  await panel.locator('#score-komi').fill('7.5');
  await panel.locator('#score-komi').dispatchEvent('change');
  await close();
  await open('scoring');
  verify((await panel.locator('#score-komi').inputValue()) === '7.5', 'Menu reset scoring session');
  await close();
  const context = await page
    .context()
    .browser()
    .newContext({
      locale: 'en-US',
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
  try {
    const mobile = await context.newPage();
    await mobile.goto(`${origin}/studio/`);
    await mobile.locator('#board-menu').click();
    const cdp = await context.newCDPSession(mobile);
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2 });
    await mobile.waitForFunction(() => {
      const viewport = visualViewport;
      const panel = document.querySelector('#board-menu-panel');
      const rect = panel.getBoundingClientRect();
      return (
        viewport.scale === 2 &&
        rect.left >= viewport.offsetLeft + 11 &&
        rect.right <= viewport.offsetLeft + viewport.width - 11 &&
        rect.top >= viewport.offsetTop + 11 &&
        rect.bottom <= viewport.offsetTop + viewport.height - 11 &&
        panel.scrollWidth <= panel.clientWidth + 1
      );
    });
    await mobile.locator('#board-menu-panel [data-close]').tap();
    verify(
      (await mobile.locator('#board-menu').getAttribute('aria-expanded')) === 'false',
      'Zoomed menu close button was not reachable',
    );
    await cdp.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1 });
    await mobile.waitForFunction(() => visualViewport.scale === 1);
    await mobile.locator('#board-menu').click();
    await mobile.locator('#board-menu-panel [data-close]').click();
    verify(
      (await mobile.locator('#board-menu').getAttribute('aria-expanded')) === 'false',
      'Zoomed menu did not remain operable',
    );
  } finally {
    await context.close();
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  return 'banora-menu-complete';
};

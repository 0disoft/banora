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
  const frame = page.locator('.board-frame');
  const width = () => frame.evaluate((element) => element.getBoundingClientRect().width);
  const size = page.locator('#board-size');
  const preset = (value) => size.selectOption(value);
  const exportRecord = async (name) => {
    const download = page.waitForEvent('download');
    await page.locator('#export').click();
    await (await download).saveAs(`output/playwright/${name}.sgf`);
  };
  await page.locator('#file').setInputFiles({
    name: 'resize.sgf',
    mimeType: 'application/x-go-sgf',
    buffer: Buffer.from('(;SZ[19]GN[Resize fixture]XX[keep];B[dd]C[Resize keeps this note])'),
  });
  await page.waitForFunction(
    () => document.querySelector('#game-name').textContent === 'Resize fixture',
  );
  await page.locator('#next').click();
  await exportRecord('resize-before');
  verify(
    await frame.evaluate((element) => {
      const sidebar = document.querySelector('.sidebar').getBoundingClientRect();
      const rail = document.querySelector('.workspace-tabs').getBoundingClientRect();
      const board = element.getBoundingClientRect();
      const panel = document.querySelector('.board-panel').getBoundingClientRect();
      return (
        sidebar.right <= panel.left + 1 &&
        board.right <= rail.left &&
        Math.abs(panel.right - rail.left) <= 1 &&
        rail.width < 200
      );
    }),
    'Board controls were not moved to the right of the board',
  );
  verify(
    (await page.locator('#board-tabs').getAttribute('aria-orientation')) === 'vertical',
    'Vertical tab semantics missing',
  );
  const initial = await width();
  verify(initial >= 630, 'Default board did not reclaim vertical menu space');
  verify(await page.locator('.workspace-tabs #board-size').isVisible(), 'Size dropdown hidden');
  verify((await page.locator('[data-board-preset]').count()) === 0, 'Old preset buttons remain');
  verify(
    (
      await size.locator('option').evaluateAll((options) => options.map((option) => option.value))
    ).join(',') === 'small,default,large,custom',
    'Size choices missing',
  );
  await preset('small');
  const small = await width();
  await preset('default');
  const normal = await width();
  await preset('large');
  verify(small < normal && normal < (await width()), 'Preset sizes did not change the board');
  await preset('default');
  const beforeCustom = await width();
  await preset('custom');
  verify((await width()) === beforeCustom, 'Selecting Custom changed the board width');
  await preset('default');
  const drag = async (corner, dx, dy) => {
    const handle = await page.locator(`[data-resize-corner="${corner}"]`).boundingBox();
    const x = handle.x + handle.width / 2,
      y = handle.y + handle.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 8 });
    await page.mouse.up();
  };
  for (const [corner, dx, dy, sign] of [
    ['se', 60, 60, 1],
    ['nw', 30, 30, -1],
    ['ne', 30, -30, 1],
    ['sw', -30, 30, 1],
    ['n', 0, 30, -1],
    ['e', 30, 0, 1],
    ['s', 0, -30, -1],
    ['w', 30, 0, -1],
  ]) {
    await preset('default');
    const target = page.locator(`[data-resize-corner="${corner}"]`);
    await target.hover();
    verify(
      await target.evaluate((element) => {
        const style = getComputedStyle(element);
        return (
          style.cursor.endsWith('-resize') &&
          style.backgroundColor === 'rgba(0, 0, 0, 0)' &&
          getComputedStyle(element, '::before').content === 'none'
        );
      }),
      `${corner} target lacks a resize cursor or still overlays an icon`,
    );
    const before = await width();
    await drag(corner, dx, dy);
    verify(((await width()) - before) * sign > 20, `${corner} target did not resize`);
  }
  verify(
    (await page.locator('#board-size').inputValue()) === 'custom',
    'Custom size not reflected in settings',
  );
  const handle = page.locator('[data-resize-corner="se"]');
  const originBox = await handle.boundingBox();
  const originX = originBox.x + originBox.width / 2,
    originY = originBox.y + originBox.height / 2;
  const beforeReturn = await width();
  await page.mouse.move(originX, originY);
  await page.mouse.down();
  await page.mouse.move(originX + 50, originY + 50);
  await page.mouse.move(originX, originY);
  await page.mouse.up();
  verify((await width()) === beforeReturn, 'Returning the drag pointer did not restore width');
  await handle.focus();
  const beforeKey = await width();
  await page.keyboard.press('ArrowRight');
  verify((await width()) === beforeKey + 10, 'Keyboard size adjustment failed');
  const box = await handle.boundingBox();
  const beforeCancel = await width();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 65, box.y + 65);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  verify((await width()) === beforeCancel, 'Cancelled resize was not restored');
  for (const [locale, text] of [
    ['ko', '커스텀'],
    ['zh', '自定义'],
    ['ja', '手動調整'],
    ['en', 'Custom'],
  ]) {
    await page.locator('#language').selectOption(locale);
    verify(
      (await size.locator('option:checked').textContent()) === text,
      'Custom label not localized',
    );
    verify((await width()) === beforeCancel, 'Language change reset the custom width');
  }
  verify(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('banora.studio.preferences.boardSize')).value === 'default',
    ),
    'Custom selection overwrote the persisted preset',
  );
  verify(
    (await page.locator('#move').textContent()) === 'Move 1' &&
      (await page.locator('#comment').inputValue()) === 'Resize keeps this note',
    'Resize mutated the current position',
  );
  verify(
    (await page.locator('#dirty').textContent()) === 'No changes',
    'Resize dirtied the record',
  );
  for (const format of ['svg', 'png']) {
    const button = page.locator(`.workspace-tabs #${format}-export`);
    verify(await button.isVisible(), `${format} export still requires opening a menu`);
    verify(
      (await button.getAttribute('aria-label')) === `Save ${format.toUpperCase()}`,
      'Export accessible name missing',
    );
    const pending = page.waitForEvent('download');
    await button.click();
    const download = await pending;
    await download.saveAs(`output/playwright/rail-diagram.${format}`);
    const parts = [];
    for await (const part of await download.createReadStream()) parts.push(part);
    const data = Buffer.concat(parts);
    verify(
      format === 'png'
        ? data.subarray(0, 8).toString('hex') === '89504e470d0a1a0a'
        : data.toString('utf8').includes('xmlns="http://www.w3.org/2000/svg"'),
      `${format} export did not download a valid image`,
    );
  }
  verify(
    (await page.locator('#dirty').textContent()) === 'No changes',
    'Image export changed the record',
  );
  await exportRecord('resize-after');
  await page.locator('#board-menu').click();
  await page.locator('[data-board-menu-section="view"]').click();
  verify(
    await page.locator('.diagram-actions').evaluate((element) => {
      const first = element.children[0].getBoundingClientRect(),
        second = element.children[1].getBoundingClientRect();
      const rail = element.closest('.workspace-tabs').getBoundingClientRect();
      return (
        Math.abs(first.top - second.top) < 1 &&
        first.left >= rail.left &&
        second.right <= rail.right
      );
    }),
    'SVG/PNG buttons are on different lines',
  );
  verify(
    await page
      .locator('.board-menu-heading')
      .evaluate(
        (element) =>
          getComputedStyle(element).backgroundColor ===
          getComputedStyle(element.parentElement).backgroundColor,
      ),
    'Menu heading still has a different background',
  );
  await page.screenshot({ path: 'output/playwright/resize-view-menu.png' });
  await page.locator('#board-menu-panel [data-close]').click();
  await preset('default');
  for (const viewport of [
    { width: 320, height: 900 },
    { width: 390, height: 844 },
    { width: 900, height: 900 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    verify(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `Horizontal overflow at ${viewport.width}`,
    );
    verify((await handle.isVisible()) && (await size.isVisible()), 'Sizing controls disappeared');
    verify(
      (await page.locator('#svg-export').isVisible()) &&
        (await page.locator('#png-export').isVisible()),
      'Image exports disappeared',
    );
  }
  await page.screenshot({ path: 'output/playwright/resize-desktop.png' });
  verify(errors.length === 0, errors.join('; '));
  return 'banora-sizing-complete';
};

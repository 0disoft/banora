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
  const preset = (value) => page.locator(`[data-board-preset="${value}"]`);
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
      return sidebar.right <= rail.left + 1 && rail.right <= board.left && rail.width < 200;
    }),
    'Board controls were not moved into the middle vertical rail',
  );
  verify(
    (await page.locator('#board-tabs').getAttribute('aria-orientation')) === 'vertical',
    'Vertical tab semantics missing',
  );
  const initial = await width();
  verify(initial >= 630, 'Default board did not reclaim vertical menu space');
  for (const value of ['small', 'default', 'large'])
    verify(await preset(value).isVisible(), 'Preset hidden in menu');
  await preset('small').click();
  const small = await width();
  await preset('default').click();
  const normal = await width();
  await preset('large').click();
  verify(small < normal && normal < (await width()), 'Preset sizes did not change the board');
  await preset('default').click();
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
  ]) {
    const before = await width();
    await drag(corner, dx, dy);
    verify(((await width()) - before) * sign > 20, `${corner} corner did not resize`);
  }
  verify(
    (await page.locator('#board-size').inputValue()) === 'custom',
    'Custom size not reflected in settings',
  );
  const handle = page.locator('[data-resize-corner="se"]');
  await handle.focus();
  const beforeKey = await width();
  await page.keyboard.press('ArrowRight');
  verify((await width()) === beforeKey + 10, 'Keyboard size adjustment failed');
  const box = await handle.boundingBox();
  const beforeCancel = await width();
  await page.mouse.move(box.x + 15, box.y + 15);
  await page.mouse.down();
  await page.mouse.move(box.x + 65, box.y + 65);
  await page.keyboard.press('Escape');
  await page.mouse.up();
  verify((await width()) === beforeCancel, 'Cancelled resize was not restored');
  verify(
    (await page.locator('#move').textContent()) === 'Move 1' &&
      (await page.locator('#comment').inputValue()) === 'Resize keeps this note',
    'Resize mutated the current position',
  );
  verify(
    (await page.locator('#dirty').textContent()) === 'No changes',
    'Resize dirtied the record',
  );
  await exportRecord('resize-after');
  await page.locator('#board-menu').click();
  await page.locator('[data-board-menu-section="view"]').click();
  verify(
    await page.locator('.diagram-actions').evaluate((element) => {
      const first = element.children[0].getBoundingClientRect(),
        second = element.children[1].getBoundingClientRect();
      return Math.abs(first.top - second.top) < 1;
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
  await preset('default').click();
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
    verify(await handle.isVisible(), 'Resize control disappeared');
  }
  await page.screenshot({ path: 'output/playwright/resize-desktop.png' });
  verify(errors.length === 0, errors.join('; '));
  return 'banora-sizing-complete';
};

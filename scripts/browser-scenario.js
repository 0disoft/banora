// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const errors = [];
  const requests = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${message.text()} at ${message.location().url}`);
  });
  page.on('request', (request) => requests.push({ url: request.url(), method: request.method() }));
  const origin = new URL(page.url()).origin;
  const verify = (condition, message) => {
    if (!condition) throw Error(message);
  };
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole('button', { name: 'Next move', exact: true }).click();
  const board = page.getByRole('application');
  await board.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  verify((await page.locator('#move').innerText()) === 'Move 2', 'Keyboard branch failed');
  await page.keyboard.press('Enter');
  verify(
    (await page.locator('#move').innerText()) === 'Move 2' &&
      (await page.locator('#status').innerText()).includes('occupied'),
    'Illegal move mutated position',
  );
  await page
    .getByRole('textbox', { name: 'Notes on this position' })
    .fill('A browser edit: preserve this comment.');
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  verify((await page.locator('#comment').inputValue()) === '', 'Comment Undo failed');
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await page.getByRole('combobox', { name: 'Tool', exact: true }).selectOption('label');
  await page.locator('#label-text').fill('A:B');
  await board.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  const downloadReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export SGF', exact: true }).click();
  await (await downloadReady).saveAs('output/playwright/browser-roundtrip.sgf');
  verify((await page.locator('#dirty').innerText()) === 'No changes', 'Export baseline failed');
  await page.locator('#file').setInputFiles('output/playwright/browser-roundtrip.sgf');
  await page.getByRole('button', { name: '2 · White B8', exact: true }).click();
  verify(
    (await page.locator('#comment').inputValue()) === 'A browser edit: preserve this comment.',
    'Comment lost on reopen',
  );
  verify((await page.locator('[data-marker]').count()) === 1, 'Label lost on reopen');
  verify(
    (await page.getByRole('button', { name: '2 · White C3', exact: true }).count()) === 1,
    'Original variation lost',
  );
  await page.getByRole('checkbox', { name: 'Move numbers' }).check();
  verify((await page.locator('[data-move-number]').count()) === 2, 'Move number overlay failed');
  await page.getByRole('checkbox', { name: 'Move numbers' }).uncheck();
  await page.screenshot({ path: 'output/playwright/studio-desktop.png', fullPage: true });
  await page.locator('#comment').fill('Dirty guard');
  await page.getByRole('button', { name: 'New record', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('dialog').open);
  verify((await page.locator('#comment').inputValue()) === 'Dirty guard', 'Cancel lost changes');
  await page.getByRole('button', { name: 'New record', exact: true }).click();
  await page.getByRole('button', { name: 'Discard', exact: true }).click();
  await page.waitForFunction(
    () =>
      document.querySelector('#board svg[role="application"]').getAttribute('data-board-width') ===
      '19',
  );
  await page.locator('#comment').fill('Export before replace');
  await page.getByRole('button', { name: 'Example game', exact: true }).click();
  const guardedDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export & continue', exact: true }).click();
  await (await guardedDownload).saveAs('output/playwright/browser-guard.sgf');
  await page.waitForFunction(
    () =>
      document.querySelector('#board svg[role="application"]').getAttribute('data-board-width') ===
      '9',
  );
  await page.locator('#file').setInputFiles('output/playwright/browser-guard.sgf');
  await page.waitForFunction(
    () => document.querySelector('#comment').value === 'Export before replace',
  );
  await page
    .locator('#file')
    .setInputFiles({ name: 'invalid.sgf', mimeType: 'text/plain', buffer: Buffer.from('(bad') });
  await page.waitForFunction(() =>
    document.querySelector('#status').textContent.includes('Unexpected'),
  );
  verify(
    (await page.locator('#comment').inputValue()) === 'Export before replace',
    'Malformed import replaced record',
  );
  await page.locator('#file').setInputFiles({
    name: 'capture.sgf',
    mimeType: 'text/plain',
    buffer: Buffer.from('(;SZ[3]AB[ab][ba][cb]AW[bb])'),
  });
  await page.waitForFunction(
    () =>
      document.querySelector('#board svg[role="application"]').getAttribute('data-board-width') ===
      '3',
  );
  await page.getByRole('combobox', { name: 'Tool', exact: true }).selectOption('play');
  const captureBoard = page.getByRole('application');
  const bounds = await captureBoard.boundingBox();
  await captureBoard.click({ position: { x: bounds.width / 2, y: (bounds.height * 3.25) / 4.5 } });
  verify(
    (await page.locator('#captures').innerText()).includes('● 1'),
    'Browser capture count incorrect',
  );
  verify(
    (await page.locator('[data-stone="1,1"]').count()) === 0,
    'Captured stone remained on board',
  );
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await page.goto(`${origin}/readonly/`);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Unmount board', exact: true }).click();
  verify((await page.locator('svg').count()) === 0, 'Unmount left DOM');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Mount board', exact: true }).click();
  verify((await page.locator('[data-stone]').count()) === 2, 'External controller lost on remount');
  await page.getByRole('application').click({ position: { x: 70, y: 70 } });
  await page.keyboard.press('Enter');
  verify(
    (await page.locator('#position').innerText()).startsWith('Move 2'),
    'Read-only view edited record',
  );
  await page.evaluate(async () => {
    const sdk = await import('/sdk/index.js');
    const container = document.createElement('div');
    container.style.width = '350px';
    document.body.append(container);
    const controller = new sdk.RecordController({ size: 9 });
    const original = controller.prepareExport().text;
    const view = sdk.mountBoard(container, {
      controller,
      crop: { x: 2, y: 2, width: 5, height: 5 },
    });
    if (container.querySelector('svg').getAttribute('viewBox') !== '2 2 6.5 6.5')
      throw Error('Crop incorrect');
    let rejected = false;
    try {
      view.update({ crop: { x: -1, y: 0, width: 5, height: 5 } });
    } catch {
      rejected = true;
    }
    if (!rejected || controller.prepareExport().text !== original)
      throw Error('Crop mutated record');
    view.dispose();
    if (container.querySelector('svg') || controller.getState().position.width !== 9)
      throw Error('External disposal failed');
    const owned = sdk.mountBoard(container);
    owned.dispose();
    let disposed = false;
    try {
      owned.controller.getState();
    } catch {
      disposed = true;
    }
    if (!disposed) throw Error('Owned controller leaked');
    controller.dispose();
    container.remove();
  });
  await page.goto(`${origin}/viewer/`);
  const viewer = page.getByRole('region', { name: 'Go record viewer' });
  await viewer.getByRole('button', { name: 'Next move', exact: true }).click();
  await viewer.getByRole('button', { name: 'Next move', exact: true }).click();
  verify(
    (await page.locator('#state').innerText()).includes('move 2, clean'),
    'Viewer navigation failed',
  );
  await viewer.getByRole('application').focus();
  await page.keyboard.press('Enter');
  verify(
    (await page.locator('#state').innerText()).includes('move 2, clean'),
    'Viewer default was editable',
  );
  await viewer.locator('summary').click();
  await viewer.getByRole('button', { name: 'Select 5 · Black C5', exact: true }).click();
  verify(
    (await page.locator('#state').innerText()).includes('move 5, clean'),
    'Viewer branch selection failed',
  );
  await page.getByRole('button', { name: 'Enable editing', exact: true }).click();
  await viewer.getByRole('textbox', { name: 'Position comments' }).fill('Viewer editing');
  verify(
    (await page.locator('#state').innerText()).includes('changed'),
    'Viewer comment binding failed',
  );
  await viewer.getByRole('button', { name: 'Undo', exact: true }).click();
  verify(
    (await page.locator('#state').innerText()).includes('clean'),
    'Viewer grouped Undo failed',
  );
  await page.getByRole('button', { name: 'Unmount viewer', exact: true }).click();
  verify((await viewer.count()) === 0, 'Viewer disposal left DOM');
  await page.getByRole('button', { name: 'Mount viewer', exact: true }).click();
  verify(
    (await page.locator('#state').innerText()).includes('move 5, clean'),
    'Viewer disposal lost controller',
  );
  const mobileContext = await page
    .context()
    .browser()
    .newContext({
      locale: 'en-US',
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
  try {
    const mobile = await mobileContext.newPage();
    mobile.on('pageerror', (error) => errors.push(String(error)));
    mobile.on('request', (request) =>
      requests.push({ url: request.url(), method: request.method() }),
    );
    await mobile.goto(`${origin}/studio/`);
    await mobile.getByRole('application').tap({ position: { x: 100, y: 100 } });
    verify((await mobile.locator('#move').innerText()) === 'Move 1', 'Touch placement failed');
    verify(
      !(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth)),
      'Mobile overflow',
    );
    await mobile.getByRole('button', { name: 'Undo', exact: true }).click();
    await mobile.getByRole('button', { name: 'Next move', exact: true }).click();
    await mobile.screenshot({ path: 'output/playwright/studio-touch.png', fullPage: true });
  } finally {
    await mobileContext.close();
  }
  verify(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
  verify(
    requests.every((request) => request.method === 'GET' && new URL(request.url).origin === origin),
    'Implicit external request or upload',
  );
  return 'banora-browser-complete';
};

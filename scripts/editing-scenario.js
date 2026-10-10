// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const origin = new URL(page.url()).origin;
  const failures = [];
  page.on('pageerror', (error) => failures.push(String(error)));
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin)
      failures.push(`External request: ${url.origin}`);
  });
  const verify = (condition, message) => {
    if (!condition) throw Error(message);
  };
  await page.goto(`${origin}/studio/`);
  const input = page.locator('#file');
  await input.setInputFiles({
    name: 'editing.sgf',
    mimeType: 'application/x-go-sgf',
    buffer: Buffer.from('(;SZ[9]GN[Editor fixture]XX[preserve](;B[aa];W[bb])(;B[cc]))'),
  });
  await page.waitForFunction(
    () => document.querySelector('#game-name').textContent === 'Editor fixture',
  );
  const board = page.locator('#board svg');
  const keyboardPoint = async (right, down) => {
    await board.focus();
    for (let i = 0; i < right; i++) await page.keyboard.press('ArrowRight');
    for (let i = 0; i < down; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
  };
  await page.locator('#tool').selectOption('setup-white');
  await keyboardPoint(4, 4);
  verify((await page.locator('[data-stone="4,4"]').count()) === 1, 'White setup failed');
  await page.locator('#tool').selectOption('setup-black');
  await keyboardPoint(0, 1);
  await page.locator('#tool').selectOption('setup-empty');
  await board.focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  verify((await page.locator('[data-stone="4,4"]').count()) === 0, 'Clear setup point failed');
  verify(
    (await page.locator('#move').innerText()) === 'Move 0',
    'Setup incorrectly counted as a move',
  );
  await page.locator('#next-player').selectOption('white');
  verify((await page.locator('#turn').innerText()).includes('White'), 'Setup turn failed');
  await page.locator('#tool').selectOption('arrow');
  await board.focus();
  await page.keyboard.press('Enter');
  await keyboardPoint(2, 0);
  verify(
    (await page.locator('[data-connection="arrow"][data-from="4,4"][data-to="6,4"]').count()) === 1,
    'Arrow direction failed',
  );
  await page.locator('#tool').selectOption('line');
  await board.focus();
  await page.keyboard.press('Enter');
  await keyboardPoint(0, 2);
  verify((await page.locator('[data-connection="line"]').count()) === 1, 'Line rendering failed');
  await board.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  verify(
    (await page.locator('[data-connection="line"]').count()) === 0,
    'Reversed line toggle failed',
  );
  await page.locator('#undo').click();
  verify((await page.locator('[data-connection="line"]').count()) === 1, 'Line Undo failed');
  const colors = await page.evaluate(() => {
    const host = document.querySelector('#board');
    host.style.setProperty('--banora-black', '#123456');
    host.style.setProperty('--banora-grid', '#456789');
    return [
      getComputedStyle(host.querySelector('[data-stone="4,5"]')).fill,
      getComputedStyle(host.querySelector('svg line')).stroke,
    ];
  });
  verify(
    colors[0] === 'rgb(18, 52, 86)' && colors[1] === 'rgb(69, 103, 137)',
    'Host CSS tokens ignored',
  );
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#export').click();
  const download = await downloadPromise;
  await download.saveAs('output/playwright/editing-roundtrip.sgf');
  await input.setInputFiles('output/playwright/editing-roundtrip.sgf');
  await page.waitForFunction(
    () =>
      document.querySelectorAll('[data-connection]').length === 2 &&
      document.querySelector('#dirty').textContent === 'No changes',
  );
  verify((await page.locator('[data-stone="4,5"]').count()) === 1, 'Setup export/reopen failed');
  await page.getByRole('button', { name: 'Black C7', exact: true }).click();
  await page.locator('#promote-branch').click();
  verify(
    (await page.locator('#tree button').nth(1).innerText()) === 'Black C7',
    'Branch promotion failed',
  );
  await page.locator('#remove-branch').click();
  await page.locator('#remove-dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  verify(
    (await page.getByRole('button', { name: 'Black C7', exact: true }).count()) === 1,
    'Cancelled removal changed record',
  );
  await page.locator('#remove-branch').click();
  await page.locator('#remove-dialog').getByRole('button', { name: 'Remove', exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll('#tree button').length === 3);
  verify(
    (await page.locator('#move').innerText()) === 'Move 0',
    'Removed selection did not return to parent',
  );
  await page.locator('#undo').click();
  verify(
    (await page
      .getByRole('button', { name: 'Black C7', exact: true })
      .getAttribute('aria-current')) === 'true',
    'Removal Undo did not restore cursor',
  );
  await page.locator('#undo').click();
  verify(
    (await page.locator('#tree button').nth(1).innerText()) === 'Black A9',
    'Reorder Undo failed',
  );
  verify(
    (await page.locator('#dirty').innerText()) === 'No changes',
    'Editing Undo did not restore export baseline',
  );
  await page.evaluate(async () => {
    const { RecordController, mountViewer } = await import('/sdk/index.js');
    const controller = new RecordController({ sgf: '(;C[original])' });
    const host = document.createElement('div');
    document.body.append(host);
    const view = mountViewer(host, { controller });
    const end = controller.beginEditGroup();
    controller.setComment('one');
    view.dispose();
    controller.setComment('two');
    end();
    controller.undo();
    if (controller.getState().node.properties.C?.[0] !== 'original')
      throw Error('Read-only disposal split another editor group');
    const editor = mountViewer(host, { controller, editable: true });
    host.querySelector('textarea').focus();
    controller.setComment('first editor');
    const closeNewGroup = controller.beginEditGroup();
    controller.setComment('new editor');
    editor.dispose();
    controller.setComment('new final');
    closeNewGroup();
    controller.undo();
    if (controller.getState().node.properties.C?.[0] !== 'first editor')
      throw Error('Old viewer disposal split new editor group');
    controller.dispose();
    host.remove();
  });
  await page.screenshot({ path: 'output/playwright/extended-editor.png', fullPage: true });
  verify(failures.length === 0, failures.join('; '));
  return 'banora-editing-complete';
};

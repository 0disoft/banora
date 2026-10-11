// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const origin = new URL(page.url()).origin,
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  // Original fixture with long recorded pass sequence and analysis-like comments; no downloaded game is committed.
  const sgf =
    '(;FF[4]GM[1]CA[UTF-8]SZ[19]GN[Long replay fixture]PB[Engine Black]PW[Engine White]XX[retain];B[dd]C[0.47 0.53 -0.5 v=1015];W[pp]' +
    ';B[];W[]'.repeat(80) +
    ')';
  await page.goto(`${origin}/studio/`);
  await page.locator('#file').setInputFiles({
    name: 'long-replay.sgf',
    mimeType: 'application/x-go-sgf',
    buffer: Buffer.from(sgf),
  });
  await page.locator('#game-name').filter({ hasText: 'Long replay fixture' }).waitFor();
  const move = () => page.locator('#move').textContent();
  const interval = page.getByRole('combobox', { name: 'Playback interval', exact: true });
  check((await interval.locator('option').count()) === 10, 'Missing 0.5–5 second intervals');
  await interval.selectOption('500');
  await page.getByRole('button', { name: 'Play record', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#move').textContent !== 'Move 0');
  await page.getByRole('button', { name: 'Pause playback', exact: true }).click();
  const paused = await move();
  await page.waitForTimeout(600);
  check(
    (await move()) === paused && (await page.locator('#dirty').textContent()) === 'No changes',
    'Pause did not stop or replay dirtied the record',
  );
  await page.getByRole('button', { name: 'First node', exact: true }).click();
  await page.getByRole('button', { name: 'Next move', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  check((await move()) === 'Move 1', 'Right arrow did not advance exactly once');
  await page.keyboard.press('ArrowLeft');
  check((await move()) === 'Move 0', 'Left arrow did not go back exactly once');
  const board = page.locator('#board svg[role="application"]');
  await board.focus();
  await page.keyboard.press('ArrowRight');
  check((await move()) === 'Move 0', 'Board cursor key unexpectedly navigated the record');
  await page.keyboard.press('Alt+ArrowRight');
  check((await move()) === 'Move 1', 'Board Alt+Right did not navigate');
  await page.keyboard.press('Alt+ArrowLeft');
  check((await move()) === 'Move 0', 'Board Alt+Left did not navigate');
  await page.locator('#comment').focus();
  await page.keyboard.press('ArrowRight');
  check((await move()) === 'Move 0', 'Text cursor key navigated the record');
  await interval.focus();
  await page.keyboard.press('ArrowRight');
  check((await move()) === 'Move 0', 'Select key navigated the record');
  await interval.selectOption('5000');
  await page.getByRole('button', { name: 'Play record', exact: true }).click();
  await interval.selectOption('500');
  await page.waitForFunction(() => document.querySelector('#move').textContent === 'Move 1');
  await page.getByRole('button', { name: 'Next move', exact: true }).click();
  check(
    (await move()) === 'Move 2' &&
      (await page.getByRole('button', { name: 'Play record', exact: true }).isVisible()),
    'Manual navigation failed to pause',
  );
  await page.getByRole('button', { name: 'Play record', exact: true }).click();
  await page.locator('#comment').focus();
  check(
    await page.getByRole('button', { name: 'Play record', exact: true }).isVisible(),
    'Reading/editing notes failed to pause',
  );
  await page.getByRole('button', { name: 'Last node', exact: true }).click();
  check(
    (await move()) === 'Move 162' &&
      (await page.getByRole('button', { name: 'Play record', exact: true }).isDisabled()),
    'Long-record leaf failed to disable playback',
  );
  await page.getByRole('button', { name: 'Previous move', exact: true }).click();
  await page.getByRole('button', { name: 'Play record', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#move').textContent === 'Move 162');
  check(
    await page.getByRole('button', { name: 'Play record', exact: true }).isDisabled(),
    'Timed end did not pause',
  );
  const saving = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export SGF', exact: true }).click();
  await (await saving).saveAs('output/playwright/playback-preserved.sgf');
  await page.getByRole('button', { name: 'First node', exact: true }).click();
  await page.getByRole('button', { name: 'Play record', exact: true }).click();
  await page.locator('#file').setInputFiles({
    name: 'replacement.sgf',
    mimeType: 'application/x-go-sgf',
    buffer: Buffer.from('(;SZ[9]GN[Replacement];B[aa])'),
  });
  await page.locator('#game-name').filter({ hasText: 'Replacement' }).waitFor();
  await page.waitForTimeout(600);
  check((await move()) === 'Move 0', 'Import retained an old timer');
  await page.locator('#comment').fill('Dialog keyboard guard');
  await page.getByRole('button', { name: 'New record', exact: true }).click();
  await page.keyboard.press('ArrowRight');
  check((await move()) === 'Move 0', 'Dialog key navigated behind the dialog');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.locator('#comment').fill('');
  await page.screenshot({ path: 'output/playwright/studio-playback.png', fullPage: true });

  for (const name of ['viewer', 'react', 'vue', 'svelte', 'browser']) {
    await page.goto(`${origin}/${name}/`);
    const host =
      name === 'viewer' || name === 'browser'
        ? page.locator('#viewer')
        : page.locator('#viewer-host');
    await host.getByRole('button', { name: 'Play record', exact: true }).waitFor();
    const before = await host.locator('nav > span').textContent();
    await host
      .getByRole('combobox', { name: 'Playback interval', exact: true })
      .selectOption('500');
    await host.getByRole('button', { name: 'Play record', exact: true }).click();
    await page.waitForFunction(
      ({ selector, before }) =>
        document.querySelector(`${selector} nav > span`).textContent !== before,
      { selector: name === 'viewer' || name === 'browser' ? '#viewer' : '#viewer-host', before },
    );
    await host.getByRole('button', { name: 'Pause playback', exact: true }).click();
    await host.getByRole('button', { name: 'Next move', exact: true }).focus();
    await page.keyboard.press('ArrowLeft');
    check(
      (await host.locator('nav > span').textContent()) === before,
      `${name}: scoped Left failed`,
    );
    await page.keyboard.press('ArrowRight');
    const manual = await host.locator('nav > span').textContent();
    check(manual !== before, `${name}: scoped Right failed`);
    await host.getByRole('button', { name: 'Play record', exact: true }).click();
    const unmount = page.locator('#toggle');
    await unmount.click();
    await page.waitForTimeout(600);
    await unmount.click();
    await host.getByRole('button', { name: 'Play record', exact: true }).waitFor();
    check(
      (await host.locator('nav > span').textContent()) === manual,
      `${name}: unmount retained playback or lost controller state`,
    );
  }
  await page.goto(`${origin}/viewer/`);
  const direct = await page.evaluate(async () => {
    const { RecordController, mountViewer } = await import('/sdk/index.js');
    const controller = new RecordController({ sgf: '(;SZ[9];B[aa];W[bb])' });
    const container = document.createElement('div');
    document.body.append(container);
    const view = mountViewer(container, { controller, playback: { intervalMs: 500 } });
    const result = { initial: view.playback.getState().intervalMs };
    view.update({ playback: { intervalMs: 5000 } });
    result.updated = view.playback.getState().intervalMs;
    try {
      view.update({ playback: { intervalMs: 499 } });
    } catch {
      result.rejected = true;
    }
    result.retained = view.playback.getState().intervalMs;
    view.playback.setInterval(500);
    view.playback.play();
    view.dispose();
    view.dispose();
    await new Promise((resolve) => setTimeout(resolve, 600));
    result.move = controller.getState().position.moveNumber;
    result.borrowed = controller.next().ok;
    controller.dispose();
    container.remove();
    return result;
  });
  check(
    direct.initial === 500 &&
      direct.updated === 5000 &&
      direct.retained === 5000 &&
      direct.rejected &&
      direct.move === 0 &&
      direct.borrowed,
    'Viewer public playback/update/disposal contract failed',
  );
  check(errors.length === 0, `Playback errors: ${errors.join('; ')}`);
  await page.goto(`${origin}/studio/`);
  return 'banora-playback-complete: studio viewer react vue svelte browser';
};

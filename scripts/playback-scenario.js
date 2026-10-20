// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page, studioControl) => {
  const origin = new URL(page.url()).origin,
    errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const waitFor = async (step, predicate, argument) => {
    try {
      await page.waitForFunction(predicate, argument);
    } catch (error) {
      const observed = await page
        .evaluate(() => ({
          move: document.querySelector('#move')?.dataset.uiText ?? null,
          dirty: document.querySelector('#dirty')?.dataset.uiText ?? null,
          commentLength: document.querySelector('#comment')?.value.length ?? null,
          focused: document.activeElement?.id ?? null,
          modal: document.querySelector('dialog:modal')?.id ?? null,
          visibility: document.visibilityState,
        }))
        .catch(() => ({ unavailable: true }));
      throw Error(`Playback step "${step}" failed (${error.name}): ${JSON.stringify(observed)}`);
    }
  };
  // Original fixture with long recorded pass sequence and analysis-like comments; no downloaded game is committed.
  const sgf =
    '(;FF[4]GM[1]CA[UTF-8]SZ[19]GN[Long replay fixture]PB[Engine Black]PW[Engine White]XX[retain];B[dd]C[0.47 0.53 -0.5 v=1015];W[pp]' +
    ';B[];W[]'.repeat(80) +
    ')';
  await page.goto(`${origin}/studio/`);
  await page.locator('#language').selectOption('en');
  const numbered =
    '(;SZ[9]GN[Numbered branches]AB[cc];B[aa];C[Note]N[Review](;W[]MN[23];B[bb])(;AW[dd];W[ee]))';
  const expectedLabels = [
    '0 · Start position',
    '1 · Black A9',
    '1 · Review',
    '23 · White pass',
    '24 · Black B8',
    '1 · Annotation',
    '2 · White E5',
  ];
  await page.locator('#file').setInputFiles({
    name: 'numbered.sgf',
    mimeType: 'application/x-go-sgf',
    buffer: Buffer.from(numbered),
  });
  await page.locator('#game-name').filter({ hasText: 'Numbered branches' }).waitFor();
  check(
    JSON.stringify(await page.locator('#tree button').allTextContents()) ===
      JSON.stringify(
        expectedLabels
          .filter((label) => !['24 · Black B8', '2 · White E5'].includes(label))
          .map((label) => (label === '1 · Annotation' ? '1 · White stones (setup) D6' : label)),
      ),
    `Studio branch/pass/setup/annotation/MN numbering failed: ${await page.locator('#tree button').allTextContents()}`,
  );
  await page.getByRole('button', { name: '23 · White pass', exact: true }).click();
  await page.getByRole('button', { name: '24 · Black B8', exact: true }).click();
  check(
    (await page.locator('#move').textContent()) === 'Move 24',
    'Studio row number disagrees with navigation',
  );
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
  await waitFor(
    'Studio starts replay',
    () => document.querySelector('#move').textContent !== 'Move 0',
  );
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
  await waitFor(
    'interval change reaches first move',
    () => document.querySelector('#move').textContent === 'Move 1',
  );
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
    (await page.locator('#tree button[aria-current="true"]').textContent()) === '162 · White pass',
    'Long-record tree number failed',
  );
  check(
    (await move()) === 'Move 162' &&
      (await page.getByRole('button', { name: 'Play record', exact: true }).isDisabled()),
    'Long-record leaf failed to disable playback',
  );
  await page.getByRole('button', { name: 'Previous move', exact: true }).click();
  await page.getByRole('button', { name: 'Play record', exact: true }).click();
  await waitFor(
    'replay reaches leaf',
    () => document.querySelector('#move').textContent === 'Move 162',
  );
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
  await page.locator('#comment').blur();
  await page.getByRole('button', { name: 'Play record', exact: true }).click();
  await studioControl(page, '#sample', 'record', async () => {
    await page.getByRole('button', { name: 'Example game', exact: true }).focus();
    await page.keyboard.press('Enter');
  });
  await page.locator('#unsaved[open]').waitFor();
  check(
    await page.getByRole('button', { name: 'Play record', exact: true }).isVisible(),
    'Keyboard-opened modal failed to pause playback',
  );
  await page.waitForTimeout(600);
  check((await move()) === 'Move 0', 'Replay advanced behind the modal');
  await page.keyboard.press('ArrowRight');
  check((await move()) === 'Move 0', 'Dialog key navigated behind the dialog');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  check(
    await page.getByRole('button', { name: 'Play record', exact: true }).isVisible(),
    'Cancelling a modal resumed playback',
  );
  // Deliver native close after the next editing target acquired focus.
  await studioControl(page, '#sample', 'record', async () => {
    await page.getByRole('button', { name: 'Example game', exact: true }).focus();
    await page.keyboard.press('Enter');
  });
  await page.locator('#unsaved[open]').waitFor();
  const focusAfterClose = await page.evaluate(async () => {
    const dialog = document.querySelector('#unsaved');
    const comment = document.querySelector('#comment');
    const closed = new Promise((resolve) =>
      dialog.addEventListener(
        'close',
        () => {
          requestAnimationFrame(() => resolve(document.activeElement === comment));
        },
        { once: true },
      ),
    );
    dialog.close('cancel');
    comment.focus();
    comment.select();
    return closed;
  });
  check(focusAfterClose, 'Confirmation close stole focus from the next comment edit');
  await page.keyboard.press('Backspace');
  check(
    (await page.locator('#comment').inputValue()) === '',
    'Comment deletion missed its editing target',
  );
  await page.locator('#comment').blur();
  await waitFor(
    'clearing comment restores clean state',
    () => document.querySelector('#dirty').textContent === 'No changes',
  );
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
    await waitFor(
      `${name} starts replay`,
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
  const numbering = await page.evaluate(
    async ({ numbered, expectedLabels }) => {
      const { RecordController, mountViewer } = await import('/sdk/index.js');
      const controller = new RecordController({ sgf: numbered });
      const container = document.createElement('div');
      document.body.append(container);
      const view = mountViewer(container, { controller });
      const rows = [...container.querySelectorAll('[data-tree] button')];
      if (JSON.stringify(rows.map((row) => row.textContent)) !== JSON.stringify(expectedLabels))
        throw Error('Viewer numbered rows differ');
      for (const row of rows) {
        container.querySelector(`[data-node="${row.dataset.node}"]`).click();
        const selected = container.querySelector('[data-tree] button[aria-current="true"]');
        if (
          selected.textContent !==
            `${controller.getState().position.moveNumber} · ${row.textContent.split(' · ')[1]}` ||
          selected.getAttribute('aria-label') !== `Select ${selected.textContent}`
        )
          throw Error('Viewer navigation/accessible number differs');
      }
      controller.loadSgf('(;SZ[9]' + ';B[];W[]'.repeat(251) + ')');
      let node = controller.getState().node;
      while (node.children[0]) node = node.children[0];
      controller.goTo(node.id);
      if (
        container.querySelector('[data-tree] button[aria-current="true"]').textContent !==
        '502 · White pass'
      )
        throw Error('Selected row beyond display limit lost number');
      view.dispose();
      controller.dispose();
      container.remove();
      return true;
    },
    { numbered, expectedLabels },
  );
  check(numbering, 'Viewer tree numbering failed');
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
    // Host-owned modals can live outside the Viewer's declared input scope.
    const dialog = document.createElement('dialog');
    const cancel = document.createElement('button');
    cancel.textContent = 'Host confirmation';
    dialog.append(cancel);
    document.body.append(dialog);
    dialog.showModal();
    result.modalPaused = !view.playback.getState().playing;
    await new Promise((resolve) => setTimeout(resolve, 600));
    result.modalMove = controller.getState().position.moveNumber;
    dialog.close();
    dialog.remove();
    result.stillPaused = !view.playback.getState().playing;
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
      direct.modalPaused &&
      direct.modalMove === 0 &&
      direct.stillPaused &&
      direct.move === 0 &&
      direct.borrowed,
    'Viewer public playback/update/disposal contract failed',
  );
  check(errors.length === 0, `Playback errors: ${errors.join('; ')}`);
  await page.goto(`${origin}/studio/`);
  return 'banora-playback-complete: studio viewer react vue svelte browser';
};

// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const origin = new URL(page.url()).origin,
    errors = [];
  const onError = (error) => errors.push(String(error));
  page.on('pageerror', onError);
  try {
    await page.goto(`${origin}/readonly/`);
    for (const ko of ['none', 'simple', 'positional-superko', 'situational-superko']) {
      await page.evaluate(async (ko) => {
        const {
          RecordController,
          mountViewer,
          createBoardLabels,
          formatUiFailure,
          formatUiMessage,
        } = await import('/sdk/index.js');
        const host = document.createElement('section');
        host.id = 'rules-fixture';
        host.style.width = '460px';
        document.body.append(host);
        const model = new RecordController({
          sgf: '(;SZ[5]GN[Repetition fixture]AW[bb][ac][cc][bd]AB[ab][ba][cb]XX[retain];B[bc];W[];B[])',
          rules: { ko },
        });
        for (let i = 0; i < 3; i++) model.next();
        let events = 0;
        const unsubscribe = model.subscribe(() => events++);
        const view = mountViewer(host, {
          controller: model,
          editable: true,
          board: { placementAnimation: true },
        });
        window.__rulesFixture = {
          model,
          view,
          host,
          unsubscribe,
          before: model.getState(),
          events: () => events,
          expectedRejection: formatUiMessage(createBoardLabels().moveRejected, {
            reason: formatUiFailure('superko'),
          }),
        };
      }, ko);
      const svg = page.locator('#rules-fixture svg[role="application"]');
      await svg.focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      const legal = ko === 'none' || ko === 'simple';
      await page.evaluate(
        ({ ko, legal }) => {
          const { model, host, before, events, view, expectedRejection } = window.__rulesFixture,
            state = model.getState();
          if (state.position.rules.ko !== ko) throw Error('Mounted policy diverged');
          if (legal) {
            if (
              state.position.moveNumber !== 4 ||
              !state.dirty ||
              state.position.board[6] !== 'white'
            )
              throw Error('Mounted simple/pass recapture failed');
          } else {
            if (
              state !== before ||
              events() !== 1 ||
              state.dirty ||
              host.querySelector('[aria-live="polite"]').textContent !== expectedRejection
            )
              throw Error('Mounted rejection changed record/events or lost announcement');
            const diagram = view.exportSvg({ width: 320 });
            if (
              diagram.includes('data-placement-animation') ||
              model.getState() !== before ||
              host.querySelector('svg').getAnimations({ subtree: true }).length
            )
              throw Error('Rejected repetition started motion or changed diagram/state');
            if (
              !model.setSetup([], 'white').ok ||
              model.getState().position.repetitionHistory.size !== 1
            )
              throw Error('Mounted setup epoch failed');
          }
        },
        { ko, legal },
      );
      if (!legal) {
        await svg.focus();
        await page.keyboard.press('Enter');
        await page.evaluate(() => {
          const state = window.__rulesFixture.model.getState();
          if (state.position.board[6] !== 'white' || !state.dirty)
            throw Error('Setup epoch failed to permit new recapture');
        });
      }
      await page.screenshot({ path: `output/playwright/${ko}-rules.png`, fullPage: true });
      await page.evaluate(() => {
        const { model, view, host, unsubscribe } = window.__rulesFixture;
        unsubscribe();
        const before = model.getState();
        view.dispose();
        if (host.querySelector('svg') || model.getState() !== before)
          throw Error('Rules view disposal damaged borrowed controller');
        model.dispose();
        host.remove();
        delete window.__rulesFixture;
      });
    }
    await page.evaluate(async () => {
      const { RecordController, mountViewer } = await import('/sdk/index.js');
      const host = document.createElement('div');
      host.id = 'rules-recorded';
      document.body.append(host);
      const model = new RecordController({
        sgf: '(;SZ[5]AW[bb][ac][cc][bd]AB[ab][ba][cb];B[bc];W[];B[];W[bb])',
        rules: { ko: 'situational-superko' },
      });
      for (let i = 0; i < 3; i++) model.next();
      const view = mountViewer(host, { controller: model, editable: true });
      window.__recordedRules = { model, view, host };
    });
    await page
      .locator('#rules-recorded')
      .getByRole('button', { name: 'Next move', exact: true })
      .click();
    await page.evaluate(() => {
      const { model, view, host } = window.__recordedRules,
        result = model.play({ x: 1, y: 2 });
      if (
        model.getState().position.moveNumber !== 4 ||
        model.getState().dirty ||
        result.ok ||
        result.reason !== 'superko'
      )
        throw Error('Recorded navigation or subsequent legality diverged');
      view.dispose();
      model.dispose();
      host.remove();
      delete window.__recordedRules;
    });
    if (errors.length) throw Error(errors.join('; '));
    return 'banora-rules-complete';
  } finally {
    page.off('pageerror', onError);
  }
};

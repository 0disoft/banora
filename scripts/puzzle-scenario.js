// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const origin = new URL(page.url()).origin,
    errors = [],
    external = [];
  const onError = (error) => errors.push(String(error)),
    onRequest = (request) => {
      if (new URL(request.url()).origin !== origin) external.push(request.url());
    };
  page.on('pageerror', onError);
  page.on('request', onRequest);
  const verify = (value, message) => {
    if (!value) throw Error(message);
  };
  async function answer(target, x, y, touch = false) {
    const svg = target.locator('#puzzle-host [data-puzzle-board] svg');
    await svg.scrollIntoViewIfNeeded();
    const screen = await svg.evaluate(
      (svg, { x, y }) => {
        const point = svg.createSVGPoint();
        point.x = x + 1.25;
        point.y = y + 1.25;
        const shown = point.matrixTransform(svg.getScreenCTM());
        return { x: shown.x, y: shown.y };
      },
      { x, y },
    );
    if (touch) await target.touchscreen.tap(screen.x, screen.y);
    else await target.mouse.click(screen.x, screen.y);
  }
  let mobileContext;
  try {
    await page.goto(`${origin}/puzzle/`);
    const board = page.locator('#puzzle-host svg');
    await board.waitFor();
    verify(
      (await board.locator('[data-stone]').count()) === 4 &&
        (await page.locator('#state').innerText()).startsWith('active · 0 attempts'),
      'Initial puzzle context incorrect',
    );
    await answer(page, 4, 0);
    verify(
      (await page.locator('[data-puzzle-feedback]').innerText()).includes(
        'outside the authored answer tree',
      ) && (await board.locator('[data-stone]').count()) === 4,
      'Unlisted trial changed board or was presented as a proven wrong move',
    );
    const stateBefore = await page.locator('#state').innerText();
    await answer(page, 1, 1);
    verify(
      (await page.locator('#state').innerText()) === stateBefore &&
        (await page.locator('[data-puzzle-feedback]').innerText()).includes('occupied'),
      'Illegal puzzle input counted/notified',
    );
    await page.getByRole('button', { name: 'Restart puzzle', exact: true }).click();
    await answer(page, 3, 3);
    verify(
      (await page.locator('.banora-puzzle').getAttribute('data-puzzle-status')) === 'incorrect' &&
        (await board.locator('[data-stone="3,3"]').count()) === 1,
      'Authored incorrect branch did not retain its own diagram',
    );
    verify(
      await page.getByRole('button', { name: 'Pass', exact: true }).isDisabled(),
      'Finished puzzle allowed another move',
    );
    await page.getByRole('button', { name: 'Restart puzzle', exact: true }).click();
    const hint = page.getByRole('button', { name: 'Reveal next hint', exact: true });
    await hint.click();
    await hint.click();
    verify(
      (await hint.isDisabled()) &&
        (await page
          .getByRole('list', { name: 'Revealed puzzle hints' })
          .getByRole('listitem')
          .count()) === 2,
      'Hint exhaustion/reveal count failed',
    );
    verify(
      (await board.locator('[data-marker="1,2"]').count()) === 1,
      'Revealed logical hint marker missing',
    );
    await board.focus();
    for (const key of [
      'ArrowUp',
      'ArrowUp',
      'ArrowUp',
      'ArrowUp',
      'ArrowLeft',
      'ArrowLeft',
      'ArrowLeft',
      'ArrowLeft',
      'ArrowRight',
      'ArrowDown',
      'ArrowDown',
    ])
      await page.keyboard.press(key);
    await page.keyboard.press('Enter');
    verify(
      (await board.locator('[data-stone="1,1"]').count()) === 0 &&
        (await board.locator('[data-stone="1,2"]').count()) === 1 &&
        (await board.locator('[data-stone="4,4"]').count()) === 1,
      'Keyboard capture/authored response diverged from headless session',
    );
    verify(
      await board.evaluate((svg) => document.activeElement === svg),
      'Puzzle redraw lost keyboard focus',
    );
    verify(
      !(await hint.isDisabled()) &&
        (await page.getByRole('list', { name: 'Revealed puzzle hints' }).count()) === 0,
      'New node retained old hints',
    );
    const retained = await page.locator('#state').innerText();
    await page.locator('#toggle').click();
    verify((await page.locator('svg').count()) === 0, 'Puzzle unmount leaked drawing');
    await page.locator('#toggle').click();
    verify(
      (await page.locator('#state').innerText()) === retained &&
        (await board.locator('[data-stone]').count()) === 5,
      'Borrowed-session remount lost progress',
    );
    await hint.click();
    await answer(page, 1, 3);
    verify(
      (await page.locator('.banora-puzzle').getAttribute('data-puzzle-status')) === 'correct' &&
        (await board.locator('[data-stone]').count()) === 6,
      'Multi-step authored solution failed',
    );
    const beforeTheme = await page.locator('#state').innerText();
    await page.locator('#theme').selectOption('flat');
    verify(
      (await page.locator('#state').innerText()) === beforeTheme,
      'Theme changed puzzle state',
    );
    const saved = page.waitForEvent('download');
    await page.locator('#svg').click();
    await (await saved).saveAs('output/playwright/puzzle.svg');
    await page.screenshot({ path: 'output/playwright/puzzle-complete.png', fullPage: true });
    await page.locator('#puzzle').selectOption('1');
    await page.getByRole('button', { name: 'Pass', exact: true }).click();
    verify(
      (await page.locator('.banora-puzzle').getAttribute('data-puzzle-status')) === 'correct' &&
        (await page.locator('[data-puzzle-progress]').innerText()).includes('2 played moves'),
      'Authored pass response failed',
    );
    // Additional ownership/update cases consume public built exports on a separate fixture.
    await page.evaluate(async () => {
      const { PuzzleSession } = await import('/sdk/puzzle.js'),
        { mountPuzzle } = await import('/sdk/puzzle-view.js');
      const definition = {
        schemaVersion: 'banora.puzzle/v1',
        id: 'public',
        title: 'Title <b> stays text',
        prompt: 'Prompt <img> stays text',
        sgf: '(;SZ[3])',
        tree: {
          id: 'root',
          hints: [{ text: 'Hint <script> stays text', point: { x: 0, y: 0 } }],
          children: [
            {
              id: 'end',
              move: { x: 2, y: 2 },
              result: 'correct',
              feedback: 'Solved <em> stays text',
            },
          ],
        },
      };
      const host = document.createElement('div');
      host.id = 'public-puzzle';
      document.body.append(host);
      const session = new PuzzleSession(definition),
        counts = { first: 0, second: 0 };
      const view = mountPuzzle(host, { session, onEvent: () => counts.first++ });
      const before = session.getState(),
        diagram = view.exportSvg();
      try {
        view.update({ board: { crop: { x: 0, y: 0, width: 999, height: 3 } } });
        throw Error('Invalid crop accepted');
      } catch (error) {
        if (!/crop/i.test(String(error)) || String(error).includes('Invalid crop accepted'))
          throw error;
      }
      if (view.exportSvg() !== diagram || session.getState() !== before)
        throw Error('Rejected view update changed session/presentation');
      view.update({ board: { coordinates: false, theme: 'flat' }, onEvent: () => counts.second++ });
      if (host.querySelector('svg text')) throw Error('Updated coordinates ignored');
      session.requestHint();
      if (counts.first !== 0 || counts.second !== 1 || host.querySelector('script,img,b'))
        throw Error('Callback update or safe authored text failed');
      view.dispose();
      session.restart();
      if (counts.second !== 1 || host.children.length)
        throw Error('Disposed borrowed view retained callbacks/DOM');
      if (session.getState().status !== 'active')
        throw Error('Disposed borrowed view killed its session');
      const remounted = mountPuzzle(host, { session });
      session.play({ x: 2, y: 2 });
      if (host.querySelector('em') || !host.textContent.includes('Solved <em> stays text'))
        throw Error('Terminal feedback became HTML');
      remounted.dispose();
      session.dispose();
      const owned = mountPuzzle(host, { definition });
      const ownedSession = owned.session;
      owned.dispose();
      owned.dispose();
      if (ownedSession.restart().reason !== 'disposed')
        throw Error('Owned view retained its session');
      try {
        owned.exportSvg();
        throw Error('Disposed export accepted');
      } catch (error) {
        if (String(error).includes('Disposed export accepted')) throw error;
      }
      await owned.exportPng().then(
        () => {
          throw Error('Disposed PNG accepted');
        },
        () => {},
      );
      const borrowed = new PuzzleSession(definition);
      try {
        mountPuzzle(host, {
          session: borrowed,
          board: { crop: { x: 0, y: 0, width: 999, height: 3 } },
        });
        throw Error('Invalid mount accepted');
      } catch (error) {
        if (!/crop/i.test(String(error))) throw error;
      }
      if (host.children.length || borrowed.getState().status !== 'active')
        throw Error('Failed mount leaked DOM or disposed borrowed session');
      borrowed.dispose();
      host.remove();
    });
    mobileContext = await page
      .context()
      .browser()
      .newContext({
        locale: 'en-US',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      });
    const mobile = await mobileContext.newPage();
    mobile.on('pageerror', onError);
    mobile.on('request', onRequest);
    await mobile.goto(`${origin}/puzzle/`);
    await mobile.getByRole('button', { name: 'Reveal next hint', exact: true }).click();
    await answer(mobile, 1, 2, true);
    await answer(mobile, 1, 3, true);
    verify(
      (await mobile.locator('.banora-puzzle').getAttribute('data-puzzle-status')) === 'correct',
      'Mobile touch did not solve the authored continuation',
    );
    verify(
      await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      'Puzzle overflows mobile viewport',
    );
    await mobile.screenshot({ path: 'output/playwright/puzzle-mobile.png', fullPage: true });
    await mobile.locator('#toggle').click();
    verify((await mobile.locator('svg').count()) === 0, 'Mobile puzzle disposal leaked drawing');
    verify(
      errors.length === 0 && external.length === 0,
      `Puzzle errors/remote requests: ${[...errors, ...external].join('; ')}`,
    );
    return 'banora-puzzle-complete';
  } finally {
    await mobileContext?.close();
    page.off('pageerror', onError);
    page.off('request', onRequest);
  }
};

// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const origin = new URL(page.url()).origin;
  const failures = [];
  page.on('pageerror', (error) => failures.push(error.message));
  const routes = [
    ['vanilla', 'index'],
    ['react', 'react'],
    ['vue', 'vue'],
    ['svelte', 'svelte'],
  ];
  const assert = (value, message) => {
    if (!value) throw new Error(message);
  };
  const settle = (target) =>
    target.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
    );
  const board = (target) => target.locator('#board-root svg[role="application"]');
  const clickPoint = async (target, point = { x: 2, y: 1 }) => {
    await board(target).scrollIntoViewIfNeeded();
    const screen = await board(target).evaluate((svg, logical) => {
      const vector = svg.createSVGPoint();
      vector.x = logical.x + 1.25;
      vector.y = logical.y + 1.25;
      const screen = vector.matrixTransform(svg.getScreenCTM());
      return { x: screen.x, y: screen.y };
    }, point);
    await target.mouse.click(screen.x, screen.y);
    await settle(target);
  };
  const read = async (target) => ({
    key: await target.locator('#state-key').textContent(),
    pending: await target.locator('#pending').textContent(),
    stones: await target.locator('#board-root [data-stone]').count(),
  });
  for (const [name, route] of routes) {
    await page.goto(`${origin}/controlled/${route}.html`);
    await board(page).waitFor();
    await settle(page);
    assert((await board(page).count()) === 1, `${name}: duplicate initial surfaces`);
    const initial = await read(page);
    await clickPoint(page);
    const queued = await read(page),
      intent = JSON.parse(queued.pending);
    assert(
      intent.type === 'point' &&
        intent.point.x === 2 &&
        intent.point.y === 1 &&
        intent.stateKey === initial.key,
      `${name}: wrong logical point/key`,
    );
    assert(
      queued.key === initial.key && queued.stones === initial.stones,
      `${name}: input changed host state before approval`,
    );
    await page.locator('#reject').click();
    await settle(page);
    const rejected = await read(page);
    assert(
      rejected.pending === 'none' &&
        rejected.key === initial.key &&
        rejected.stones === initial.stones,
      `${name}: rejection changed state`,
    );
    await clickPoint(page);
    await page.locator('#replace').click();
    await settle(page);
    const replaced = await read(page);
    assert(
      replaced.key !== initial.key && JSON.parse(replaced.pending).stateKey === initial.key,
      `${name}: lost stale intention identity`,
    );
    await page.locator('#approve').click();
    await settle(page);
    assert(
      (await page.locator('#message').textContent()).includes('stale state key'),
      `${name}: host accepted stale intention`,
    );
    assert(
      (await read(page)).key === replaced.key,
      `${name}: stale approval changed the new position`,
    );
    await page.locator('#toggle-callback').click();
    await settle(page);
    await clickPoint(page);
    assert(
      (await page.locator('#callback').textContent()) === 'B',
      `${name}: retained stale callback`,
    );
    await page.locator('#approve').click();
    await settle(page);
    const accepted = await read(page);
    assert(
      accepted.key !== replaced.key &&
        accepted.stones === initial.stones + 1 &&
        accepted.pending === 'none',
      `${name}: approved snapshot did not render`,
    );
    await page.locator('#toggle-readonly').click();
    await settle(page);
    await clickPoint(page, { x: 1, y: 1 });
    assert((await read(page)).pending === 'none', `${name}: read-only input emitted an intention`);
    await page.locator('#toggle-readonly').click();
    await settle(page);
    await page.locator('#toggle-mount').click();
    await settle(page);
    assert(
      (await board(page).count()) === 0 && (await page.locator('[data-touch-lens]').count()) === 0,
      `${name}: unmount leaked a surface or lens`,
    );
    await page.locator('#toggle-mount').click();
    await board(page).waitFor();
    await settle(page);
    const remounted = await read(page);
    assert(
      remounted.key === accepted.key &&
        remounted.stones === accepted.stones &&
        (await board(page).count()) === 1,
      `${name}: remount reset host state or duplicated the board`,
    );
    await clickPoint(page, { x: 1, y: 1 });
    assert(
      (await page.locator('#callback').textContent()) === 'B',
      `${name}: remounted callback reverted`,
    );
    await page.locator('#reject').click();
    await settle(page);
    for (const extension of ['svg', 'png']) {
      const waiting = page.waitForEvent('download');
      await page.locator(`#${extension}-export`).click();
      const download = await waiting;
      await download.saveAs(`output/playwright/controlled-${name}.${extension}`);
      assert((await download.failure()) === null, `${name}: failed ${extension} download`);
    }
    await page.screenshot({
      path: `output/playwright/controlled-${name}-page.png`,
      fullPage: true,
    });
  }
  const context = await page
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
    const mobile = await context.newPage();
    mobile.on('pageerror', (error) => failures.push(error.message));
    const cdp = await context.newCDPSession(mobile);
    const touch = (type, point) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: point ? [{ x: point.x, y: point.y, id: 1 }] : [],
      });
    const select = async () => {
      await board(mobile).scrollIntoViewIfNeeded();
      const screen = await board(mobile).evaluate((svg) => {
        const vector = svg.createSVGPoint();
        vector.x = 3.25;
        vector.y = 2.25;
        const screen = vector.matrixTransform(svg.getScreenCTM());
        return { x: screen.x, y: screen.y };
      });
      await touch('touchStart', screen);
      await touch('touchEnd');
      await mobile.getByRole('button', { name: 'Send intention', exact: true }).waitFor();
    };
    for (const [name, route] of routes) {
      await mobile.goto(`${origin}/controlled/${route}.html`);
      await board(mobile).waitFor();
      await settle(mobile);
      await mobile.locator('#toggle-confirm').click();
      await settle(mobile);
      const initial = await read(mobile);
      await select();
      assert((await read(mobile)).pending === 'none', `${name}: touch bypassed confirmation`);
      await mobile.locator('#replace').click();
      await settle(mobile);
      assert(
        (await mobile.getByRole('button', { name: 'Send intention', exact: true }).isVisible()) ===
          false,
        `${name}: replacement retained stale touch confirmation`,
      );
      await select();
      await mobile.getByRole('button', { name: 'Send intention', exact: true }).click();
      await settle(mobile);
      const pending = await read(mobile);
      assert(
        JSON.parse(pending.pending).stateKey === pending.key && pending.stones === initial.stones,
        `${name}: confirmed touch changed state or used stale key`,
      );
      await mobile.locator('#approve').click();
      await settle(mobile);
      assert(
        (await read(mobile)).stones === initial.stones + 1,
        `${name}: host touch approval did not render`,
      );
      if (name === 'svelte')
        await mobile.screenshot({
          path: 'output/playwright/controlled-svelte-mobile.png',
          fullPage: true,
        });
      await mobile.locator('#toggle-mount').click();
      await settle(mobile);
      assert(
        (await mobile.locator('[data-touch-lens]').count()) === 0,
        `${name}: mobile unmount leaked a lens`,
      );
    }
  } finally {
    await context.close();
  }
  assert(failures.length === 0, `Controlled consumer page errors: ${failures.join('; ')}`);
  return 'banora-controlled-consumers-complete: vanilla react vue svelte';
};

// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const origin = new URL(page.url()).origin,
    errors = [],
    requests = [];
  page.on('pageerror', (error) => errors.push(String(error)));
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin)
      requests.push(request.url());
  });
  const verify = (value, message) => {
    if (!value) throw Error(message);
  };
  const wait = (predicate) => page.waitForFunction(predicate, undefined, { timeout: 10_000 });
  for (const name of ['studio', 'react', 'vue', 'svelte']) {
    const studio = name === 'studio';
    await page.goto(`${origin}/${name}/`);
    await page.locator('[data-texture-file="black"]').waitFor();
    for (let i = 0; i < 3; i++) await page.locator(studio ? '#next' : '#advance').click();
    const notes = studio
      ? page.locator('#comment')
      : page.locator('#viewer-host').getByRole('textbox', { name: 'Position comments' });
    await notes.fill('Texture changes must retain these SGF edits.');
    await notes.blur();
    const main = page.locator(studio ? '#board svg' : '#board-host svg'),
      state = page.locator(studio ? '#move' : '#state');
    const before = await state.innerText(),
      events = studio ? '' : await page.locator('#events').innerText();
    const base64 = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const context = canvas.getContext('2d');
      context.fillStyle = '#123456';
      context.fillRect(0, 0, 64, 64);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    const file = {
      name: 'local-blue.png',
      mimeType: 'image/png',
      buffer: Buffer.from(base64, 'base64'),
    };
    await page.locator('[data-texture-file="black"]').setInputFiles(file);
    await wait(() =>
      document
        .querySelector('[data-texture-status="black"]')
        .textContent.startsWith('Custom texture active'),
    );
    await page.locator('[data-texture-demo="white"]').click();
    await wait(() =>
      document
        .querySelector('[data-texture-status="white"]')
        .textContent.startsWith('Custom texture active'),
    );
    // Preparation status precedes committed React/Vue/Svelte adapter effects.
    // Wait for the actual public surfaces, retaining all forwarding assertions below.
    await page.waitForFunction(
      (studio) => {
        const main = document.querySelector(studio ? '#board svg' : '#board-host svg');
        return (
          main.querySelectorAll('[data-texture="black"]').length === 2 &&
          main.querySelectorAll('[data-texture="white"]').length === 1 &&
          (studio ||
            (document.querySelectorAll('#viewer-host [data-texture]').length === 3 &&
              document.querySelectorAll('#owned-board pattern image').length === 2))
        );
      },
      studio,
      { timeout: 10_000 },
    );
    const uploaded = await main.locator('pattern').first().locator('image').getAttribute('href');
    verify(
      (await main.locator('[data-texture="black"]').count()) === 2 &&
        (await main.locator('[data-texture="white"]').count()) === 1,
      `${name}: native texture props not forwarded`,
    );
    if (!studio) {
      verify(
        (await page.locator('#viewer-host [data-texture]').count()) === 3 &&
          (await page.locator('#owned-board pattern image').count()) === 2,
        `${name}: Viewer/owned appearance diverged`,
      );
      verify(
        (await page.locator('#events').innerText()) === events,
        `${name}: texture option emitted a record command`,
      );
    }
    verify(
      (await state.innerText()) === before &&
        (await notes.inputValue()) === 'Texture changes must retain these SGF edits.',
      `${name}: texture changed record state`,
    );
    await page.locator('#compare').click();
    const comparison = page.locator(studio ? '#comparison-board' : '#comparison-host');
    await wait(
      () =>
        document.querySelectorAll(
          '#comparison-board [data-texture],#comparison-host [data-texture]',
        ).length > 0,
    );
    verify(
      (await comparison.locator('pattern image').count()) === 4,
      `${name}: comparison dropped shared textures`,
    );
    if (studio) {
      await page.locator('#rotation').selectOption('90');
      await page.locator('#flip-x').check();
      await page.locator('#theme').selectOption('flat');
    } else {
      await page.locator('#rotate').click();
      await page.locator('#reflect').click();
      await page.locator('#theme').click();
    }
    await wait(
      () => document.querySelector('#board svg,#board-host svg').dataset.rotation === '90',
    );
    verify(
      (await main.locator('[data-texture]').count()) === 3 && (await state.innerText()) === before,
      `${name}: presentation update lost textures or record`,
    );
    for (const format of ['png', 'svg']) {
      const saved = page.waitForEvent('download');
      await page.locator(studio ? `#${format}-export` : `#${format}`).click();
      const download = await saved;
      await download.saveAs(`output/playwright/${name}-texture.${format}`);
    }
    verify(
      (await state.innerText()) === before &&
        (studio
          ? (await page.locator('#dirty').innerText()).includes('Unsaved')
          : before.includes('changed')),
      `${name}: texture diagram acknowledged SGF`,
    );
    const beforeBad = await main.evaluate((svg) => svg.outerHTML);
    await page
      .locator('[data-texture-file="black"]')
      .setInputFiles({ name: 'spoof.png', mimeType: 'image/png', buffer: Buffer.from('<svg/>') });
    await wait(() =>
      document
        .querySelector('[data-texture-status="black"]')
        .textContent.startsWith('Texture unchanged:'),
    );
    verify(
      (await main.evaluate((svg) => svg.outerHTML)) === beforeBad,
      `${name}: bad file reset the current texture`,
    );
    await page.locator('[data-texture-reset="white"]').click();
    await wait(() => document.querySelectorAll('[data-texture="white"]').length === 0);
    verify(
      (await main.locator('[data-texture="black"]').count()) === 2 &&
        (await comparison.locator('pattern image').count()) === 2,
      `${name}: independent texture reset failed`,
    );
    // Hold a real selected file read to exercise cancellation after asynchronous work began.
    const stall = async () =>
      page.evaluate(() => {
        const read = Blob.prototype.arrayBuffer;
        window.__textureRead = { read, held: [] };
        Blob.prototype.arrayBuffer = function () {
          if (this.type === 'image/png')
            return new Promise((resolve) =>
              window.__textureRead.held.push({ blob: this, resolve }),
            );
          return read.call(this);
        };
      });
    const release = async () =>
      page.evaluate(async () => {
        const pending = window.__textureRead;
        Blob.prototype.arrayBuffer = pending.read;
        for (const item of pending.held) item.resolve(await pending.read.call(item.blob));
        await Promise.resolve();
        delete window.__textureRead;
      });
    await stall();
    try {
      await page.locator('[data-texture-file="black"]').setInputFiles(file);
      await wait(() => window.__textureRead.held.length === 1);
      await page.locator('[data-texture-reset="black"]').click();
      await release();
      await wait(
        () => !document.querySelector('#board svg,#board-host svg').querySelector('pattern'),
      );
      verify(
        (await main.locator('[data-texture]').count()) === 0,
        `${name}: cancelled preparation applied late`,
      );
    } finally {
      if (await page.evaluate(() => !!window.__textureRead)) await release();
    }
    await page.locator('[data-texture-file="black"]').setInputFiles(file);
    await wait(() =>
      document
        .querySelector('[data-texture-status="black"]')
        .textContent.startsWith('Custom texture active'),
    );
    if (!studio) {
      await page.locator('#swap').click();
      await wait(() => document.querySelector('#board-host svg').dataset.boardWidth === '13');
      verify(
        (await main.locator('pattern image').count()) === 1,
        `${name}: host texture did not survive controller replacement`,
      );
      await page.locator('#swap').click();
      await wait(() => document.querySelector('#board-host svg').dataset.boardWidth === '9');
      verify((await state.innerText()) === before, `${name}: controller restoration lost edits`);
      await stall();
      try {
        await page.locator('[data-texture-file="black"]').setInputFiles(file);
        await wait(() => window.__textureRead.held.length === 1);
        await page.locator('#toggle').click();
        verify(
          (await page.locator('.texture-controls').count()) === 0,
          `${name}: texture UI leaked on unmount`,
        );
        await release();
        await page.locator('#toggle').click();
        await main.waitFor();
        verify(
          (await main.locator('pattern image').getAttribute('href')) === uploaded &&
            (await state.innerText()) === before,
          `${name}: remount lost prior appearance/record or accepted disposed work`,
        );
        verify(
          (await page.locator('.texture-controls').count()) === 1,
          `${name}: duplicate texture UI after remount`,
        );
      } finally {
        if (await page.evaluate(() => !!window.__textureRead)) await release();
      }
    }
    await page.screenshot({
      path: `output/playwright/${name}-texture-controls.png`,
      fullPage: true,
    });
    if (studio) {
      const saved = page.waitForEvent('download');
      await page.locator('#export').click();
      await saved;
    }
  }
  verify(errors.length === 0, 'Texture consumer errors: ' + errors.join('; '));
  verify(requests.length === 0, 'Implicit texture requests: ' + requests.join('; '));
  return 'banora-texture-consumers-complete: studio react vue svelte';
};

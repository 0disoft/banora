// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const origin = new URL(page.url()).origin,
    requests = [];
  page.on('request', (request) => {
    if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== origin)
      requests.push(request.url());
  });
  await page.goto(`${origin}/studio/`);
  const result = await page.evaluate(async () => {
    const sdk = await import('/sdk/index.js'),
      verify = (value, message) => {
        if (!value) throw Error(message);
      };
    const host = document.createElement('div');
    host.id = 'texture-fixture';
    host.style.cssText = 'width:480px;margin:25px auto;';
    document.body.append(host);
    const source = document.createElement('canvas');
    source.width = 128;
    source.height = 64;
    const context = source.getContext('2d');
    context.fillStyle = '#123456';
    context.fillRect(0, 0, 64, 64);
    context.fillStyle = '#765432';
    context.fillRect(64, 0, 64, 64);
    const blob = await new Promise((resolve) => source.toBlob(resolve, 'image/png'));
    const black = await sdk.prepareStoneTexture(blob, { size: 64 });
    verify(
      black.width === 64 && black.height === 64 && Object.isFrozen(black),
      'PNG preparation failed',
    );
    context.fillStyle = '#efdec0';
    context.fillRect(0, 0, 128, 64);
    let white;
    for (const format of ['image/jpeg', 'image/webp']) {
      const file = await new Promise((resolve) => source.toBlob(resolve, format));
      white = await sdk.prepareStoneTexture(file, { size: 64 });
      verify(
        white.dataUrl.startsWith('data:image/png;base64,'),
        'Raster normalization failed for ' + format,
      );
    }
    const textures = { black, white };
    const controller = new sdk.RecordController({
        sgf: '(;SZ[5:9]AB[bc][de]AW[ab]LB[bc:A]XX[keep];B[ei])',
      }),
      before = controller.getState();
    const view = sdk.mountBoard(host, {
        controller,
        stoneTextures: textures,
        touch: { mode: 'confirm' },
      }),
      svg = host.querySelector('svg');
    verify(
      svg.querySelectorAll('defs image').length === 2 &&
        svg.querySelectorAll('[data-texture]').length === 3,
      'Reusable texture definitions failed',
    );
    for (const rotation of [0, 90, 180, 270])
      for (const flipX of [false, true]) {
        const transform = { rotation, flipX };
        view.update({ transform, crop: { x: 0, y: 1, width: 5, height: 7 } });
        const text = view.exportSvg({ width: 480 }),
          parsed = new DOMParser().parseFromString(text, 'image/svg+xml');
        verify(
          !parsed.querySelector('parsererror') &&
            parsed.querySelectorAll('pattern').length === 2 &&
            parsed.querySelectorAll('image').length === 2,
          'Standalone textured SVG failed',
        );
        verify(
          !text.includes('http://127.') && text.split(black.dataUrl).length === 2,
          'SVG references or image deduplication failed',
        );
        const bitmap = await createImageBitmap(await view.exportPng({ width: 480 }));
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const pixels = canvas.getContext('2d');
        pixels.drawImage(bitmap, 0, 0);
        bitmap.close();
        const box = svg.viewBox.baseVal,
          point = sdk.toDisplayPoint({ x: 3, y: 4 }, before.position, transform);
        const x = Math.floor(((point.x + 1.25 - 0.22 - box.x) / box.width) * canvas.width),
          y = Math.floor(((point.y + 1.25 - 0.22 - box.y) / box.height) * canvas.height);
        const pixel = [...pixels.getImageData(x, y, 1, 1).data];
        verify(
          pixel.join(',') === '18,52,86,255',
          `PNG texture pixels lost for ${rotation}/${flipX}: ${pixel}`,
        );
        verify(controller.getState() === before, 'Texture presentation mutated SGF state');
      }
    const html = svg.outerHTML;
    try {
      view.update({
        stoneTextures: {
          black: { dataUrl: 'https://example.test/stone.png', width: 64, height: 64 },
        },
        theme: 'flat',
      });
      throw Error('Invalid texture accepted');
    } catch (error) {
      verify(error.name === 'RangeError', 'Wrong texture validation failure');
    }
    verify(
      svg.outerHTML === html && controller.getState() === before,
      'Failed texture update was not atomic',
    );
    const pending = view.exportPng({ width: 480 });
    view.update({ stoneTextures: null });
    const captured = await createImageBitmap(await pending);
    const snapshotCanvas = document.createElement('canvas');
    snapshotCanvas.width = captured.width;
    snapshotCanvas.height = captured.height;
    const snapshotContext = snapshotCanvas.getContext('2d');
    snapshotContext.drawImage(captured, 0, 0);
    captured.close();
    const snapshotBox = svg.viewBox.baseVal,
      snapshotPoint = sdk.toDisplayPoint({ x: 3, y: 4 }, before.position, {
        rotation: 270,
        flipX: true,
      });
    const snapshotPixel = [
      ...snapshotContext.getImageData(
        Math.floor(
          ((snapshotPoint.x + 1.25 - 0.22 - snapshotBox.x) / snapshotBox.width) *
            snapshotCanvas.width,
        ),
        Math.floor(
          ((snapshotPoint.y + 1.25 - 0.22 - snapshotBox.y) / snapshotBox.height) *
            snapshotCanvas.height,
        ),
        1,
        1,
      ).data,
    ];
    verify(
      snapshotPixel.join(',') === '18,52,86,255',
      'Pending PNG lost its captured texture after later updates',
    );
    verify(
      svg.querySelectorAll('pattern,[data-texture]').length === 0 &&
        controller.getState() === before,
      'Texture reset changed state or retained definitions',
    );
    view.update({ stoneTextures: textures });
    let created = 0,
      revoked = 0;
    const makeUrl = URL.createObjectURL,
      revokeUrl = URL.revokeObjectURL;
    URL.createObjectURL = (value) => {
      created++;
      return makeUrl(value);
    };
    URL.revokeObjectURL = (value) => {
      revoked++;
      return revokeUrl(value);
    };
    try {
      const abort = new AbortController();
      let finishRead;
      const stalled = {
        size: blob.size,
        type: blob.type,
        arrayBuffer: () => new Promise((resolve) => (finishRead = resolve)),
      };
      const operation = sdk.prepareStoneTexture(stalled, { signal: abort.signal });
      abort.abort();
      let cancelled = false;
      try {
        await operation;
      } catch (error) {
        cancelled = error.name === 'AbortError';
      }
      verify(cancelled, 'Cancelled preparation did not reject');
      finishRead(await blob.arrayBuffer());
      await Promise.resolve();
      verify(created === 0, 'Cancelled source started image decoding');
      const encode = HTMLCanvasElement.prototype.toDataURL;
      try {
        HTMLCanvasElement.prototype.toDataURL = () => 'data:,';
        let rejected = false;
        try {
          await sdk.prepareStoneTexture(blob);
        } catch {
          rejected = true;
        }
        verify(rejected && created === revoked, 'Preparation failure leaked an object URL');
      } finally {
        HTMLCanvasElement.prototype.toDataURL = encode;
      }
      const prepared = await sdk.prepareStoneTexture(blob);
      verify(
        prepared.width === 256 && created === revoked,
        'Successful preparation leaked an object URL',
      );
    } finally {
      URL.createObjectURL = makeUrl;
      URL.revokeObjectURL = revokeUrl;
    }
    for (const input of [
      new Blob(['<svg xmlns="http://www.w3.org/2000/svg"/>'], { type: 'image/svg+xml' }),
      new Blob(['<svg/>'], { type: 'image/png' }),
      new Blob(['bad'], { type: 'image/jpeg' }),
      new Blob(['bad'], { type: 'image/webp' }),
      new Blob([new Uint8Array(2_097_153)], { type: 'image/png' }),
    ]) {
      let rejected = false;
      try {
        await sdk.prepareStoneTexture(input);
      } catch {
        rejected = true;
      }
      verify(rejected, 'Unsafe/invalid texture accepted');
    }
    const owned = document.createElement('div');
    host.append(owned);
    const dense = sdk.mountBoard(owned, {
      controller: new sdk.RecordController({ sgf: '(;SZ[25]AB[aa:yy])' }),
      stoneTextures: textures,
    });
    const denseText = dense.exportSvg();
    verify(
      denseText.split(black.dataUrl).length === 2 &&
        owned.querySelectorAll('[data-texture]').length === 625,
      'Texture data grew once per stone',
    );
    const denseController = dense.controller;
    dense.dispose();
    denseController.dispose();
    owned.remove();
    window.__textureFixture = { host, view, controller, before };
    return 'banora-textures-complete: SDK';
  });
  if (requests.length)
    throw Error('Textures made implicit external requests: ' + requests.join('; '));
  await page.locator('#texture-fixture svg').scrollIntoViewIfNeeded();
  const point = await page.locator('#texture-fixture [data-stone="3,4"]').evaluate((stone) => {
    const box = stone.getBoundingClientRect();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  });
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ ...point, id: 1 }],
    });
    const lens = page.locator('[data-touch-lens]').last();
    if (!(await lens.isVisible()) || (await lens.locator('pattern image').count()) !== 2)
      throw Error('Magnified touch lost embedded textures');
    const backdrop = await page.evaluate(() => ({
      lens: document.querySelector('[data-touch-lens]:last-child').style.background,
      board: getComputedStyle(document.querySelector('#texture-fixture svg > rect')).fill,
    }));
    if (backdrop.lens !== backdrop.board)
      throw Error('Texture definitions changed the magnifier backdrop');
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page
      .locator('#texture-fixture [data-touch-confirm]')
      .getByRole('button', { name: 'Cancel placement', exact: true })
      .click();
  } finally {
    await cdp.detach();
  }
  await page.locator('#texture-fixture').screenshot({ path: 'output/playwright/sdk-textures.png' });
  await page.evaluate(() => {
    const fixture = window.__textureFixture;
    fixture.view.dispose();
    if (fixture.controller.getState() !== fixture.before)
      throw Error('Texture view disposed borrowed controller');
    fixture.controller.dispose();
    fixture.host.remove();
    delete window.__textureFixture;
  });
  return result;
};

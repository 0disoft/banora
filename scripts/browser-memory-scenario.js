// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (rootPage) => {
  const origin = new URL(rootPage.url()).origin;
  const browser = rootPage.context().browser();
  const cases = [];
  const frames = (page) =>
    page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
  const verify = (condition, message) => {
    if (!condition) throw Error(message);
  };
  const measure = async (id, setup) => {
    const context = await browser.newContext({
      locale: 'en-US',
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', () => errors.push('page-error'));
    // Only local production resources and our authored workloads are allowed.
    await context.route('**/*', (route) => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      errors.push('external-request');
      return route.abort();
    });
    let cdp;
    try {
      const cycle = await setup(page);
      cdp = await context.newCDPSession(page);
      await cdp.send('Performance.enable');
      const sample = async (phase = 'released') => {
        await frames(page);
        await cdp.send('HeapProfiler.collectGarbage');
        await cdp.send('HeapProfiler.collectGarbage');
        const { metrics } = await cdp.send('Performance.getMetrics');
        const heapBytes = metrics.find((item) => item.name === 'JSHeapUsedSize')?.value;
        verify(Number.isFinite(heapBytes) && heapBytes > 0, 'Browser heap metric unavailable');
        const { documents, nodes, jsEventListeners } = await cdp.send('Memory.getDOMCounters');
        const measured = { heapBytes, documents, nodes, listeners: jsEventListeners };
        if (id.startsWith('viewer/')) {
          // Query only the public constructor's instances, never their private
          // fields. Release debugger references so the measurement cannot retain
          // the objects whose lifetime it is checking.
          const objectGroup = 'banora-memory-count';
          try {
            const prototype = await cdp.send('Runtime.evaluate', {
              expression: 'Banora.RecordController.prototype',
              objectGroup,
            });
            const queried = await cdp.send('Runtime.queryObjects', {
              prototypeObjectId: prototype.result.objectId,
              objectGroup,
            });
            const count = await cdp.send('Runtime.callFunctionOn', {
              objectId: queried.objects.objectId,
              functionDeclaration: 'function () { return this.length; }',
              returnByValue: true,
            });
            measured.controllers = count.result.value;
            // The classic example retains its own host controller throughout.
            const expected = id.includes('/borrowed/') || phase === 'active' ? 2 : 1;
            verify(
              measured.controllers === expected,
              `${id}: retained or lost controller instances`,
            );
          } finally {
            await cdp.send('Runtime.releaseObjectGroup', { objectGroup });
          }
        }
        return measured;
      };
      // Exercise the same lifecycle before measuring: module/JIT/framework caches
      // are intentionally not called leaked objects merely because they warm up.
      for (let warmup = 0; warmup < 3; warmup++) {
        await cycle.activate();
        await cycle.release();
        await sample();
      }
      const baseline = await sample();
      const samples = [];
      for (let iteration = 1; iteration <= 15; iteration++) {
        await cycle.activate();
        const active = await sample('active');
        await cycle.release();
        const released = await sample();
        verify(errors.length === 0, `${id}: browser errors or external requests`);
        samples.push({ iteration, active, released });
      }
      cases.push({ id, baseline, samples });
      console.log(`Memory lifecycle measured: ${id}, 15 cycles.`);
    } finally {
      try {
        if (cdp) await cdp.detach();
      } finally {
        await context.close();
      }
    }
  };

  for (const framework of ['react', 'vue', 'svelte']) {
    await measure(`framework/${framework}`, async (page) => {
      await page.goto(`${origin}/${framework}/`);
      await page.waitForFunction(
        () => document.querySelectorAll('svg[role="application"]').length === 3,
      );
      await page.locator('#toggle').click();
      await page.waitForFunction(
        () => document.querySelector('#view-handles').textContent === 'View handles 0',
      );
      return {
        async activate() {
          await page.locator('#toggle').click();
          await page.waitForFunction(
            () => document.querySelectorAll('svg[role="application"]').length === 3,
          );
          const first = page
            .locator('#viewer-host')
            .getByRole('button', { name: 'First node', exact: true });
          if (await first.isEnabled()) await first.click();
          await page.waitForFunction(() =>
            document.querySelector('#state').textContent.includes('Move 0'),
          );
          await frames(page);
          const before = Number(
            (await page.locator('#events').innerText()).match(/Events (\d+)/)[1],
          );
          await page.locator('#advance').click();
          await page.waitForFunction(() =>
            document.querySelector('#state').textContent.includes('Move 1'),
          );
          await frames(page);
          const after = Number(
            (await page.locator('#events').innerText()).match(/Events (\d+)/)[1],
          );
          verify(after === before + 1, `${framework}: duplicate state subscription`);
          verify(
            (await page.locator('#board-host [data-stone]').count()) === 1 &&
              (await page.locator('#viewer-host [data-stone]').count()) === 1,
            `${framework}: shared record diverged`,
          );
          const owned = page.locator('#owned-board').getByRole('application');
          await owned.focus();
          await page.keyboard.press('Enter');
          verify(
            (await page.locator('#owned-board [data-stone]').count()) === 1,
            `${framework}: owned record not fresh`,
          );
        },
        async release() {
          await page.locator('#toggle').click();
          await page.waitForFunction(
            () => document.querySelector('#view-handles').textContent === 'View handles 0',
          );
          verify(
            (await page.locator('svg[role="application"]').count()) === 0,
            `${framework}: unmount retained board`,
          );
          verify(
            (await page.locator('#png').isDisabled()) && (await page.locator('#svg').isDisabled()),
            `${framework}: retained disposed handle`,
          );
          const before = await page.locator('#events').innerText();
          await page.locator('#advance').click();
          await page.waitForFunction(() =>
            document.querySelector('#state').textContent.includes('Move 2'),
          );
          await frames(page);
          verify(
            (await page.locator('#events').innerText()) === before,
            `${framework}: callback after unmount`,
          );
        },
      };
    });
  }

  for (const moves of [300, 5000]) {
    const sgf = await (await rootPage.request.get(`${origin}/performance/${moves}.sgf`)).text();
    for (const ownership of ['owned', 'borrowed']) {
      await measure(`viewer/${ownership}/${moves}`, async (page) => {
        await page.goto(`${origin}/browser/`);
        await page.locator('#viewer svg[role="application"]').waitFor();
        await page.locator('#toggle').click();
        await page.evaluate(
          ({ text, borrowed }) => {
            const host = document.createElement('div');
            host.style.maxWidth = '620px';
            document.body.append(host);
            window.banoraMemory = {
              host,
              text,
              view: null,
              controller: borrowed ? new Banora.RecordController({ sgf: text }) : null,
            };
          },
          { text: sgf, borrowed: ownership === 'borrowed' },
        );
        return {
          async activate() {
            await page.evaluate((expectedMove) => {
              const state = window.banoraMemory;
              state.view = Banora.mountViewer(
                state.host,
                state.controller ? { controller: state.controller } : { sgf: state.text },
              );
              const controller = state.view.controller;
              const original = controller.createCheckpoint().sgf;
              let node = controller.getState().record.games[0];
              while (node.children[0]) node = node.children[0];
              if (
                !controller.goTo(node.id).ok ||
                controller.getState().position.moveNumber !== expectedMove ||
                controller.getState().dirty ||
                controller.createCheckpoint().sgf !== original ||
                !state.view.exportSvg().includes('data-stone')
              )
                throw Error('Viewer lifecycle lost source or rendered record');
            }, moves);
            await frames(page);
          },
          async release() {
            await page.evaluate(() => {
              const state = window.banoraMemory;
              state.view.dispose();
              state.view.dispose();
              state.view = null;
              if (state.host.childElementCount !== 0) throw Error('Viewer disposal retained DOM');
              // Borrowed controller must remain usable; it belongs to this host.
              if (state.controller) {
                const root = state.controller.getState().record.games[0];
                if (!state.controller.goTo(root.id).ok) throw Error('Disposed borrowed controller');
              }
            });
          },
        };
      });
    }
    await measure(`studio/${moves}`, async (page) => {
      await page.addInitScript(() => {
        for (const [field, value] of [
          ['locale', 'en'],
          ['autosave', false],
        ])
          localStorage.setItem(
            `banora.studio.preferences.${field}`,
            JSON.stringify({ schemaVersion: 'banora.studio-preference/v1', value }),
          );
      });
      await page.goto(`${origin}/studio/`);
      await page.locator('#board svg').waitFor();
      let reset = 0;
      const load = async (text, name) => {
        await page.locator('#file').setInputFiles({
          name: 'memory.sgf',
          mimeType: 'application/x-go-sgf',
          buffer: Buffer.from(text),
        });
        await page.waitForFunction(
          (expected) => document.querySelector('#game-name').textContent === expected,
          name,
        );
        await frames(page);
        verify(
          (await page.locator('#dirty').innerText()) === 'No changes',
          'Studio import changed baseline',
        );
      };
      return {
        async activate() {
          await load(sgf, `Browser review ${moves}`);
          await page.locator('#last').click();
          await page.waitForFunction(
            (expected) => document.querySelector('#move').textContent === `Move ${expected}`,
            moves,
          );
          verify(
            (await page.locator('#tree button').count()) ===
              Math.min(moves + 1, 500) + (moves >= 500 ? 1 : 0),
            'Studio row bound failed',
          );
          verify(
            (await page.locator('#board [data-stone]').count()) > 0,
            'Studio lost opening stones',
          );
        },
        async release() {
          const name = `Memory reset ${++reset}`;
          await load(`(;SZ[9]GN[${name}]XX[memory-reset])`, name);
          verify(
            (await page.locator('#tree button').count()) === 1 &&
              (await page.locator('#board [data-stone]').count()) === 0,
            'Studio retained old rendered record',
          );
        },
      };
    });
  }
  const report = {
    browserVersion: browser.version(),
    viewport: { width: 1280, height: 900 },
    warmups: 3,
    iterations: 15,
    cases,
  };
  const download = rootPage.waitForEvent('download');
  await rootPage.evaluate((value) => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(value)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'browser-memory.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, report);
  await (await download).saveAs('output/playwright/browser-memory-samples.json');
  return 'banora-browser-memory-complete';
};

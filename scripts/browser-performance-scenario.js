// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (rootPage) => {
  const origin = new URL(rootPage.url()).origin;
  const browser = rootPage.context().browser();
  const workloads = [];
  for (const moves of [300, 5000]) {
    const sgf = await (await rootPage.request.get(`${origin}/performance/${moves}.sgf`)).text();
    for (const cpuRate of [1, 4]) {
      const samples = [];
      for (let sample = -1; sample < 5; sample++) {
        const context = await browser.newContext({
          locale: 'en-US',
          viewport: { width: 1280, height: 900 },
        });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', () => errors.push('page-error'));
        let cdp;
        try {
          await page.addInitScript(() => {
            localStorage.setItem(
              'banora.studio.preferences.locale',
              JSON.stringify({ schemaVersion: 'banora.studio-preference/v1', value: 'en' }),
            );
            localStorage.setItem(
              'banora.studio.preferences.autosave',
              JSON.stringify({ schemaVersion: 'banora.studio-preference/v1', value: false }),
            );
          });
          await page.goto(`${origin}/studio/`);
          await page.locator('#board svg').waitFor();
          cdp = await context.newCDPSession(page);
          await cdp.send('Performance.enable');
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
          const heap = async () => {
            const { metrics } = await cdp.send('Performance.getMetrics');
            const used = metrics.find((item) => item.name === 'JSHeapUsedSize')?.value;
            if (!Number.isFinite(used) || used <= 0) throw Error('Browser heap metric unavailable');
            return used;
          };
          const initialHeapBytes = await heap();
          // Timing starts at the actual input event, and ends after the record
          // heading changes and two animation frames. Driver polling is excluded.
          await page.evaluate((expectedName) => {
            const input = document.querySelector('#file');
            const heading = document.querySelector('#game-name');
            window.banoraBrowserTiming = new Promise((resolve, reject) => {
              let started;
              const clean = () => {
                clearTimeout(timeout);
                observer.disconnect();
                input.removeEventListener('change', start, true);
              };
              const start = () => {
                started = performance.now();
              };
              const observer = new MutationObserver(() => {
                if (started === undefined || heading.textContent !== expectedName) return;
                observer.disconnect();
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => {
                    const elapsed = performance.now() - started;
                    clean();
                    resolve(elapsed);
                  }),
                );
              });
              const timeout = setTimeout(() => {
                clean();
                reject(Error('Import timing did not finish'));
              }, 30000);
              input.addEventListener('change', start, { capture: true, once: true });
              observer.observe(heading, { childList: true, characterData: true, subtree: true });
            });
          }, `Browser review ${moves}`);
          await page.locator('#file').setInputFiles({
            name: 'review.sgf',
            mimeType: 'application/x-go-sgf',
            buffer: Buffer.from(sgf),
          });
          const openFrameMs = await page.evaluate(() => window.banoraBrowserTiming);
          const importHeapBytes = await heap();
          const action = async (selector, expectedMove) => {
            const time = await page.evaluate(async (id) => {
              const control = document.querySelector(id);
              if (!control || control.disabled) throw Error('Benchmark action unavailable');
              const start = performance.now();
              control.click();
              await new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve)),
              );
              return performance.now() - start;
            }, selector);
            if ((await page.locator('#move').textContent()) !== `Move ${expectedMove}`)
              throw Error('Browser benchmark navigated to the wrong move');
            if ((await page.locator('#dirty').textContent()) !== 'No changes')
              throw Error('Browser benchmark changed authored work');
            return time;
          };
          const lastFrameMs = await action('#last', moves);
          const previousFrameMs = await action('#previous', moves - 1);
          const nextFrameMs = await action('#next', moves);
          const navigationHeapBytes = await heap();
          const { nodes } = await cdp.send('Memory.getDOMCounters');
          const treeRows = await page.locator('#tree button').count();
          if (treeRows !== Math.min(moves + 1, 500) + (moves >= 500 ? 1 : 0))
            throw Error('Browser benchmark lost its bounded selected tree row');
          if ((await page.locator('#board [data-stone]').count()) < 1 || errors.length)
            throw Error('Browser benchmark failed to render the authored opening');
          if (sample >= 0)
            samples.push({
              openFrameMs,
              lastFrameMs,
              previousFrameMs,
              nextFrameMs,
              initialHeapBytes,
              importHeapBytes,
              navigationHeapBytes,
              domNodes: nodes,
              treeRows,
            });
        } finally {
          if (cdp) {
            await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
            await cdp.detach();
          }
          await context.close();
        }
      }
      workloads.push({ moves, bytes: Buffer.byteLength(sgf), cpuRate, samples });
    }
  }
  const report = {
    browserVersion: browser.version(),
    viewport: { width: 1280, height: 900 },
    warmups: 1,
    samples: 5,
    workloads,
  };
  const reportPage = await browser.newContext();
  try {
    const page = await reportPage.newPage();
    await page.goto(`${origin}/readonly/`);
    const download = page.waitForEvent('download');
    await page.evaluate((value) => {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(value)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'browser-performance.json';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, report);
    await (await download).saveAs('output/playwright/browser-performance-samples.json');
  } finally {
    await reportPage.close();
  }
  return 'banora-browser-performance-complete';
};

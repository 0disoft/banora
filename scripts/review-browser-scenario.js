// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (rootPage, studioControl, config) => {
  const origin = new URL(rootPage.url()).origin;
  const browser = rootPage.context().browser();
  const memory = [],
    numbers = [],
    restore = [];
  const numberSignatures = {};
  const verify = (ok, message) => {
    if (!ok) throw Error(message);
  };
  const progress = (stage) =>
    rootPage.evaluate(async (stage) => {
      await fetch(`/progress?stage=${stage}`);
    }, stage);
  const frames = (page) =>
    page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
  const openDrafts = async (page) => {
    if (!(await page.locator('#drafts-dialog').evaluate((el) => el.open)))
      await studioControl(page, '#drafts-open', 'drafts', () =>
        page.locator('#drafts-open').click(),
      );
  };
  async function setup(variant) {
    const context = await browser.newContext({
      locale: 'en-US',
      viewport: { width: 1280, height: 900 },
    });
    const errors = [];
    await context.route('**/*', (route) => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      errors.push('external-request');
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${origin}/${variant}/studio/index.html`);
    await page.locator('#language').selectOption('en');
    await openDrafts(page);
    await page.locator('#draft-autosave').uncheck();
    await page.locator('#draft-close').click();
    await page.evaluate(() => document.fonts.ready);
    await frames(page);
    verify(
      await page.evaluate(() => typeof globalThis.__reviewClosed === 'undefined'),
      'Memory probe was loaded before diagnostic setup',
    );
    return { page, context, errors };
  }
  async function load(page, fixture, name) {
    await page.evaluate(
      async ({ url, name }) => {
        const response = await fetch(url);
        if (!response.ok) throw Error('Fixture unavailable');
        const data = new DataTransfer();
        data.items.add(new File([await response.blob()], name));
        const input = document.querySelector('#file');
        input.files = data.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      },
      { url: `${origin}/fixtures/${fixture}.sgf`, name },
    );
    await page.waitForFunction(
      (name) => document.querySelector('#status').textContent === `Opened ${name}.`,
      name,
    );
    await frames(page);
  }
  async function closeTab(page, id) {
    await page.locator(`[data-close-board="${id}"]`).click();
    if (await page.locator('#unsaved').evaluate((el) => el.open))
      await page.locator('#unsaved button[value="discard"]').click();
    await page.waitForFunction((id) => !document.querySelector(`[data-close-board="${id}"]`), id);
    await frames(page);
  }
  for (let iteration = 0; iteration < config.memorySamples; iteration++) {
    for (const variant of iteration % 2 ? ['after', 'before'] : ['before', 'after']) {
      const { page, context, errors } = await setup(variant);
      const cdp = await context.newCDPSession(page);
      try {
        // Warm this same controller without closing its initial tab; closing a
        // warmup tab would move the initial-target defect out of the measured case.
        await load(page, 'memory', 'warm.sgf');
        await page.locator('#last').click();
        await load(page, 'small', 'small.sgf');
        await page.evaluate((url) => import(url), `${origin}/${variant}/memory-probe.js`);
        const sample = async () => {
          await frames(page);
          await cdp.send('HeapProfiler.collectGarbage');
          await frames(page);
          await cdp.send('HeapProfiler.collectGarbage');
          const heap = await cdp.send('Runtime.getHeapUsage');
          const dom = await cdp.send('Memory.getDOMCounters');
          const refs = await page.evaluate(() => globalThis.__reviewClosed());
          return { heapBytes: heap.usedSize, dom, refs };
        };
        const baseline = await sample();
        await load(page, 'memory', 'initial.sgf');
        await page.locator('#last').click();
        for (let edit = 0; edit < 8; edit++) {
          await page.locator('#comment').fill(`Independent edit ${edit}`);
          await page.locator('#comment').blur();
        }
        verify(!(await page.locator('#undo').isDisabled()), 'Memory workload lost edit history');
        const active = await sample();
        await closeTab(page, 1);
        const firstClosed = await sample();
        await load(page, 'memory', 'later.sgf');
        await page.locator('#last').click();
        await closeTab(page, 2);
        const laterClosed = await sample();
        verify(
          firstClosed.refs.length === 1 && laterClosed.refs.length === 2,
          'Close probe missed real tabs',
        );
        verify(
          !laterClosed.refs[1].controller && !laterClosed.refs[1].record,
          'Later tab not collected',
        );
        verify(
          firstClosed.refs[0].controller === (variant === 'before') &&
            firstClosed.refs[0].record === (variant === 'before'),
          'Unexpected initial-tab reachability',
        );
        verify(errors.length === 0, `Memory page errors: ${errors.join(';')}`);
        memory.push({ variant, iteration, baseline, active, firstClosed, laterClosed });
      } finally {
        await cdp.detach();
        await context.close();
      }
    }
  }
  await progress('memory');
  for (const fixture of ['normal', 'large', 'collection', 'large-off']) {
    const numbersEnabled = fixture !== 'large-off';
    const pair = {};
    try {
      for (const variant of ['before', 'after']) {
        pair[variant] = await setup(variant);
        await load(pair[variant].page, numbersEnabled ? fixture : 'large', `${fixture}.sgf`);
        await pair[variant].page.locator('#numbers').setChecked(numbersEnabled);
      }
      for (const phase of ['early', 'end']) {
        const expectedMove = phase === 'early' ? 32 : fixture.startsWith('large') ? 5000 : 300;
        for (const { page } of Object.values(pair)) {
          if (phase === 'end') await page.locator('#last').click();
          else
            await page.evaluate(() => {
              for (let i = 0; i < 32; i++) document.querySelector('#next').click();
            });
        }
        for (let round = -config.warmups; round < config.samples; round++) {
          for (const variant of round % 2 ? ['after', 'before'] : ['before', 'after']) {
            const page = pair[variant].page;
            await page.bringToFront();
            await frames(page);
            const measurement = await page.evaluate(
              async ({ phase, expectedMove, numbersEnabled }) => {
                const start = performance.now();
                for (let i = 0; i < 20; i++) {
                  const id =
                    phase === 'early'
                      ? i % 2
                        ? '#previous'
                        : '#next'
                      : i % 2
                        ? '#next'
                        : '#previous';
                  const button = document.querySelector(id);
                  if (button.disabled) throw Error('Navigation disabled');
                  button.click();
                }
                const syncBatchMs = performance.now() - start;
                await new Promise((resolve) =>
                  requestAnimationFrame(() => requestAnimationFrame(resolve)),
                );
                const batchToSecondFrameMs = performance.now() - start;
                const singleStart = performance.now();
                document.querySelector(phase === 'early' ? '#next' : '#previous').click();
                await new Promise((resolve) =>
                  requestAnimationFrame(() => requestAnimationFrame(resolve)),
                );
                const singleActionToSecondFrameMs = performance.now() - singleStart;
                document.querySelector(phase === 'early' ? '#previous' : '#next').click();
                await new Promise((resolve) =>
                  requestAnimationFrame(() => requestAnimationFrame(resolve)),
                );
                if (document.querySelector('#move').textContent !== `Move ${expectedMove}`)
                  throw Error('Navigation endpoint changed');
                const signature = [...document.querySelectorAll('#board [data-move-number]')]
                  .map((el) => `${el.getAttribute('x')},${el.getAttribute('y')}:${el.textContent}`)
                  .join('|');
                if (
                  Boolean(signature) !== numbersEnabled ||
                  document.querySelector('#dirty').textContent !== 'No changes'
                )
                  throw Error('Number workload changed content');
                return {
                  syncBatchMs,
                  handlerPerActionMs: syncBatchMs / 20,
                  batchToSecondFrameMs,
                  singleActionToSecondFrameMs,
                  signature,
                };
              },
              { phase, expectedMove, numbersEnabled },
            );
            if (round >= 0) numbers.push({ variant, fixture, phase, round, ...measurement });
          }
        }
        const signatures = new Set(
          numbers.filter((s) => s.fixture === fixture && s.phase === phase).map((s) => s.signature),
        );
        verify(signatures.size === 1, 'Before/after rendered move numbers differ');
        numberSignatures[`${fixture}/${phase}`] = signatures.values().next().value;
      }
      for (const p of Object.values(pair))
        verify(p.errors.length === 0, `Number page errors: ${p.errors.join(';')}`);
    } finally {
      for (const p of Object.values(pair)) await p.context.close();
    }
  }
  await progress('numbers');
  for (const workload of ['normal', 'large', 'large-guarded']) {
    const pair = {};
    try {
      for (const variant of ['before', 'after']) {
        const p = (pair[variant] = await setup(variant));
        await p.page.evaluate(
          async (url) => {
            const response = await fetch(url);
            if (!response.ok) throw Error('Backup unavailable');
            globalThis.__reviewFile = new File([await response.blob()], 'review.json', {
              type: 'application/json',
            });
            globalThis.__reviewTiming = null;
            addEventListener(
              'change',
              (e) => {
                if (e.target.id === 'backup-file')
                  globalThis.__reviewTiming = {
                    start: performance.now(),
                    guard: null,
                    approve: null,
                    finishing: false,
                    done: null,
                  };
              },
              true,
            );
            addEventListener(
              'click',
              (e) => {
                if (
                  e.target.closest?.('#unsaved button[value="discard"]') &&
                  globalThis.__reviewTiming
                )
                  globalThis.__reviewTiming.approve = performance.now();
              },
              true,
            );
            new MutationObserver(() => {
              const t = globalThis.__reviewTiming;
              if (!t) return;
              if (document.querySelector('#unsaved').open && t.guard === null)
                t.guard = performance.now();
              if (
                !t.finishing &&
                document.querySelector('#status').textContent === 'Draft restored.'
              ) {
                t.finishing = true;
                const ready = performance.now();
                requestAnimationFrame(() =>
                  requestAnimationFrame(() => {
                    const wait = t.approve === null ? 0 : t.approve - t.guard;
                    t.done = {
                      readyMs: ready - t.start - wait,
                      toSecondFrameMs: performance.now() - t.start - wait,
                      beforeApprovalMs: t.guard === null ? null : t.guard - t.start,
                      afterApprovalMs: t.approve === null ? null : ready - t.approve,
                      excludedApprovalWaitMs: wait,
                    };
                  }),
                );
              }
            }).observe(document.documentElement, {
              subtree: true,
              childList: true,
              attributes: true,
              attributeFilter: ['open'],
            });
          },
          `${origin}/fixtures/${workload === 'normal' ? 'normal' : 'large'}.json`,
        );
      }
      for (let round = -config.warmups; round < config.samples; round++) {
        for (const variant of round % 2 ? ['after', 'before'] : ['before', 'after']) {
          const { page } = pair[variant];
          await page.bringToFront();
          await page.locator('#new').click();
          const tabId = Number(
            (await page.locator('[role="tab"][aria-selected="true"]').getAttribute('id'))
              .split('-')
              .at(-1),
          );
          if (workload === 'large-guarded') {
            await page.locator('#comment').fill('Existing unsaved work');
            await page.locator('#comment').blur();
          }
          await openDrafts(page);
          await frames(page);
          await page.evaluate(() => {
            globalThis.__reviewTiming = null;
            document.querySelector('#status').textContent = '';
            const data = new DataTransfer();
            data.items.add(globalThis.__reviewFile);
            const input = document.querySelector('#backup-file');
            input.files = data.files;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          });
          if (workload === 'large-guarded') {
            await page.waitForFunction(() => globalThis.__reviewTiming?.guard != null);
            await page.locator('#unsaved button[value="discard"]').click();
          }
          await page.waitForFunction(() => globalThis.__reviewTiming?.done);
          const measurement = await page.evaluate(() => globalThis.__reviewTiming.done);
          verify(
            Number.isFinite(measurement.readyMs) && measurement.readyMs > 0,
            'Invalid restore timer',
          );
          verify(
            (await page.locator('#move').textContent()) ===
              `Move ${workload === 'normal' ? 300 : 5000}`,
            'Restore selection lost',
          );
          verify(
            (await page.locator('#dirty').textContent()) ===
              (workload === 'normal' ? 'No changes' : 'Unsaved changes'),
            'Restore baseline lost',
          );
          verify(
            (await page.locator('#comment').inputValue()).length ===
              (workload === 'normal' ? 20 : 500),
            'Restore comment lost',
          );
          verify(await page.locator('#undo').isDisabled(), 'Restore retained old history');
          if (round >= 0) restore.push({ variant, workload, round, ...measurement });
          await closeTab(page, tabId);
        }
      }
      for (const p of Object.values(pair))
        verify(p.errors.length === 0, `Restore page errors: ${p.errors.join(';')}`);
    } finally {
      for (const p of Object.values(pair)) await p.context.close();
    }
  }
  await progress('restore');
  const stats = (values) => {
    const s = values.toSorted((a, b) => a - b);
    return {
      median:
        s.length % 2 ? s[Math.floor(s.length / 2)] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2,
      min: s[0],
      max: s.at(-1),
      p95: s[Math.ceil(s.length * 0.95) - 1],
    };
  };
  const summarize = (rows, keys, metric) => {
    const groups = [...new Set(rows.map((r) => keys.map((k) => r[k]).join('/')))];
    return groups.map((group) => {
      const selected = rows.filter((r) => keys.map((k) => r[k]).join('/') === group);
      const before = stats(selected.filter((r) => r.variant === 'before').map((r) => r[metric]));
      const after = stats(selected.filter((r) => r.variant === 'after').map((r) => r[metric]));
      return {
        group,
        metric,
        before,
        after,
        reductionPercent: (100 * (before.median - after.median)) / before.median,
      };
    });
  };
  const summary = {
    memory: ['before', 'after'].map((variant) => ({
      variant,
      retainedBytes: stats(
        memory
          .filter((r) => r.variant === variant)
          .map((r) => r.firstClosed.heapBytes - r.baseline.heapBytes),
      ),
      activeBytes: stats(
        memory
          .filter((r) => r.variant === variant)
          .map((r) => r.active.heapBytes - r.baseline.heapBytes),
      ),
      initialReferences: memory
        .filter((r) => r.variant === variant)
        .map((r) => r.firstClosed.refs[0]),
    })),
    numbers: summarize(numbers, ['fixture', 'phase'], 'handlerPerActionMs'),
    numberFrames: summarize(numbers, ['fixture', 'phase'], 'batchToSecondFrameMs'),
    singleNumberFrames: summarize(numbers, ['fixture', 'phase'], 'singleActionToSecondFrameMs'),
    restore: summarize(restore, ['workload'], 'readyMs'),
    restoreFrames: summarize(restore, ['workload'], 'toSecondFrameMs'),
    approval: summarize(
      restore.filter((r) => r.beforeApprovalMs !== null),
      ['workload'],
      'beforeApprovalMs',
    ),
  };
  const report = {
    schemaVersion: 'banora.review-browser-comparison/v1',
    timestamp: new Date().toISOString(),
    browserVersion: browser.version(),
    userAgent: await rootPage.evaluate(() => navigator.userAgent),
    viewport: { width: 1280, height: 900 },
    cpuRate: 1,
    config,
    memory,
    numberSignatures,
    numbers: numbers.map(({ signature: _signature, ...timing }) => timing),
    restore,
    summary,
  };
  const download = rootPage.waitForEvent('download');
  await rootPage.evaluate((report) => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(report)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'review-browser.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, report);
  await (await download).saveAs(config.output);
  return 'banora-review-comparison-complete';
};

// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const measured = await page.evaluate(async () => {
    const sdk = await import('/sdk/index.js');
    const host = document.createElement('div');
    host.style.width = '520px';
    document.body.append(host);
    const controller = new sdk.RecordController({ sgf: '(;SZ[19]AB[dd][pd][dp][pp])' });
    const hits = [];
    const view = sdk.mountBoard(host, { controller, onPoint: (point) => hits.push(point) });
    const svg = host.querySelector('svg');
    const baseline = controller.getState();
    const send = (x, y, type = 'pointermove') => {
      const point = svg.createSVGPoint();
      point.x = x + 1.25;
      point.y = y + 1.25;
      const screen = point.matrixTransform(svg.getScreenCTM());
      svg.dispatchEvent(
        new PointerEvent(type, {
          clientX: screen.x,
          clientY: screen.y,
          button: 0,
          pointerId: 1,
          pointerType: 'mouse',
        }),
      );
    };
    const samples = [];
    try {
      for (const readOnly of [true, false]) {
        view.update({ readOnly });
        const surface = svg.querySelector('[data-board-surface]');
        const stone = svg.querySelector('[data-stone="3,3"]');
        const observer = new MutationObserver(() => {});
        observer.observe(svg, { childList: true });
        const start = performance.now();
        for (let i = 0; i < 200; i++) send(i % 19, Math.floor(i / 19));
        const elapsedMs = performance.now() - start;
        const rootMutations = observer.takeRecords().length;
        observer.disconnect();
        samples.push({
          readOnly,
          moves: 200,
          elapsedMs,
          rootMutations,
          retainedSurface: surface === svg.querySelector('[data-board-surface]'),
          retainedStone: stone === svg.querySelector('[data-stone="3,3"]'),
        });
        const preview = svg.querySelector('circle[data-preview]');
        if (readOnly ? !!preview : !preview) throw Error('Hover visibility changed');
        send(3, 3);
        if (svg.querySelector('circle[data-preview]')) throw Error('Occupied hover preview');
        send(1, 1);
        if (view.exportSvg().includes('data-preview')) throw Error('Export retained hover');
        svg.dispatchEvent(new PointerEvent('pointerleave'));
        if (svg.querySelector('circle[data-preview]')) throw Error('Pointer leave retained hover');
      }
      view.update({ readOnly: true });
      send(2, 2, 'pointerup');
      if (hits.at(-1)?.x !== 2 || hits.at(-1)?.y !== 2)
        throw Error('Read-only interactive callback lost');
      view.update({ readOnly: false });
      for (const rotation of [0, 90, 180, 270])
        for (const flipX of [false, true]) {
          view.update({
            transform: { rotation, flipX },
            crop: { x: 1, y: 1, width: 4, height: 6 },
          });
          const shown = sdk.toDisplayPoint({ x: 2, y: 4 }, baseline.position, { rotation, flipX });
          send(shown.x, shown.y);
          const preview = svg.querySelector('circle[data-preview]');
          if (
            !preview ||
            Number(preview.getAttribute('cx')) !== shown.x + 1.25 ||
            Number(preview.getAttribute('cy')) !== shown.y + 1.25
          )
            throw Error('Transformed cropped hover failed');
          send(18, 18);
          if (svg.querySelector('circle[data-preview]')) throw Error('Outside hover remained');
        }
      if (controller.getState() !== baseline) throw Error('Hover changed semantic state');
      return samples;
    } finally {
      view.dispose();
      controller.dispose();
      host.remove();
    }
  });
  const download = page.waitForEvent('download');
  await page.evaluate((samples) => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(samples)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hover-samples.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, measured);
  await (await download).saveAs('output/playwright/hover-samples.json');
  if (measured.some((row) => row.rootMutations || !row.retainedSurface || !row.retainedStone))
    throw Error(`Hover replaced static board content: ${JSON.stringify(measured)}`);
  return 'banora-hover-complete';
};

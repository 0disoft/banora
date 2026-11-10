// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const measured = await page.evaluate(async () => {
    const sdk = await import('/sdk/index.js');
    const host = document.createElement('div');
    host.style.width = '520px';
    document.body.append(host);
    const controller = new sdk.RecordController({
      sgf: '(;SZ[19];B[aa];W[bb]' + ';B[];W[]'.repeat(2500) + ')(;SZ[9];B[cc])',
    });
    let node = controller.getState().node;
    const root = node;
    while (node.children[0]) node = node.children[0];
    controller.goTo(node.id);
    const view = sdk.mountBoard(host, {
      controller,
      moveNumbers: true,
      variationHints: true,
      compareTo: root.id,
    });
    const svg = host.querySelector('svg');
    const surface = svg.querySelector('[data-board-surface]');
    const stone = svg.querySelector('[data-stone="0,0"]');
    const originalCreate = document.createElementNS;
    let created = 0;
    document.createElementNS = function (...args) {
      if (args[0] === 'http://www.w3.org/2000/svg') created++;
      return originalCreate.apply(this, args);
    };
    const observer = new MutationObserver(() => {});
    observer.observe(svg, { childList: true });
    try {
      for (let i = 0; i < 20; i++) {
        if (!controller.setComment(`typed ${i}`).ok) throw Error('Comment failed');
      }
      const sample = {
        pathNodes: controller.getState().path.length,
        comments: 20,
        createdSvgElements: created,
        rootReplacements: observer.takeRecords().length,
        retainedSurface: surface === svg.querySelector('[data-board-surface]'),
        retainedStone: stone === svg.querySelector('[data-stone="0,0"]'),
      };
      observer.disconnect();
      const retained = svg.innerHTML;
      view.update({});
      if (retained !== svg.innerHTML) throw Error('Retained/fresh paint mismatch');
      if (!controller.getState().node.properties.C.includes('typed 19'))
        throw Error('Latest comment lost');
      const historySurface = svg.querySelector('[data-board-surface]');
      for (const action of [() => controller.undo(), () => controller.redo()]) {
        if (!action().ok) throw Error('Comment history failed');
        if (historySurface !== svg.querySelector('[data-board-surface]'))
          throw Error('Comment history repainted the board');
      }
      if (
        !controller.setComments([
          { nodeId: root.id, text: 'root comment' },
          { nodeId: controller.getState().record.games[1].id, text: 'other game comment' },
        ]).ok
      )
        throw Error('Batch comment failed');
      const batch = svg.innerHTML;
      view.update({});
      if (batch !== svg.innerHTML) throw Error('Batch/fresh paint mismatch');
      const oldSurface = svg.querySelector('[data-board-surface]');
      if (!controller.setMarker({ x: 2, y: 2 }, 'triangle').ok) throw Error('Marker failed');
      if (oldSurface === svg.querySelector('[data-board-surface]'))
        throw Error('Non-comment edit retained stale paint');
      const beforeOptions = svg.querySelector('[data-board-surface]');
      view.update({ transform: { rotation: 90 } });
      if (beforeOptions === svg.querySelector('[data-board-surface]'))
        throw Error('Options update retained stale paint');
      controller.loadSgf('(;SZ[9];B[aa]MN[42])', { discardChanges: true });
      controller.next();
      if (svg.getAttribute('data-board-width') !== '9') throw Error('Import retained old size');
      if (!svg.querySelector('[data-move-number="42"]')) throw Error('Import retained old MN');
      controller.loadSgf('(;SZ[9];B[aa]MN[77])', { discardChanges: true });
      controller.next();
      if (!svg.querySelector('[data-move-number="77"]')) throw Error('Same-board MN import stale');
      controller.loadSgf('(;SZ[9];B[aa](;W[bb])(;W[cc]))', { discardChanges: true });
      controller.next();
      const fork = controller.getState().node;
      const hints = [...svg.querySelectorAll('[data-variation-hint]')];
      if (hints.length !== 2) throw Error('Fork fixture missing hints');
      if (
        !controller.setComments(fork.children.map((child) => ({ nodeId: child.id, text: 'hint' })))
          .ok
      )
        throw Error('Child comment batch failed');
      if (
        hints.some((hint, index) => hint !== svg.querySelectorAll('[data-variation-hint]')[index])
      )
        throw Error('Child comments replaced fork hints');
      const forkMarkup = svg.innerHTML;
      view.update({});
      if (forkMarkup !== svg.innerHTML) throw Error('Fork/fresh paint mismatch');
      controller.next(1);
      if (!svg.querySelector('[data-stone="2,2"]')) throw Error('Fork navigation stale');
      view.update({ drawing: { color: '#12674e', width: 0.1 } });
      for (const key of [' ', 'ArrowRight', ' '])
        svg.dispatchEvent(new KeyboardEvent('keydown', { key }));
      if (!svg.querySelector('[data-preview="ink"]')) throw Error('Ink preview fixture missing');
      if (!controller.setComment('cancel pending ink').ok) throw Error('Ink comment failed');
      if (svg.querySelector('[data-preview="ink"]') || controller.getState().strokes.length)
        throw Error('Comment retained or committed cancelled ink');
      return sample;
    } finally {
      observer.disconnect();
      document.createElementNS = originalCreate;
      view.dispose();
      controller.dispose();
      host.remove();
    }
  });
  const download = page.waitForEvent('download');
  await page.evaluate((sample) => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(sample)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'comment-paint-samples.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, measured);
  await (await download).saveAs('output/playwright/comment-paint-samples.json');
  if (
    measured.createdSvgElements ||
    measured.rootReplacements ||
    !measured.retainedSurface ||
    !measured.retainedStone
  )
    throw Error(`Comment edits repainted static content: ${JSON.stringify(measured)}`);
  return 'banora-comment-paint-complete';
};

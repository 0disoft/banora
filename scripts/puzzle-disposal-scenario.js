// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const cdp = await page.context().newCDPSession(page);
  const errors = [];
  const onError = (error) => errors.push(error.message);
  page.on('pageerror', onError);
  try {
    await page.evaluate(() => {
      window.puzzleDisposalProbe = { views: [], hosts: [], live: [], closed: [] };
    });
    await page.evaluate(async () => {
      const { mountPuzzle } = await import('/sdk/puzzle-view.js');
      const { PuzzleSession } = await import('/sdk/puzzle.js');
      const probe = window.puzzleDisposalProbe;
      const definition = () => ({
        schemaVersion: 'banora.puzzle/v1',
        id: 'disposal',
        title: 'Probe',
        prompt: 'Play',
        sgf: '(;SZ[9]' + (';XX[' + 'x'.repeat(60000) + ']').repeat(18) + ')',
        tree: { id: 'root', children: [{ id: 'win', move: { x: 1, y: 1 }, result: 'correct' }] },
      });
      const host = () => {
        const node = document.createElement('div');
        document.body.append(node);
        probe.hosts.push(node);
        return node;
      };
      for (let index = 0; index < 4; index++) {
        const authored = definition();
        const view = mountPuzzle(host(), { definition: authored });
        probe.live.push({ definition: new WeakRef(authored), tree: new WeakRef(authored.tree) });
        probe.views.push(view);
      }
      for (let index = 0; index < 4; index++) {
        const authored = definition();
        const view = mountPuzzle(host(), { definition: authored, onEvent: () => authored.title });
        if (!view.session.play({ x: 1, y: 1 }).ok) throw Error('Puzzle fixture refused');
        probe.closed.push({
          definition: new WeakRef(authored),
          tree: new WeakRef(authored.tree),
          state: new WeakRef(view.session.getState()),
        });
        view.dispose();
        view.dispose();
        probe.views.push(view);
      }
      probe.borrowed = new PuzzleSession(definition());
      probe.snapshot = probe.borrowed.getState();
      probe.snapshotRef = new WeakRef(probe.snapshot);
      const borrowedView = mountPuzzle(host(), { session: probe.borrowed });
      borrowedView.dispose();
      probe.views.push(borrowedView);
      const reentrantHost = host();
      let reentrant;
      let notifications = 0;
      reentrant = mountPuzzle(reentrantHost, {
        definition: definition(),
        onEvent() {
          notifications++;
          reentrant.dispose();
        },
      });
      probe.views.push(reentrant);
      reentrantHost.querySelector('[data-puzzle-pass]').click();
      if (notifications !== 1 || reentrantHost.childElementCount !== 0)
        throw Error('Reentrant puzzle disposal failed');
    });
    for (let turn = 0; turn < 4; turn++) {
      await cdp.send('HeapProfiler.collectGarbage');
      await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
    }
    await page.evaluate(async () => {
      const probe = window.puzzleDisposalProbe;
      for (const refs of [...probe.live, ...probe.closed])
        if (Object.values(refs).some((ref) => ref.deref()))
          throw Error('Puzzle presentation retained source definition or closed state');
      for (const view of probe.views.slice(0, 4)) {
        view.update({ locale: 'ko', board: { theme: 'flat' } });
        const played = view.session.play({ x: 1, y: 1 });
        if (
          !played.ok ||
          played.state.status !== 'correct' ||
          !view.exportSvg().includes('data-stone')
        )
          throw Error('Collected puzzle input changed compiled session behavior');
        view.dispose();
      }
      if (
        probe.snapshotRef.deref() !== probe.snapshot ||
        probe.snapshot.status !== 'active' ||
        !probe.borrowed.play({ x: 1, y: 1 }).ok
      )
        throw Error('Puzzle disposal changed borrowed session or host snapshot');
      for (const view of probe.views) {
        let rejected = false;
        try {
          view.update({ locale: 'en' });
        } catch {
          rejected = true;
        }
        if (!rejected) throw Error('Disposed puzzle accepted an update');
        rejected = false;
        try {
          view.exportSvg();
        } catch {
          rejected = true;
        }
        if (!rejected) throw Error('Disposed puzzle exported SVG');
        await view.exportPng().then(
          () => {
            throw Error('Disposed puzzle exported PNG');
          },
          () => {},
        );
      }
    });
    if (errors.length) throw Error('Puzzle lifecycle emitted a page error: ' + errors.join('; '));
    return 'banora-puzzle-disposal-complete';
  } finally {
    try {
      await page.evaluate(() => {
        const probe = window.puzzleDisposalProbe;
        for (const view of probe?.views ?? []) view.dispose();
        probe?.borrowed?.dispose();
        for (const host of probe?.hosts ?? []) host.remove();
        delete window.puzzleDisposalProbe;
      });
    } finally {
      page.off('pageerror', onError);
      await cdp.detach();
    }
  }
};

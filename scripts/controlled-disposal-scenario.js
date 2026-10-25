// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const cdp = await page.context().newCDPSession(page);
  const errors = [];
  const onError = (error) => errors.push(error.message);
  page.on('pageerror', onError);
  try {
    await page.evaluate(async () => {
      const { mountControlledBoard } = await import('/sdk/controlled-board.js');
      const probe = (window.controlledDisposalProbe = {
        views: [],
        hosts: [],
        live: [],
        closed: [],
      });
      for (const closed of [false, true]) {
        for (let index = 0; index < 4; index++) {
          const owner = { buffer: new ArrayBuffer(4 * 1024 * 1024), calls: 0 };
          const source = {
            key: 'host-' + index,
            width: 9,
            height: 9,
            stones: Array(81).fill(null),
            hostOnly: owner.buffer,
          };
          const host = document.createElement('div');
          document.body.append(host);
          const onIntent = closed ? () => owner.calls++ : undefined;
          const view = mountControlledBoard(host, { state: source, onIntent, contextMenu: true });
          const refs = { source: new WeakRef(source), payload: new WeakRef(owner.buffer) };
          if (closed) {
            Object.assign(refs, {
              snapshot: new WeakRef(view.getSnapshot()),
              owner: new WeakRef(owner),
              callback: new WeakRef(onIntent),
            });
            view.dispose();
            view.dispose();
            if (host.childElementCount !== 0) throw Error('Closed controlled board retained DOM');
          }
          probe[closed ? 'closed' : 'live'].push(refs);
          probe.views.push(view);
          probe.hosts.push(host);
        }
      }
    });
    for (let turn = 0; turn < 4; turn++) {
      await cdp.send('HeapProfiler.collectGarbage');
      await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
    }
    const retained = await page.evaluate(() => {
      const probe = window.controlledDisposalProbe;
      return Object.fromEntries(
        ['live', 'closed'].map((kind) => [
          kind,
          probe[kind].flatMap(Object.values).filter((ref) => ref.deref()).length,
        ]),
      );
    });
    if (retained.live || retained.closed)
      throw Error('Controlled board retained host/closed graphs: ' + JSON.stringify(retained));
    await page.evaluate(async () => {
      const probe = window.controlledDisposalProbe;
      for (const view of probe.views.slice(0, 4)) {
        if (view.getSnapshot().width !== 9) throw Error('Live owned snapshot lost');
        const state = {
          key: 'replacement',
          width: 9,
          height: 9,
          stones: ['black', ...Array(80).fill(null)],
        };
        let intent;
        view.update({
          state,
          onIntent: (value) => {
            intent = value;
          },
        });
        probe.hosts[probe.views.indexOf(view)]
          .querySelector('svg')
          .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        if (intent?.stateKey !== 'replacement') throw Error('Collected input broke intention keys');
        if (!view.exportSvg().includes('data-stone'))
          throw Error('Collected input broke rendering');
        view.dispose();
        if (state.stones[0] !== 'black') throw Error('Disposal mutated host state');
      }
      for (const view of probe.views) {
        for (const operation of [
          () => view.getSnapshot(),
          () => view.update({ theme: 'flat' }),
          () => view.announce('late'),
          () => view.exportSvg(),
        ]) {
          let rejected = false;
          try {
            operation();
          } catch {
            rejected = true;
          }
          if (!rejected) throw Error('Disposed controlled board accepted work');
        }
        await view.exportPng().then(
          () => {
            throw Error('Disposed PNG succeeded');
          },
          () => {},
        );
      }
      const { mountControlledBoard } = await import('/sdk/controlled-board.js');
      const host = probe.hosts[0];
      const state = { key: 'borrowed', width: 9, height: 9, stones: Array(81).fill(null) };
      let calls = 0;
      const onIntent = () => {
        calls++;
        view.dispose();
      };
      const view = mountControlledBoard(host, { state, onIntent });
      const snapshot = view.getSnapshot();
      probe.views.push(view);
      host
        .querySelector('svg')
        .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      if (
        calls !== 1 ||
        host.childElementCount !== 0 ||
        state.stones.length !== 81 ||
        snapshot.stones.length !== 81 ||
        snapshot.width !== 9
      )
        throw Error('Reentrant disposal changed host ownership');
      onIntent();
      if (calls !== 2) throw Error('Disposal invalidated host callback');
    });
    if (errors.length)
      throw Error('Controlled lifecycle emitted page errors: ' + errors.join('; '));
    return 'banora-controlled-disposal-complete';
  } finally {
    try {
      await page.evaluate(() => {
        const probe = window.controlledDisposalProbe;
        for (const view of probe?.views ?? []) view.dispose();
        for (const host of probe?.hosts ?? []) host.remove();
        delete window.controlledDisposalProbe;
      });
    } finally {
      page.off('pageerror', onError);
      await cdp.detach();
    }
  }
};

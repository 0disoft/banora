// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const cdp = await page.context().newCDPSession(page);
  try {
    await page.evaluate(async () => {
      const { RecordController } = await import('/sdk/controller.js');
      const { createAnalysisContext } = await import('/sdk/analysis.js');
      const { KataGoProvider } = await import('/sdk/katago.js');
      const probe = { writes: [], refs: [] };
      window.kataGoDisposalProbe = probe;
      const provider = new KataGoProvider(
        {
          sendLine() {
            const write = new Promise(() => {});
            probe.writes.push(write);
            return write;
          },
        },
        { perspective: 'black', maxPending: 1 },
      );
      probe.provider = provider;
      for (const mode of ['cancel', 'disconnect', 'success', 'dispose']) {
        const controller = new RecordController({ size: 19 });
        try {
          const captured = createAnalysisContext(controller.getState(), {
            profile: 'japanese-territory',
          });
          if (!captured.ok) throw Error('KataGo context refused');
          const request = {
            id: mode,
            providerId: provider.id,
            context: captured.value,
            limits: { maxVisits: 1, maxPvLength: 1, includeOwnership: false },
          };
          probe.refs.push({ request: new WeakRef(request), context: new WeakRef(captured.value) });
          let cancel = () => {};
          const completion = provider
            .analyze(request, {
              cancelled: false,
              onCancel(fn) {
                cancel = fn;
                return () => {
                  cancel = () => {};
                };
              },
            })
            .then(
              () => 'success',
              (error) => error.reason,
            );
          if (mode === 'cancel') cancel();
          else if (mode === 'disconnect') provider.fail();
          else if (mode === 'dispose') provider.dispose();
          else {
            const action = provider.receiveLine(
              JSON.stringify({
                id: mode,
                turnNumber: 0,
                isDuringSearch: false,
                rootInfo: { currentPlayer: 'B', winrate: 0.5, scoreLead: 0, visits: 1 },
                moveInfos: [],
              }),
            );
            if (!action.ok) throw Error('KataGo final refused');
          }
          const expected = {
            cancel: 'cancelled',
            disconnect: 'provider',
            success: 'success',
            dispose: 'disposed',
          };
          if ((await completion) !== expected[mode]) throw Error('KataGo terminal reason changed');
        } finally {
          controller.dispose();
        }
      }
      const host = new RecordController({ size: 19 });
      try {
        const captured = createAnalysisContext(host.getState(), { profile: 'japanese-territory' });
        if (!captured.ok) throw Error('KataGo positive control refused');
        probe.hostContext = captured.value;
        probe.hostRef = new WeakRef(captured.value);
      } finally {
        host.dispose();
      }
    });
    for (let turn = 0; turn < 4; turn++) {
      await cdp.send('HeapProfiler.collectGarbage');
      await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
    }
    await page.evaluate(() => {
      const probe = window.kataGoDisposalProbe;
      if (probe.writes.length !== 6) throw Error('KataGo pending write fixture changed');
      for (const refs of probe.refs)
        if (refs.request.deref() || refs.context.deref())
          throw Error('Settled KataGo request retained by unfinished transport write');
      if (probe.hostRef.deref() !== probe.hostContext)
        throw Error('Host-owned analysis context was released');
    });
    return 'banora-katago-disposal-complete';
  } finally {
    try {
      await page.evaluate(() => {
        window.kataGoDisposalProbe?.provider?.dispose();
        delete window.kataGoDisposalProbe;
      });
    } finally {
      await cdp.detach();
    }
  }
};

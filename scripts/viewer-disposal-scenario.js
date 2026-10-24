// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const cdp = await page.context().newCDPSession(page);
  try {
    await page.evaluate(async () => {
      const { mountViewer, RecordController } = await import('/sdk/index.js');
      const text = '(;SZ[9]' + (';XX[' + 'x'.repeat(60000) + ']').repeat(18) + ')';
      const probe = { views: [], inputs: [], roots: [] };
      window.viewerDisposalProbe = probe;
      for (let index = 0; index < 4; index++) {
        const input = new TextEncoder().encode(text);
        const host = document.createElement('div');
        document.body.append(host);
        const view = mountViewer(host, { sgf: input });
        probe.inputs.push(new WeakRef(input));
        probe.roots.push(new WeakRef(view.controller.getState().record.games[0]));
        view.dispose();
        view.dispose();
        host.remove();
        probe.views.push(view);
      }
      // Host-owned input and a borrowed controller are intentional strong owners.
      probe.input = new TextEncoder().encode(text);
      probe.inputRef = new WeakRef(probe.input);
      probe.controller = new RecordController({ sgf: probe.input });
      probe.rootRef = new WeakRef(probe.controller.getState().record.games[0]);
      const host = document.createElement('div');
      document.body.append(host);
      const borrowed = mountViewer(host, { controller: probe.controller });
      borrowed.dispose();
      host.remove();
      probe.views.push(borrowed);
    });
    for (let turn = 0; turn < 4; turn++) {
      await cdp.send('HeapProfiler.collectGarbage');
      await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
    }
    await page.evaluate(() => {
      const probe = window.viewerDisposalProbe;
      if (probe.inputs.some((ref) => ref.deref()) || probe.roots.some((ref) => ref.deref()))
        throw Error('Disposed viewer handle retained source input or record');
      if (!probe.inputRef.deref() || !probe.rootRef.deref() || !probe.controller.next().ok)
        throw Error('Viewer disposal released host-owned input or borrowed controller');
      for (const view of probe.views) {
        let rejected = false;
        try {
          view.update({ locale: 'ko' });
        } catch {
          rejected = true;
        }
        if (!rejected) throw Error('Disposed viewer accepted presentation updates');
      }
    });
    return 'banora-viewer-disposal-complete';
  } finally {
    try {
      await page.evaluate(() => {
        window.viewerDisposalProbe?.controller?.dispose();
        delete window.viewerDisposalProbe;
      });
    } finally {
      await cdp.detach();
    }
  }
};

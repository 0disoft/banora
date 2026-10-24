// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const cdp = await page.context().newCDPSession(page);
  try {
    await page.evaluate(async () => {
      const { RecordController } = await import('/sdk/controller.js');
      const { AnalysisSession } = await import('/sdk/analysis.js');
      const { mountAnalysis } = await import('/sdk/analysis-view.js');
      const sgf = '(;SZ[9]' + (';XX[' + 'x'.repeat(60000) + ']').repeat(18) + ')';
      const provider = {
        id: 'disposal-regression',
        analyze(request) {
          return {
            requestId: request.id,
            contextKey: request.context.key,
            root: { winProbabilityBlack: 0.5, scoreLeadBlack: 0, visits: 1 },
            candidates: [],
          };
        },
      };
      const settings = { profile: 'japanese-territory' };
      const probe = { views: [], refs: [] };
      window.analysisDisposalProbe = probe;
      for (let index = 0; index < 4; index++) {
        const controller = new RecordController({ sgf });
        const host = document.createElement('div');
        document.body.append(host);
        const view = mountAnalysis(host, {
          controller,
          provider,
          settings,
          onComplete: () => controller.getState(),
        });
        if (!(await view.session.request()).ok) throw Error('Analysis fixture refused');
        probe.refs.push({
          controller: new WeakRef(controller),
          root: new WeakRef(controller.getState().record.games[0]),
          context: new WeakRef(view.session.getState().context),
          result: new WeakRef(view.session.getState().result),
        });
        view.dispose();
        view.dispose();
        host.remove();
        probe.views.push(view);
      }
      const controller = new RecordController({ sgf });
      probe.borrowed = new AnalysisSession(controller, provider, settings);
      const host = document.createElement('div');
      document.body.append(host);
      const view = mountAnalysis(host, { session: probe.borrowed });
      if (!(await probe.borrowed.request()).ok) throw Error('Borrowed fixture refused');
      probe.snapshot = probe.borrowed.getState();
      probe.context = new WeakRef(probe.snapshot.context);
      probe.root = new WeakRef(controller.getState().record.games[0]);
      view.dispose();
      host.remove();
      probe.views.push(view);
    });
    for (let turn = 0; turn < 4; turn++) {
      await cdp.send('HeapProfiler.collectGarbage');
      await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
    }
    await page.evaluate(async () => {
      const probe = window.analysisDisposalProbe;
      for (const refs of probe.refs)
        if (Object.values(refs).some((ref) => ref.deref()))
          throw Error('Closed analysis handle retained source or completed analysis');
      if (
        !probe.context.deref() ||
        !probe.root.deref() ||
        !probe.snapshot.result ||
        !probe.borrowed.controller.next().ok
      )
        throw Error('Analysis cleanup released borrowed owner or immutable snapshot');
      for (const view of probe.views) {
        let rejected = false;
        try {
          view.update({ locale: 'ko' });
        } catch {
          rejected = true;
        }
        if (!rejected) throw Error('Closed analysis view accepted an update');
      }
      if ((await probe.views[0].session.request()).reason !== 'disposed')
        throw Error('View-owned analysis session survived disposal');
    });
    return 'banora-analysis-disposal-complete';
  } finally {
    try {
      await page.evaluate(() => {
        const probe = window.analysisDisposalProbe;
        if (probe?.borrowed) {
          const controller = probe.borrowed.controller;
          probe.borrowed.dispose();
          controller.dispose();
        }
        delete window.analysisDisposalProbe;
      });
    } finally {
      await cdp.detach();
    }
  }
};

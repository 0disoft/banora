// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  await page.evaluate(async () => {
    const { mountAnalysis, createAnalysisMessages } = await import('/sdk/analysis-view.js');
    const { AnalysisSession, AnalysisError } = await import('/sdk/analysis.js');
    const { RecordController } = await import('/sdk/controller.js');
    const { serializeSgf } = await import('/sdk/sgf.js');
    const { SUPPORTED_LOCALES, createUiMessages, formatUiMessage } = await import('/sdk/locale.js');
    const verify = (value, message) => {
      if (!value) throw Error(message);
    };
    const source = new RecordController({ sgf: '(;SZ[5]C[Authored <b> comment]XX[keep])' });
    const sourceState = source.getState(),
      sgf = serializeSgf(sourceState.record),
      jobs = [];
    const provider = {
      id: 'locale-provider',
      analyze(request, cancellation) {
        return new Promise((resolve, reject) =>
          jobs.push({ request, cancellation, resolve, reject }),
        );
      },
    };
    const settings = { profile: 'japanese-territory' };
    const session = new AnalysisSession(source, provider, settings);
    const host = document.createElement('div');
    document.body.append(host);
    const overrides = { request: '$&<b> literal' };
    let callbacks = 0;
    const view = mountAnalysis(host, {
      session,
      locale: 'ko',
      messages: overrides,
      onComplete: () => callbacks++,
    });
    const find = (key) => root.querySelector(`[data-analysis-${key}]`);
    const root = host.querySelector('.banora-analysis');
    overrides.request = 'caller mutation';
    view.update({ board: { coordinates: false } });
    verify(
      find('request').textContent === '$&<b> literal' && !host.querySelector('b'),
      'Caller overrides were retained or became HTML',
    );
    const idle = session.getState();
    for (const locale of SUPPORTED_LOCALES) {
      view.update({ locale, messages: {} });
      const text = createAnalysisMessages({ locale });
      verify(
        root.lang === locale && root.getAttribute('aria-label') === text.analysis,
        `${locale}: analysis accessible name`,
      );
      for (const key of [
        'title',
        'request',
        'cancel',
        'legend',
        'caption',
        'move',
        'win',
        'lead',
        'visits',
        'return',
        'previous',
        'next',
        'help',
      ])
        verify(find(key).textContent === text[key], `${locale}: ${key}`);
      verify(
        find('ownership-label').textContent === text.ownership &&
          find('controls').getAttribute('aria-label') === text.controls &&
          find('pv-controls').getAttribute('aria-label') === text.pvControls,
        `${locale}: groups/checkbox`,
      );
      verify(
        find('status').textContent === text.idle &&
          host.querySelector('[data-analysis-board] svg').getAttribute('aria-label') ===
            createUiMessages({ locale }).board,
        `${locale}: idle/board (${find('status').textContent}; ${host.querySelector('[data-analysis-board] svg').getAttribute('aria-label')})`,
      );
      verify(
        find('summary').textContent ===
          formatUiMessage(text.context, { provider: provider.id, color: text.black }),
        `${locale}: provider/turn`,
      );
      verify(
        session.getState() === idle && !jobs.length,
        'Locale submitted analysis or changed state',
      );
    }
    const pending = session.request({ includeOwnership: true });
    const loading = session.getState();
    for (const locale of SUPPORTED_LOCALES) {
      view.update({ locale });
      verify(
        session.getState() === loading &&
          jobs.length === 1 &&
          find('request').disabled &&
          !find('cancel').disabled &&
          find('status').textContent === createAnalysisMessages({ locale }).loading,
        `${locale}: language change replaced pending work`,
      );
    }
    const report = (job, candidates = true) => ({
      requestId: job.request.id,
      contextKey: job.request.context.key,
      root: { visits: 20, winProbabilityBlack: 0.65, scoreLeadBlack: 1 },
      candidates: candidates
        ? [
            {
              move: { x: 0, y: 0 },
              rank: 0,
              visits: 15,
              winProbabilityBlack: 0.7,
              scoreLeadBlack: 2,
              principalVariation: [{ x: 0, y: 0 }, null],
            },
            {
              move: null,
              rank: 1,
              visits: 5,
              winProbabilityBlack: 0.6,
              scoreLeadBlack: 1,
              principalVariation: [],
            },
          ]
        : [],
      ownership: Array(25).fill(0.25),
    });
    jobs[0].resolve(report(jobs[0]));
    verify((await pending).ok, 'Fixture analysis rejected');
    const ready = session.getState(),
      result = ready.result;
    for (const locale of SUPPORTED_LOCALES) {
      view.update({ locale });
      const text = createAnalysisMessages({ locale });
      verify(
        find('status').textContent === text.ready &&
          find('summary').textContent ===
            formatUiMessage(text.summary, { win: '65.0%', lead: '+1.0', visits: 20 }),
        `${locale}: result summary`,
      );
      verify(
        host.querySelector('[data-analysis-select="1"]').textContent === `2. ${text.pass}`,
        `${locale}: candidate pass`,
      );
      host.querySelector('[data-analysis-select="0"]').click();
      host.querySelector('[data-analysis-select="0"]').focus();
      const step = root.dataset.analysisPvStep,
        diagram = view.exportSvg();
      view.update({ locale });
      verify(
        root.dataset.analysisPvStep === step &&
          document.activeElement.getAttribute('data-analysis-select') === '0' &&
          host.querySelector('[data-analysis-select="0"]').getAttribute('aria-pressed') ===
            'true' &&
          view.exportSvg() === diagram,
        `${locale}: selected preview/focus lost`,
      );
      verify(
        host.querySelector('[data-analysis-select="0"]').getAttribute('aria-label') ===
          formatUiMessage(text.preview, { coordinate: 'A5' }),
        `${locale}: candidate accessible label`,
      );
      find('next').click();
      verify(
        root.dataset.analysisPvStep === '2' && find('pv').textContent.includes(text.pass),
        `${locale}: PV pass caption`,
      );
      find('return').click();
      host.querySelector('[data-analysis-select="1"]').click();
      verify(
        find('pv').textContent.includes(text.candidateOnly) &&
          find('pv').textContent.includes(text.pass),
        `${locale}: candidate-only preview`,
      );
      find('return').click();
      const svg = host.querySelector('[data-analysis-board] svg');
      for (let i = 0; i < 5; i++) {
        svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      }
      svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      verify(
        find('point').textContent ===
          formatUiMessage(text.point, { coordinate: 'B5', value: '0.250' }),
        `${locale}: ownership inspection`,
      );
      verify(
        session.getState() === ready &&
          session.getState().result === result &&
          jobs.length === 1 &&
          callbacks === 0,
        'Language/preview changed model or submitted work',
      );
    }
    const before = host.innerHTML,
      state = session.getState(),
      originalDiagram = view.exportSvg();
    for (const options of [
      { locale: 'de' },
      { locale: null },
      { messages: null },
      { messages: { request: 2 } },
      { messages: { request: 'x'.repeat(4097) } },
      { messages: { unknown: 'x' } },
      { locale: 'ja', board: { crop: { x: 0, y: 0, width: 999, height: 5 } } },
      { locale: 'zh', request: { maxVisits: 0 } },
    ]) {
      let rejected = false;
      try {
        view.update({
          ...options,
          onComplete: () => {
            callbacks += 100;
          },
        });
      } catch {
        rejected = true;
      }
      verify(
        rejected &&
          host.innerHTML === before &&
          view.exportSvg() === originalDiagram &&
          session.getState() === state &&
          jobs.length === 1,
        'Invalid locale/options changed view or model',
      );
    }
    let request = session.request();
    jobs.at(-1).reject(Error('private transport detail <img>'));
    await request;
    const error = session.getState();
    for (const locale of SUPPORTED_LOCALES) {
      view.update({ locale });
      verify(
        session.getState() === error &&
          find('status').textContent === createAnalysisMessages({ locale }).errorProvider &&
          !host.textContent.includes('private transport'),
        `${locale}: provider failure localization/redaction`,
      );
    }
    request = session.request();
    const authored = '$& <b> Public provider diagnostic';
    jobs.at(-1).reject(new AnalysisError('unsupported', authored));
    await request;
    verify(
      session.getState().error.messageSource === 'provider',
      'Public error provenance missing',
    );
    for (const locale of SUPPORTED_LOCALES) {
      view.update({ locale });
      verify(
        find('status').textContent === authored && !host.querySelector('b,img'),
        `${locale}: provider-authored diagnostic changed or became HTML`,
      );
    }
    request = session.request();
    jobs.at(-1).resolve(report(jobs.at(-1), false));
    await request;
    for (const locale of SUPPORTED_LOCALES) {
      view.update({ locale });
      verify(
        find('empty').textContent === createAnalysisMessages({ locale }).empty &&
          find('candidates').hidden,
        `${locale}: empty result`,
      );
    }
    request = session.request();
    session.cancel();
    await request;
    for (const locale of SUPPORTED_LOCALES) {
      view.update({ locale });
      verify(
        find('status').textContent === createAnalysisMessages({ locale }).cancelled,
        `${locale}: cancellation status`,
      );
    }
    view.update({
      locale: 'ko',
      messages: { summary: '$&<b>{visits}</b>', request: 'Literal <img>' },
    });
    verify(
      find('request').textContent === 'Literal <img>' && !host.querySelector('img'),
      'Overrides interpreted HTML',
    );
    const delivered = new Promise((resolve) =>
      view.update({
        onComplete: () => {
          callbacks++;
          resolve();
        },
      }),
    );
    find('request').click();
    jobs.at(-1).resolve(report(jobs.at(-1)));
    await delivered;
    verify(
      callbacks === 1 && find('summary').textContent === '$&<b>20</b>' && !host.querySelector('b'),
      'Completion/summary override failed',
    );
    view.update({ locale: undefined, messages: undefined });
    verify(
      root.lang === 'en' && find('request').textContent === createAnalysisMessages().request,
      'Explicit locale reset failed',
    );
    verify(
      source.getState() === sourceState && serializeSgf(source.getState().record) === sgf,
      'Analysis presentation changed source SGF/history',
    );
    const retained = session.getState();
    view.dispose();
    verify(
      host.children.length === 0 && session.getState() === retained,
      'Borrowed localized disposal changed model',
    );
    let rejected = false;
    try {
      mountAnalysis(host, { session, locale: 'de' });
    } catch {
      rejected = true;
    }
    verify(
      rejected && host.children.length === 0 && session.getState() === retained,
      'Invalid mount leaked DOM/session',
    );
    const owned = mountAnalysis(host, { controller: source, provider, settings, locale: 'ko' });
    owned.dispose();
    verify(
      (await owned.session.request()).reason === 'disposed' && source.getState() === sourceState,
      'Owned locale view leaked or disposed source',
    );
    session.dispose();
    source.dispose();
    host.remove();
  });
  return 'banora-analysis-locale-complete';
};

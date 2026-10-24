// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  await page.evaluate(async () => {
    const { mountPuzzle, createPuzzleMessages } = await import('/sdk/puzzle-view.js');
    const { PuzzleSession } = await import('/sdk/puzzle.js');
    const { SUPPORTED_LOCALES, createUiMessages, formatUiFailure, formatUiMessage } =
      await import('/sdk/locale.js');
    const verify = (value, message) => {
      if (!value) throw Error(message);
    };
    const unlisted = createPuzzleMessages().unlisted;
    const definition = {
      schemaVersion: 'banora.puzzle/v1',
      id: 'locale',
      title: 'Authored <b>title</b>',
      prompt: 'Authored $& prompt',
      sgf: '(;SZ[5]AB[aa]PL[B])',
      tree: {
        id: 'root',
        hints: [{ text: 'Authored <script> hint', point: { x: 0, y: 1 } }],
        children: [
          { id: 'correct', move: { x: 2, y: 2 }, result: 'correct', feedback: unlisted },
          { id: 'incorrect', move: { x: 3, y: 3 }, result: 'incorrect' },
        ],
      },
    };
    const host = document.createElement('div');
    document.body.append(host);
    const session = new PuzzleSession(definition);
    let events = 0;
    const stop = session.onEvent(() => events++);
    const overrides = { hint: '$&<img> literal', puzzle: '<b> literal' };
    const view = mountPuzzle(host, { session, locale: 'ko', messages: overrides });
    const find = (key) => host.querySelector(`[data-puzzle-${key}]`);
    overrides.hint = 'caller mutation';
    view.update({ board: { coordinates: false } });
    verify(
      find('hint').textContent === '$&<img> literal' && !host.querySelector('img,b'),
      'Override ownership or literal text failed',
    );
    for (const locale of SUPPORTED_LOCALES) {
      session.restart();
      const before = session.getState(),
        beforeEvents = events;
      view.update({ locale, messages: {} });
      const text = createPuzzleMessages({ locale }),
        root = host.querySelector('.banora-puzzle');
      verify(
        session.getState() === before && events === beforeEvents,
        `${locale}: locale update changed puzzle`,
      );
      verify(
        root.lang === locale && root.getAttribute('aria-label') === text.puzzle,
        `${locale}: root label`,
      );
      for (const key of ['hint', 'pass', 'restart', 'help'])
        verify(find(key).textContent === text[key], `${locale}: ${key}`);
      verify(
        find('hints').getAttribute('aria-label') === text.hints &&
          find('controls').getAttribute('aria-label') === text.controls,
        `${locale}: accessible groups`,
      );
      verify(
        find('title').textContent === definition.title &&
          find('prompt').textContent === definition.prompt &&
          find('feedback').textContent === text.findSolution,
        `${locale}: authored/default text`,
      );
      verify(
        host.querySelector('svg').getAttribute('aria-label') === createUiMessages({ locale }).board,
        `${locale}: board label`,
      );
      session.requestHint();
      verify(
        find('hints').textContent === definition.tree.hints[0].text,
        `${locale}: authored hint changed`,
      );
      const diagram = view.exportSvg();
      session.play({ x: 4, y: 4 });
      verify(
        find('feedback').textContent === text.unlisted && view.exportSvg() === diagram,
        `${locale}: unlisted feedback/board`,
      );
      verify(
        find('progress').textContent ===
          formatUiMessage(text.progress, {
            color: text.black,
            status: text.active,
            attempts: 1,
            moves: 0,
          }),
        `${locale}: progress template`,
      );
      session.play({ x: 2, y: 2 });
      verify(
        find('feedback').textContent === unlisted &&
          find('progress').textContent.includes(text.correct) &&
          find('pass').disabled,
        `${locale}: authored feedback confused with system text`,
      );
      const solved = session.getState();
      view.update({ locale: 'ko' });
      verify(
        session.getState() === solved && find('feedback').textContent === unlisted,
        'Solved language update changed authored text/state',
      );
      session.restart();
      session.play({ x: 3, y: 3 });
      view.update({ locale });
      verify(
        find('progress').textContent.includes(text.incorrect) && find('pass').disabled,
        `${locale}: incorrect status`,
      );
      session.restart();
      const svg = host.querySelector('svg');
      for (let i = 0; i < 5; i++) {
        svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
        svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
      }
      const unchanged = session.getState();
      svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      verify(
        session.getState() === unchanged &&
          find('feedback').textContent ===
            formatUiMessage(text.rejected, { reason: formatUiFailure('occupied', { locale }) }),
        `${locale}: rejected input text/state`,
      );
      view.update({ locale: 'ko' });
      verify(
        session.getState() === unchanged &&
          find('feedback').textContent.includes(formatUiFailure('occupied', { locale: 'ko' })),
        'Failure lost on language change',
      );
    }
    const before = host.innerHTML,
      state = session.getState(),
      beforeEvents = events;
    for (const options of [
      { locale: 'de' },
      { locale: null },
      { messages: null },
      { messages: { hint: 7 } },
      { messages: { hint: 'x'.repeat(4097) } },
      { messages: { unknown: 'x' } },
      { locale: 'ja', board: { crop: { x: 0, y: 0, width: 999, height: 3 } } },
    ]) {
      let rejected = false;
      try {
        view.update(options);
      } catch {
        rejected = true;
      }
      verify(
        rejected &&
          host.innerHTML === before &&
          session.getState() === state &&
          events === beforeEvents,
        'Invalid update was not atomic',
      );
    }
    view.update({
      locale: 'ja',
      messages: { progress: '$&<b>{attempts}</b>', hint: 'literal <script>' },
    });
    verify(
      find('progress').textContent === '$&<b>0</b>' && !host.querySelector('b,script,img'),
      'Messages became HTML',
    );
    view.update({ locale: undefined, messages: undefined });
    verify(
      find('hint').textContent === createPuzzleMessages().hint &&
        host.querySelector('.banora-puzzle').lang === 'en',
      'Explicit reset failed',
    );
    view.dispose();
    verify(
      host.children.length === 0 && session.getState() === state,
      'Borrowed dispose changed session',
    );
    const remount = mountPuzzle(host, { session, locale: 'ko' });
    session.dispose();
    find('pass').click();
    verify(
      find('feedback').textContent.includes(createPuzzleMessages({ locale: 'ko' }).disposed),
      'Closed session feedback threw or stayed English',
    );
    remount.dispose();
    stop();
    let rejected = false;
    try {
      mountPuzzle(host, { definition, locale: 'de' });
    } catch {
      rejected = true;
    }
    verify(rejected && host.children.length === 0, 'Invalid mount left DOM');
    const owned = mountPuzzle(host, { definition, locale: 'th' });
    owned.dispose();
    verify(owned.session.restart().reason === 'disposed', 'Owned localized view leaked session');
    host.remove();
  });
  return 'banora-puzzle-locale-complete';
};

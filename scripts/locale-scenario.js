// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const result = await page.evaluate(async () => {
    const { RecordController, mountViewer } = await import('/sdk/index.js');
    const controller = new RecordController({
      sgf: '(;SZ[9]GN[Authored title]PB[Player Black]C[Authored English comment];B[aa];W[])',
    });
    const container = document.createElement('div');
    document.body.append(container);
    const view = mountViewer(container, {
      controller,
      locale: 'ko',
      playback: { intervalMs: 500 },
    });
    const check = (condition, message) => {
      if (!condition) throw Error(message);
    };
    check(
      container.querySelector('summary').textContent === '변화도',
      'Korean variation label missing',
    );
    check(
      container.querySelector('h2').textContent === 'Authored title' &&
        container.querySelector('textarea').value === 'Authored English comment',
      'Authored data translated',
    );
    check(
      container.querySelector('svg').getAttribute('aria-label').startsWith('바둑판.'),
      'Board accessibility not localized',
    );
    const rows = [...container.querySelectorAll('[data-tree] button')].map(
      (row) => row.textContent,
    );
    check(
      JSON.stringify(rows) === JSON.stringify(['0 · 시작 위치', '1 · 흑 A9', '2 · 백 패스']),
      'Korean move labels failed',
    );
    controller.next();
    controller.setComment('Unsaved <tag> comment');
    const before = controller.prepareExport().text;
    view.update({ locale: 'en', messages: { variations: '<tag>Branches</tag>' } });
    check(
      container.querySelector('summary').textContent === '<tag>Branches</tag>' &&
        !container.querySelector('summary tag'),
      'Custom messages interpreted as HTML',
    );
    check(
      controller.prepareExport().text === before &&
        controller.getState().position.moveNumber === 1 &&
        controller.getState().dirty,
      'Locale update changed record or selection',
    );
    check(view.playback.getState().intervalMs === 500, 'Locale update reset speed');
    try {
      view.update({ locale: 'invalid' });
      throw Error('Invalid locale accepted');
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
    }
    check(container.querySelector('section').lang === 'en', 'Rejected update changed language');
    view.update({ locale: 'ko', messages: {} });
    check(
      container.querySelector('nav > span').textContent === '1수' &&
        container.querySelector('summary').textContent === '변화도',
      'Switch back failed',
    );
    view.dispose();
    controller.dispose();
    container.remove();
    return 'banora-locale-core-complete';
  });
  if (result !== 'banora-locale-core-complete') throw Error('Locale core did not finish');
  return 'banora-locale-complete';
};

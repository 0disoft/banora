// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const sample = await page.evaluate(async () => {
    const { RecordController, mountViewer } = await import('/sdk/index.js');
    const host = document.createElement('div');
    host.style.width = '520px';
    document.body.append(host);
    const count = 5000;
    const sgf = '(;SZ[9]GN[Named];B[aa];W[bb])' + '(;SZ[9])'.repeat(count - 1);
    const controller = new RecordController({ sgf });
    const view = mountViewer(host, { controller, editable: true });
    const original = controller.prepareExport().text;
    const select = host.querySelector('select');
    const originals = [...select.options];
    const observer = new MutationObserver(() => {});
    const check = (condition, message) => {
      if (!condition) throw Error(message);
    };
    try {
      check(
        select.options.length === count && originals[1].textContent === 'Game 2',
        'Initial games missing',
      );
      observer.observe(select, { childList: true });
      const start = performance.now();
      for (let index = 0; index < 8; index++) {
        check(controller.next().ok && controller.previous().ok, 'Navigation refused');
      }
      const elapsedMs = performance.now() - start;
      const mutations = observer.takeRecords().length;
      check(
        !mutations && originals.every((option, index) => option === select.options[index]),
        'Navigation recreated game options',
      );
      select.value = String(count - 1);
      select.dispatchEvent(new Event('change', { bubbles: true }));
      check(
        controller.getState().gameIndex === count - 1 && select.value === String(count - 1),
        'Native game selection failed',
      );
      check(
        controller.goTo(controller.getState().record.games[0].id).ok,
        'Return to first game refused',
      );
      view.update({ board: { theme: 'flat' } });
      view.update({ messages: { black: 'Custom black' } });
      check(
        !observer.takeRecords().length && select.options[0] === originals[0],
        'Unrelated presentation rebuilt games',
      );
      check(
        controller.prepareExport().text === original && !controller.getState().dirty,
        'Navigation or presentation changed source',
      );
      view.update({ locale: 'ko', messages: undefined });
      check(
        select.options[0].textContent === 'Named' && select.options[1].textContent === '기보 2',
        'Locale or authored name stale',
      );
      view.update({ messages: { game: 'Custom {number}' } });
      check(select.options[1].textContent === 'Custom 2', 'Custom game template stale');
      view.update({ messages: undefined });
      check(select.options[1].textContent === '기보 2', 'Cleared game template stale');
      check(controller.setGameInfo({ gameName: 'Renamed' }).ok, 'Rename refused');
      check(select.options[0].textContent === 'Renamed', 'Renamed game option stale');
      check(controller.undo().ok && select.options[0].textContent === 'Named', 'Name Undo stale');
      check(controller.redo().ok && select.options[0].textContent === 'Renamed', 'Name Redo stale');
      check(
        controller.loadSgf('(;SZ[5]GN[])(;SZ[9]GN[Replacement])', { discardChanges: true }).ok,
        'Replacement refused',
      );
      check(
        select.options.length === 2 &&
          select.options[0].textContent === '' &&
          select.options[1].textContent === 'Replacement' &&
          select.value === '0',
        'Replacement or empty authored name stale',
      );
      check(
        controller.loadSgf('(;SZ[9])', { discardChanges: true }).ok,
        'Single-game load refused',
      );
      check(
        select.options.length === 1 &&
          select.options[0].textContent === '기보 1' &&
          select.parentElement.hidden,
        'Single-game visibility stale',
      );
      return { games: count, navigations: 16, optionReplacements: mutations, elapsedMs };
    } finally {
      observer.disconnect();
      view.dispose();
      controller.dispose();
      host.remove();
    }
  });
  console.log(JSON.stringify(sample));
  return 'banora-viewer-games-complete';
};

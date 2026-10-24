// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  await page.evaluate(async () => {
    const { mountControlledBoard } = await import('/sdk/index.js');
    const { SUPPORTED_LOCALES, createBoardLabels, createUiMessages, formatUiMessage } =
      await import('/sdk/locale.js');
    const host = document.createElement('div');
    document.body.append(host);
    const view = mountControlledBoard(host, {
      state: { key: 'localized-touch', width: 5, height: 5, stones: Array(25).fill(null) },
    });
    try {
      const panel = host.querySelector('[data-touch-confirm]');
      for (const locale of SUPPORTED_LOCALES) {
        const ui = createUiMessages({ locale });
        const labels = { ...createBoardLabels({ locale }) };
        view.update({ labels });
        labels.selected = labels.placement = 'Caller mutation';
        view.update({ theme: 'flat' });
        if (
          panel.getAttribute('aria-label') !==
            formatUiMessage(ui.placementAt, { coordinate: '' }) ||
          panel.querySelector('span').textContent !==
            formatUiMessage(ui.pointSelected, { coordinate: '' })
        )
          throw Error(`Controlled board lost localized labels: ${locale}`);
      }
      for (const labels of [{ selected: 'x'.repeat(1025) }, { placement: null }]) {
        const before = host.innerHTML;
        let rejected = false;
        try {
          view.update({ labels });
        } catch {
          rejected = true;
        }
        if (!rejected || host.innerHTML !== before)
          throw Error('Invalid touch labels changed controlled presentation');
      }
      view.update({
        labels: { selected: '<tag>$& {coordinate}', placement: '<tag>$& {coordinate}' },
      });
      if (panel.querySelector('span').textContent !== '<tag>$& ' || host.querySelector('tag'))
        throw Error('Custom touch labels were interpreted as markup or replacements');
      view.update({ labels: undefined });
      if (panel.querySelector('span').textContent !== ' selected.')
        throw Error('Clearing touch labels retained a translation');
    } finally {
      view.dispose();
      host.remove();
    }
  });
  return 'banora-touch-labels-complete';
};

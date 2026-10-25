// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const origin = new URL(page.url()).origin;
  await page.goto(`${origin}/studio/`);
  return page.evaluate(async () => {
    const sdk = await import('/sdk/index.js');
    const host = document.createElement('div');
    document.body.append(host);
    const controller = new sdk.RecordController({ sgf: `(;SZ[5]${';N[step]'.repeat(499)})` });
    const root = controller.getState().node;
    const view = sdk.mountComparison(host, {
      controller,
      left: root.id,
      right: root.children[0].id,
    });
    let created = 0;
    const original = document.createElement;
    const selects = [...host.querySelectorAll('select')];
    const options = () => [...host.querySelectorAll('option')];
    const initialOptions = options();
    const verify = (condition, message) => {
      if (!condition) throw Error(message);
    };
    const retained = (message) => {
      const current = options();
      verify(
        created === 0 &&
          current.length === initialOptions.length &&
          current.every((option, index) => option === initialOptions[index]),
        message,
      );
    };
    const replaced = (count, message) => {
      verify(created === count && options().length === count, message);
      created = 0;
    };
    document.createElement = function (tag, ...args) {
      if (tag === 'option') created++;
      return original.call(this, tag, ...args);
    };
    try {
      verify(
        initialOptions.length === 1000 && selects.length === 2,
        'Expected two bounded 500-row selectors',
      );
      selects[0].focus();
      verify(controller.next().ok, 'Navigation failed');
      retained('Cursor navigation rebuilt unchanged options');
      verify(document.activeElement === selects[0], 'Navigation lost selector focus');
      view.update({ left: root.children[0].id, right: root.id });
      retained('Changing pins within the prefix rebuilt unchanged options');
      verify(
        selects[0].value === root.children[0].id && selects[1].value === root.id,
        'Reused options lost selected values',
      );
      verify(controller.setComment('revised note').ok, 'Comment edit failed');
      retained('Comment-only record replacement rebuilt unchanged options');
      verify(
        host.querySelector('[data-notes="left"]').textContent === 'revised note',
        'Retained options prevented note refresh',
      );
      view.update({ board: { theme: 'flat', transform: { rotation: 90 } } });
      retained('Presentation-only update rebuilt unchanged options');
      view.update({ locale: 'ko' });
      replaced(1000, 'Locale change did not replace both selector label sets');
      verify(
        selects[0].getAttribute('aria-label') === '왼쪽 위치',
        'Locale did not update accessibility',
      );
      verify(options()[0] !== initialOptions[0], 'Locale retained stale option labels');
      view.update({ messages: { comparisonRow: 'Choice {caption} / {position} / {game}' } });
      replaced(1000, 'Message override did not refresh both selectors');
      verify(options()[0].textContent.startsWith('Choice '), 'Custom selector labels were stale');
      verify(controller.removeBranch(root.children[0].id).ok, 'Branch removal failed');
      replaced(4, 'Removed pinned branch did not refresh the fallback selector entry');
      verify(selects[0].value === root.children[0].id, 'Unavailable pinned target was lost');
      verify(controller.undo().ok, 'Branch Undo failed');
      replaced(1000, 'Undo did not restore the selector contents');
      verify(
        host.querySelector('[data-notes="left"]').textContent === 'revised note',
        'Undo did not restore the pinned note',
      );
      verify(
        controller.loadSgf(`(;SZ[5]${';N[extra]'.repeat(502)})`, { discardChanges: true }).ok,
        'Long replacement failed',
      );
      replaced(1000, 'Record replacement did not refresh the bounded prefix');
      let tail = controller.getState().node;
      while (tail.children.length) tail = tail.children[0];
      view.update({ right: tail.id });
      replaced(1002, 'Outside-prefix pin was not appended to both selectors');
      const selectedLabel = selects[1].selectedOptions[0].textContent;
      verify(controller.removeBranch(tail.id).ok, 'Outside-prefix branch removal failed');
      replaced(1002, 'Same-ID unavailable fallback label was not refreshed');
      verify(
        selects[1].value === tail.id && selects[1].selectedOptions[0].textContent !== selectedLabel,
        'Removed fallback retained its available caption',
      );
      verify(controller.undo().ok, 'Outside-prefix Undo failed');
      replaced(1002, 'Restored fallback label was not refreshed');
      verify(
        selects[1].selectedOptions[0].textContent === selectedLabel,
        'Undo changed the selected fallback caption',
      );
      verify(
        controller.loadSgf('(;SZ[9]N[replacement])', { discardChanges: true }).ok,
        'Final replacement failed',
      );
      replaced(2, 'Replacement retained stale selector rows');
      verify(
        selects.every((select) => select.value === controller.getState().node.id),
        'Replacement did not reset pins',
      );
      verify(
        options().every((option) => option.textContent.includes('replacement')),
        'Replacement labels were stale',
      );
      view.dispose();
      view.dispose();
      verify(
        !host.querySelector('.banora-comparison') &&
          controller.getState().record.games.length === 1,
        'Disposal failed or disposed the borrowed record',
      );
      return 'banora-comparison-options-complete';
    } finally {
      document.createElement = original;
      view.dispose();
      controller.dispose();
      host.remove();
    }
  });
};

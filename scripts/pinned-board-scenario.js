// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const origin = new URL(page.url()).origin;
  await page.goto(`${origin}/studio/`);
  return page.evaluate(async () => {
    const sdk = await import('/sdk/index.js');
    const host = document.createElement('div');
    document.body.append(host);
    const controller = new sdk.RecordController({
      sgf: `(;SZ[19]AB[dd];B[pp];W[dp]${';N[step]'.repeat(499)})`,
    });
    const root = controller.getState().node;
    const view = sdk.mountComparison(host, {
      controller,
      left: root.children[0].id,
      right: root.children[0].children[0].id,
    });
    const original = document.createElementNS;
    let created = 0;
    const verify = (condition, message) => {
      if (!condition) throw Error(message);
    };
    const boards = [...host.querySelectorAll('svg')];
    const contents = () => boards.map((svg) => [...svg.childNodes]);
    const retained = (before) => {
      const after = contents();
      return before.every(
        (nodes, side) =>
          nodes.length === after[side].length &&
          nodes.every((node, index) => node === after[side][index]),
      );
    };
    const left = root.children[0].id;
    const right = root.children[0].children[0].id;
    const other = document.createElement('div');
    document.body.append(other);
    let selectedView;
    let pinnedView;
    try {
      verify(
        boards.length === 2 && boards.every((svg) => svg.querySelector('[data-board-surface]')),
        'Immediate subscription did not paint both pinned boards',
      );
      boards[0].focus();
      boards[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
      verify(boards[0].querySelector('[data-cursor="1,0"]'), 'Pinned keyboard cursor did not move');
      const before = contents();
      const exported = view.exportSvg('left');
      document.createElementNS = function (...args) {
        created++;
        return original.apply(this, args);
      };
      verify(controller.next().ok && controller.next().ok, 'Navigation failed');
      verify(controller.previous().ok && controller.goTo(root.id).ok, 'Reverse navigation failed');
      document.createElementNS = original;
      verify(created === 0 && retained(before), 'Navigation repainted unchanged pinned SVGs');
      verify(document.activeElement === boards[0], 'Navigation moved pinned board focus');
      verify(view.exportSvg('left') === exported, 'Navigation changed the pinned diagram');
      view.update({ board: { transform: { rotation: 90 } }, locale: 'ko' });
      verify(
        !retained(before) && boards.every((svg) => svg.dataset.rotation === '90'),
        'Explicit presentation update was skipped',
      );
      verify(
        boards[0].getAttribute('aria-label').includes('바둑판'),
        'Localized board label was stale',
      );
      const transformed = contents();
      verify(controller.next().ok && retained(transformed), 'Stable transformed boards repainted');
      verify(controller.setComment('updated pinned note').ok, 'Comment edit failed');
      verify(!retained(transformed), 'Changed record was treated as unchanged');
      verify(
        host.querySelector('[data-notes="left"]').textContent === 'updated pinned note',
        'Pinned comment did not refresh',
      );
      verify(controller.goTo(root.id).ok, 'Root selection failed');
      const report = console.error;
      let failed = false;
      let failures = 0;
      try {
        document.createElementNS = function (...args) {
          if (!failed) {
            failed = true;
            throw Error('Injected pinned paint failure');
          }
          return original.apply(this, args);
        };
        console.error = function (message, ...args) {
          if (message === 'Banora state listener failed') failures++;
          else report.call(this, message, ...args);
        };
        verify(controller.setSetup([{ x: 3, y: 3, color: null }]).ok, 'Setup edit failed');
      } finally {
        document.createElementNS = original;
        console.error = report;
      }
      verify(failed && failures === 1, 'Injected paint failure was not isolated');
      verify(controller.next().ok, 'Paint retry navigation failed');
      verify(
        boards.every((svg) => !svg.querySelector('[data-stone="3,3"]')),
        'A failed paint was treated as complete instead of retried',
      );
      verify(controller.undo().ok, 'Setup Undo failed');
      verify(
        boards.every((svg) => svg.querySelector('[data-stone="3,3"]')),
        'Pinned stones did not follow Undo',
      );
      verify(controller.removeBranch(right).ok, 'Pinned branch removal failed');
      verify(
        boards[1].dataset.nodeStatus === 'unavailable' &&
          boards[0].dataset.comparisonStatus === 'unavailable',
        'Removed pin/reference was not invalidated',
      );
      verify(controller.undo().ok, 'Branch Undo failed');
      verify(
        boards.every((svg) => svg.dataset.nodeStatus === 'ready'),
        'Undo did not restore pins',
      );
      selectedView = sdk.mountBoard(other, { controller });
      pinnedView = sdk.mountBoard(other, { controller, nodeId: left, compareTo: right });
      const [selectedSvg, pinnedSvg] = other.querySelectorAll('svg');
      verify(controller.goTo(right).ok, 'Selected board navigation failed');
      verify(selectedSvg.dataset.nodeId === right, 'Unpinned board stopped following selection');
      verify(
        controller.loadSgf('(;SZ[9];B[cc];W[dd])', { discardChanges: true }).ok,
        'Import failed',
      );
      verify(
        pinnedSvg.dataset.nodeStatus === 'unavailable',
        'Reused IDs bypassed import generation',
      );
      pinnedView.update({ referenceGeneration: controller.getState().recordGeneration });
      verify(
        pinnedSvg.dataset.nodeStatus === 'ready' && pinnedSvg.querySelector('[data-stone="2,2"]'),
        'Explicit generation rebind did not refresh pinned stones',
      );
      verify(selectedSvg.dataset.boardWidth === '9', 'Unpinned board did not follow import');
      return 'banora-pinned-board-complete';
    } finally {
      document.createElementNS = original;
      pinnedView?.dispose();
      selectedView?.dispose();
      view.dispose();
      controller.dispose();
      other.remove();
      host.remove();
    }
  });
};

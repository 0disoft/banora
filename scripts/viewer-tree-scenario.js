// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const measured = await page.evaluate(async () => {
    const { RecordController, mountViewer } = await import('/sdk/index.js');
    const host = document.createElement('div');
    host.style.width = '520px';
    document.body.append(host);
    const sgf = `(;SZ[9]GN[Large authored tree]XX[viewer tree]${';B[];W[]'.repeat(350)};N[Authored annotation]MN[900]C[tail original])(;SZ[5]GN[Second];B[aa])`;
    const controller = new RecordController({ sgf });
    const view = mountViewer(host, { controller, editable: true });
    const tree = host.querySelector('[data-tree]');
    host.querySelector('details').open = true;
    const initial = controller.getState();
    const authored = controller.prepareExport().text;
    const rows = () => [...tree.querySelectorAll('button[data-node]')];
    const current = () => tree.querySelector('button[aria-current="true"]');
    const check = (condition, message) => {
      if (!condition) throw Error(message);
    };
    const samples = [];
    try {
      const originals = rows();
      const observer = new MutationObserver(() => {});
      observer.observe(tree, { childList: true });
      const start = performance.now();
      for (let i = 0; i < 100; i++) check(controller.next().ok, 'Linear navigation refused');
      const elapsedMs = performance.now() - start;
      const afterMoves = rows();
      samples.push({
        scope: '100 linear moves',
        elapsedMs,
        rootMutations: observer.takeRecords().length,
        retained: originals.filter((row, i) => afterMoves[i] === row).length,
        total: originals.length,
      });
      observer.disconnect();
      check(current()?.textContent === '100 · White pass', 'Wrong linear selection');
      check(tree.querySelectorAll('[aria-current="true"]').length === 1, 'Multiple selected rows');
      let node = initial.record.games[0];
      while (node.children[0]) node = node.children[0];
      check(controller.goTo(node.id).ok, 'Cannot select tail');
      check(current()?.textContent === '900 · Authored annotation', 'Lost MN/annotation tail');
      check(rows().length === 501, 'Tail row bound changed');
      current().focus();
      const tailBefore = current();
      check(controller.previous().ok, 'Tail previous refused');
      check(current()?.textContent === '700 · White pass', 'Tail selection mismatch');
      check(document.activeElement === current(), 'Tail replacement lost focus');
      check(!tailBefore.isConnected && rows().length === 501, 'Stale tail remained');
      check(controller.goTo(node.id).ok, 'Cannot return to annotation');
      const beforeEdit = rows();
      const comment = host.querySelector('textarea');
      comment.value = 'changed tail text';
      comment.dispatchEvent(new Event('input', { bubbles: true }));
      const afterEdit = rows();
      const retainedAfterComment = beforeEdit.every((row, i) => afterEdit[i] === row);
      samples.push({ scope: 'nonblank tail comment', retained: retainedAfterComment });
      check(current().querySelector('.banora-comment-indicator'), 'Comment indicator missing');
      check(controller.undo().ok && comment.value === 'tail original', 'Comment Undo failed');
      check(controller.setComment('').ok, 'Clear comment refused');
      check(!current().querySelector('.banora-comment-indicator'), 'Stale comment indicator');
      check(controller.undo().ok, 'Clear comment Undo failed');
      check(controller.previous().ok, 'Cannot select move for assessment');
      check(controller.setMoveAssessment('good').ok, 'Assessment refused');
      check(current().querySelector('.banora-move-assessment.good'), 'Stale assessment icon');
      check(
        controller.undo().ok && !current().querySelector('.banora-move-assessment'),
        'Assessment Undo failed',
      );
      const firstId = initial.record.games[0].id;
      check(controller.goTo(firstId).ok && rows().length === 500, 'Tail not removed on return');
      check(controller.goTo(initial.record.games[1].children[0].id).ok, 'Game switch refused');
      check(rows().length === 2 && current().textContent === '1 · Black A5', 'Game labels stale');
      view.update({ locale: 'ko' });
      check(current().textContent === '1 · 흑 A5', 'Language labels stale');
      view.update({ locale: 'en', messages: { black: 'Custom black' } });
      check(current().textContent === '1 · Custom black A5', 'Message override stale');
      view.update({ messages: undefined });
      check(current().textContent === '1 · Black A5', 'Cleared override stale');
      check(controller.prepareExport().text === authored, 'Presentation changed authored SGF');
      check(
        controller.loadSgf('(;SZ[9];B[aa](;W[bb];B[cc])(;W[dd];B[ee]))', { discardChanges: true })
          .ok,
        'Replacement refused',
      );
      view.update({ variationMode: 'focused' });
      const fork = controller.getState().node.children[0];
      const [a, b] = fork.children;
      check(controller.goTo(a.children[0].id).ok, 'First fork refused');
      check(
        tree.querySelector(`[data-node="${a.id}"]`).getAttribute('aria-expanded') === 'true',
        'Chosen fork stayed folded',
      );
      check(
        tree.querySelector(`[data-node="${b.id}"]`).getAttribute('aria-expanded') === 'false',
        'Other fork unfolded',
      );
      check(controller.goTo(b.children[0].id).ok, 'Second fork refused');
      check(
        !tree.querySelector(`[data-node="${a.children[0].id}"]`),
        'Old fork continuation remained',
      );
      check(current()?.dataset.node === b.children[0].id, 'Focused branch selection stale');
      view.update({ variationMode: 'all' });
      check(
        tree.querySelector(`[data-node="${a.children[0].id}"]`),
        'All mode retained folded tree',
      );
      const beforeDispose = controller.getState();
      view.dispose();
      view.dispose();
      check(!host.querySelector('.banora-viewer'), 'Viewer disposal retained DOM');
      check(
        controller.getState() === beforeDispose && controller.previous().ok,
        'Borrowed controller disposed',
      );
      return samples;
    } finally {
      view.dispose();
      controller.dispose();
      host.remove();
    }
  });
  const download = page.waitForEvent('download');
  await page.evaluate((samples) => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(samples)], { type: 'application/json' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'viewer-tree-samples.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, measured);
  await (await download).saveAs('output/playwright/viewer-tree-samples.json');
  if (
    measured[0].rootMutations ||
    measured[0].retained !== measured[0].total ||
    !measured[1].retained
  )
    throw Error(`Viewer rebuilt unchanged rows: ${JSON.stringify(measured)}`);
  return 'banora-viewer-tree-complete';
};

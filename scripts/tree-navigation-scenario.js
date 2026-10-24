// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (rootPage, studioControl) => {
  const origin = new URL(rootPage.url()).origin;
  const context = await rootPage.context().browser().newContext({ locale: 'en-US' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', () => errors.push('page-error'));
  const check = (ok, message) => {
    if (!ok) throw Error(message);
  };
  const current = page.locator('#tree button[aria-current="true"]');
  const selected = async (label, move, rows) => {
    check(
      (await current.count()) === 1 && (await current.textContent()) === label,
      'Tree selected the wrong row',
    );
    check(
      (await page.locator('#move').textContent()) === `Move ${move}`,
      'Tree move count diverged',
    );
    check((await page.locator('#tree button').count()) === rows, 'Tree selected-row bound changed');
  };
  try {
    await page.goto(`${origin}/studio/`);
    await page.locator('#language').selectOption('en');
    await page.locator('#file').setInputFiles({
      name: 'tree.sgf',
      mimeType: 'application/x-go-sgf',
      buffer: Buffer.from(
        `(;SZ[9]GN[First]XG[tree reuse]${';B[];W[]'.repeat(300)};N[Authored annotation]C[tail original]MN[700])(;SZ[5]GN[Second];B[aa]C[second comment];W[bb])`,
      ),
    });
    await selected('0 · Start position', 0, 500);
    const first = page.locator('#tree button').first();
    await first.focus();
    await page.keyboard.press('ArrowRight');
    await selected('1 · Black pass', 1, 500);
    check(
      await first.evaluate((element) => document.activeElement === element),
      'Navigation removed keyboard focus from the tree',
    );
    await page.keyboard.press('ArrowRight');
    await selected('2 · White pass', 2, 500);
    await page.locator('#last').click();
    await selected('700 · Authored annotation', 700, 500);
    await current.focus();
    const focusedTail = await current.getAttribute('data-node');
    await page.keyboard.press('ArrowLeft');
    await selected('600 · White pass', 600, 500);
    check(
      await page.evaluate(
        (id) =>
          document.activeElement?.getAttribute('data-node') === id &&
          document.querySelector('#tree').contains(document.activeElement),
        focusedTail,
      ),
      'Retained neighborhood lost keyboard focus',
    );
    await page.keyboard.press('ArrowLeft');
    await selected('599 · Black pass', 599, 500);
    await page.keyboard.press('ArrowRight');
    await selected('600 · White pass', 600, 500);
    await page.keyboard.press('ArrowRight');
    await selected('700 · Authored annotation', 700, 500);
    check(
      (await current.locator('.banora-comment-indicator').count()) === 1,
      'Tail comment indicator missing',
    );
    const commentWork = await page.evaluate(() => {
      const tree = document.querySelector('#tree');
      const rows = [...tree.children];
      const observer = new MutationObserver(() => {});
      observer.observe(tree, { childList: true });
      const comment = document.querySelector('#comment');
      comment.focus();
      const samplesMs = [];
      for (const text of ['tail edited', 'tail edited again']) {
        comment.value = text;
        const start = performance.now();
        comment.dispatchEvent(new Event('input', { bubbles: true }));
        samplesMs.push(performance.now() - start);
      }
      comment.blur();
      const removed = observer
        .takeRecords()
        .reduce((sum, entry) => sum + entry.removedNodes.length, 0);
      observer.disconnect();
      return {
        retained: rows.filter((row) => row.parentElement === tree).length,
        total: rows.length,
        removed,
        samplesMs,
      };
    });
    const measurement = page.waitForEvent('download');
    await page.evaluate((value) => {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(value)], { type: 'application/json' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = 'tree-comment-work.json';
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, commentWork);
    await (await measurement).saveAs('output/playwright/tree-comment-work.json');
    check(
      commentWork.retained === commentWork.total && commentWork.removed === 0,
      `Comment edit rebuilt unchanged tree rows: ${JSON.stringify(commentWork)}`,
    );
    await page.locator('#undo').click();
    check(
      (await page.locator('#comment').inputValue()) === 'tail original',
      'Retained tree rows changed grouped comment Undo',
    );
    await page.locator('#comment').fill(' ');
    await page.locator('#comment').blur();
    check(
      (await current.locator('.banora-comment-indicator').count()) === 0,
      'Edited tail retained its old comment indicator',
    );
    await page.locator('#undo').click();
    await selected('700 · Authored annotation', 700, 500);
    check(
      (await current.locator('.banora-comment-indicator').count()) === 1 &&
        (await page.locator('#comment').inputValue()) === 'tail original',
      'Undo did not rebuild the current authored row',
    );
    await page.locator('#language').selectOption('ko');
    check(
      (await current.textContent()) === '700 · Authored annotation' &&
        (await current.getAttribute('aria-description')) === '코멘트 있음',
      'Language change failed to rebuild localized descriptions or changed authored labels',
    );
    await page.locator('#language').selectOption('en');
    await studioControl(page, '#games', 'record', () => page.locator('#games').selectOption('1'));
    await selected('0 · Start position', 0, 3);
    await page.locator('#next').click();
    await selected('1 · Black A5', 1, 3);
    check(
      (await page.locator('#comment').inputValue()) === 'second comment',
      'Switching games kept old tree metadata',
    );
    await studioControl(page, '#games', 'record', () => page.locator('#games').selectOption('0'));
    await selected('0 · Start position', 0, 500);
    await page.locator('#last').click();
    await selected('700 · Authored annotation', 700, 500);
    await page.locator('#first').click();
    await selected('0 · Start position', 0, 500);
    const event = page.waitForEvent('download');
    await page.locator('#export').click();
    await (await event).saveAs('output/playwright/tree-reused.sgf');
    await page.locator('#file').setInputFiles('output/playwright/tree-reused.sgf');
    await selected('0 · Start position', 0, 500);
    check(
      (await page.locator('#dirty').textContent()) === 'No changes' && !errors.length,
      'Tree navigation/export changed the record or failed',
    );
    await page.screenshot({ path: 'output/playwright/tree-reused.png' });
    await page.locator('#file').setInputFiles({
      name: 'distant-fork.sgf',
      mimeType: 'application/x-go-sgf',
      buffer: Buffer.from(`(;SZ[9]${';B[];W[]'.repeat(350)}(;B[aa];W[bb])(;B[cc];W[dd]))`),
    });
    await page.locator('#last').click();
    check((await page.locator('#tree button').count()) <= 500, 'Distant Studio rows exceeded cap');
    const distantChoice = page.locator('#tree button').filter({ hasText: '701 · Black C7' });
    await distantChoice.click();
    check(
      (await current.textContent()) === '701 · Black C7',
      'Distant Studio choice was not selectable',
    );
    check(
      (await page.locator('#tree button').filter({ hasText: '702 · White D6' }).count()) === 1,
      'Distant Studio continuation missing',
    );
    check(
      (await page.locator('#tree button').filter({ hasText: '702 · White B8' }).count()) === 0,
      'Other distant Studio continuation unfolded',
    );
    const nestedSgf =
      '(;SZ[19];B[pd];W[dd](;B[dj](;W[hj](;B[kh];W[ll])(;B[ij];W[hi]TE[1]C[Continuation];B[hk]BM[1]))(;W[pp]))(;B[dp]))';
    await page.locator('#file').setInputFiles({
      name: 'nested-tree.sgf',
      mimeType: 'application/x-go-sgf',
      buffer: Buffer.from(nestedSgf),
    });
    const treeMove = (label) => page.locator('#tree button').filter({ hasText: label });
    for (const label of ['3 · Black D10', '4 · White H10', '5 · Black J10'])
      await treeMove(label).click();
    const dotX = (label) =>
      treeMove(label)
        .locator('.tree-dot')
        .evaluate((element) => element.getBoundingClientRect().x);
    const branchX = await dotX('5 · Black J10');
    check(
      (await dotX('5 · Black L12')) === branchX &&
        (await dotX('6 · White H11')) === branchX &&
        (await dotX('7 · Black H9')) === branchX,
      'Nested sibling and linear continuation dots diverged from their branch indentation',
    );
    check(
      (await dotX('3 · Black D10')) < (await dotX('4 · White H10')) &&
        (await dotX('4 · White H10')) < branchX,
      'Nested forks lost cumulative indentation',
    );
    check(
      (await treeMove('6 · White H11').getAttribute('aria-expanded')) === null &&
        (await treeMove('5 · Black J10').getAttribute('aria-expanded')) === 'true',
      'Reserved disclosure space created a false expandable continuation',
    );
    await treeMove('6 · White H11').click();
    check(
      (await dotX('6 · White H11')) === branchX && (await dotX('7 · Black H9')) === branchX,
      'Reused continuation rows lost branch alignment',
    );
    await treeMove('5 · Black L12').click();
    check(
      (await treeMove('6 · White H11').count()) === 0 &&
        (await treeMove('7 · Black H9').count()) === 0 &&
        (await dotX('6 · White M8')) === (await dotX('5 · Black L12')),
      'Changing a nested fork did not fold the old path or align the selected continuation',
    );
    const viewerResult = await page.evaluate(async (sgf) => {
      const { RecordController, mountViewer } = await import('/sdk/index.js');
      const host = document.createElement('section');
      document.body.append(host);
      const controller = new RecordController({ sgf });
      const view = mountViewer(host, { controller, variationMode: 'focused' });
      try {
        const before = controller.prepareExport().text;
        const branch =
          controller.getState().node.children[0].children[0].children[0].children[0].children[1];
        controller.goTo(branch.id);
        const textX = (label) => {
          const entry = [...host.querySelectorAll('button[data-node]')].find(
            (element) => element.textContent === label,
          );
          const text = [...entry.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
          const range = document.createRange();
          range.selectNodeContents(text);
          return range.getBoundingClientRect().x;
        };
        const x = textX('5 · Black J10');
        return {
          aligned:
            textX('5 · Black L12') === x &&
            textX('6 · White H11') === x &&
            textX('7 · Black H9') === x,
          preserved: controller.prepareExport().text === before,
        };
      } finally {
        view.dispose();
        controller.dispose();
        host.remove();
      }
    }, nestedSgf);
    check(viewerResult.aligned, 'Common focused Viewer shifted linear text left after a fork');
    check(viewerResult.preserved, 'Viewer layout changed authored content');
    check(!errors.length, 'Nested variation alignment raised a page error');
    return 'banora-tree-navigation-complete';
  } finally {
    await context.close();
  }
};

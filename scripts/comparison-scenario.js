// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page, studioControl) => {
  const origin = new URL(page.url()).origin;
  await page.goto(`${origin}/studio/`);
  await page.evaluate(async () => {
    const sdk = await import('/sdk/index.js');
    const host = document.createElement('div');
    host.id = 'comparison-fixture';
    host.style.cssText = 'width:100%;max-width:960px;margin:30px auto;padding:16px;';
    const sentinel = document.createElement('p');
    sentinel.textContent = 'Host content';
    host.append(sentinel);
    document.body.append(host);
    const controller = new sdk.RecordController({
      sgf: '(;SZ[5:9]AB[bc][de]XX[keep](;AW[bc]AE[de]AB[ei]C[Right note]LB[bc:R])(;AW[bc]AE[de]AB[ei]C[Same stones]))(;SZ[9])',
    });
    const initial = controller.getState(),
      root = initial.node,
      left = root.id,
      right = root.children[0].id,
      alternate = root.children[1].id;
    const view = sdk.mountComparison(host, { controller, left, right });
    const region = host.querySelector('[role="region"]'),
      a = region.querySelector('[data-position="left"] svg'),
      b = region.querySelector('[data-position="right"] svg');
    const verify = (condition, message) => {
      if (!condition) throw Error(message);
    };
    const summary = () => region.querySelector('[data-result]').textContent;
    const localizationState = controller.getState();
    for (const [locale, leftLabel, rightLabel, changed] of [
      ['ko', '왼쪽 위치', '오른쪽 위치', '변경 3'],
      ['zh', '左侧局面', '右侧局面', '变化 3'],
      ['ja', '左の局面', '右の局面', '変更 3'],
    ]) {
      view.update({ locale });
      verify(
        region.querySelector(`[aria-label="${leftLabel}"]`).value === left &&
          region.querySelector(`[aria-label="${rightLabel}"]`).value === right &&
          summary().startsWith(changed) &&
          region.querySelector('[data-notes="right"]').textContent === 'Right note' &&
          a.dataset.nodeId === left &&
          b.dataset.nodeId === right &&
          controller.getState() === localizationState,
        'Comparison localization changed pins, authored comments or controller state',
      );
    }
    const custom = { leftPosition: '<tag>Custom</tag>' };
    view.update({ locale: 'ko', messages: custom });
    custom.leftPosition = 'Mutated';
    view.update({ right });
    verify(
      region.querySelector('select').getAttribute('aria-label') === '<tag>Custom</tag>' &&
        !region.querySelector('tag'),
      'Comparison message override was mutated or interpreted as HTML',
    );
    for (const next of [
      { locale: 'invalid', left: alternate },
      { messages: { leftPosition: 3 }, right: alternate },
    ]) {
      let rejected = false;
      try {
        view.update(next);
      } catch {
        rejected = true;
      }
      verify(
        rejected && a.dataset.nodeId === left && b.dataset.nodeId === right,
        'Invalid comparison locale update changed pinned nodes',
      );
    }
    view.update({ locale: 'en', messages: {} });
    verify(
      summary().startsWith('3 changed intersections · +1 added · −1 removed · ↔1 color changed'),
      'Comparison summary failed',
    );
    verify(
      b.querySelectorAll('[data-difference]').length === 3 &&
        b.querySelector('[data-point="4,8"]').dataset.difference === 'added',
      'Addition highlight missing',
    );
    verify(
      b.querySelector('[data-point="3,4"]').dataset.difference === 'removed' &&
        b.querySelector('[data-point="1,2"]').dataset.difference === 'replaced',
      'Removal/replacement highlights failed',
    );
    verify(
      b.querySelector('[data-marker="1,2"]').textContent === 'R' &&
        region.querySelector('[data-notes="right"]').textContent === 'Right note',
      'Pinned node lost annotations/comments',
    );
    a.focus();
    for (const key of ['Enter', 'PageDown', 'PageUp'])
      a.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    const screen = a.createSVGPoint();
    screen.x = 2.25;
    screen.y = 3.25;
    const point = screen.matrixTransform(a.getScreenCTM());
    a.dispatchEvent(
      new PointerEvent('pointerup', { clientX: point.x, clientY: point.y, button: 0 }),
    );
    verify(controller.getState() === initial, 'Pinned board input navigated/edited the controller');
    const xml = new DOMParser().parseFromString(
      view.exportSvg('right', { width: 520 }),
      'image/svg+xml',
    );
    verify(
      !xml.querySelector('parsererror') &&
        xml.querySelectorAll('[data-difference]').length === 3 &&
        !xml.querySelector('[data-cursor],[data-preview]'),
      'Comparison SVG failed',
    );
    const bitmap = await createImageBitmap(await view.exportPng('right', { width: 520 }));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    const pixel = context.getImageData(420, 701, 1, 1).data;
    verify(
      pixel[0] === 15 && pixel[1] === 118 && pixel[2] === 110 && pixel[3] === 255,
      'Comparison PNG lost added-stone highlight: ' + [...pixel],
    );
    for (const rotation of [0, 90, 180, 270])
      for (const flipX of [false, true]) {
        view.update({
          board: { transform: { rotation, flipX }, crop: { x: 1, y: 2, width: 4, height: 7 } },
        });
        const highlight = b.querySelector('[data-point="4,8"]'),
          shown = sdk.toDisplayPoint({ x: 4, y: 8 }, { width: 5, height: 9 }, { rotation, flipX });
        verify(
          Math.abs(Number(highlight.getAttribute('x')) - (shown.x + 1.25 - 0.49)) < 0.0001 &&
            Math.abs(Number(highlight.getAttribute('y')) - (shown.y + 1.25 - 0.49)) < 0.0001,
          'Transformed difference coordinates failed',
        );
        verify(
          controller.getState() === initial,
          'Comparison configuration edited the main record',
        );
      }
    const before = region.innerHTML;
    for (const config of [
      { right: 'absent' },
      { board: { transform: { rotation: 45 } } },
      { board: { crop: { x: 4, y: 8, width: 2, height: 2 } } },
    ]) {
      let rejected = false;
      try {
        view.update(config);
      } catch {
        rejected = true;
      }
      verify(
        rejected && region.innerHTML === before && controller.getState() === initial,
        'Invalid comparison update was not atomic',
      );
    }
    view.update({ left: right, right: alternate });
    verify(
      summary().startsWith('0 changed intersections'),
      'Comments/labels counted as stone differences',
    );
    view.update({ left, right, board: { crop: null, transform: undefined } });
    controller.removeBranch(right);
    verify(
      b.dataset.nodeStatus === 'unavailable' && summary().includes('unavailable'),
      'Removed comparison node fell back to the cursor',
    );
    let unavailableExport = false;
    try {
      view.exportSvg('right');
    } catch {
      unavailableExport = true;
    }
    verify(unavailableExport, 'Unavailable pinned node exported the wrong board');
    controller.undo();
    verify(
      b.dataset.nodeStatus === 'ready' && summary().startsWith('3 changed'),
      'Undo did not restore pinned branch',
    );
    view.update({ left: right, right: alternate });
    controller.removeBranch(right);
    controller.removeBranch(alternate);
    view.update({ left });
    verify(
      a.dataset.nodeStatus === 'ready' && b.dataset.nodeStatus === 'unavailable',
      'Recovering one missing comparison side failed',
    );
    view.update({ right: left });
    verify(summary().startsWith('0 changed'), 'Recovering both comparison sides failed');
    controller.undo();
    controller.undo();
    view.update({ left, right });
    const other = initial.record.games[1].id;
    view.update({ right: other });
    verify(
      summary().startsWith('Different board dimensions') &&
        b.dataset.comparisonStatus === 'different-size' &&
        !b.querySelector('[data-difference]'),
      'Mismatched board sizes were silently compared',
    );
    view.update({ right });
    const pinnedHost = document.createElement('div');
    pinnedHost.style.width = '320px';
    host.append(pinnedHost);
    const pinned = sdk.mountBoard(pinnedHost, { controller, nodeId: right, compareTo: left });
    const pinnedSvg = pinnedHost.querySelector('svg');
    controller.loadSgf('(;SZ[9]GN[Replacement];B[hh])', { discardChanges: true });
    verify(
      summary().startsWith('0 changed') &&
        a.dataset.nodeId === controller.getState().node.id &&
        b.dataset.nodeId === controller.getState().node.id,
      'Comparison did not reset recycled IDs on import',
    );
    verify(
      pinnedSvg.dataset.nodeStatus === 'unavailable',
      'Pinned board silently rebound a recycled ID',
    );
    pinned.update({ nodeId: right, compareTo: left, theme: 'flat' });
    verify(
      pinnedSvg.dataset.nodeStatus === 'unavailable',
      'Unrelated option update rebound a stale pin',
    );
    pinned.update({ referenceGeneration: controller.getState().recordGeneration });
    verify(
      pinnedSvg.dataset.nodeStatus === 'ready' && pinnedSvg.querySelector('[data-stone="7,7"]'),
      'Explicit generation rebinding failed',
    );
    controller.loadSgf(
      '(;SZ[9]' + Array.from({ length: 700 }, (_, i) => `;${i % 2 ? 'W' : 'B'}[aa]`).join('') + ')',
      { discardChanges: true },
    );
    let leaf = controller.getState().node;
    while (leaf.children.length) leaf = leaf.children[0];
    const cursor = controller.getState();
    view.update({ left: leaf.id });
    verify(
      region.querySelector('[aria-label="Left position"]').value === leaf.id &&
        region.querySelector('[aria-label="Left position"]').options.length <= 502 &&
        region.querySelector('[data-limit]').textContent.includes('500'),
      'Large-record selection was truncated or unbounded',
    );
    verify(controller.getState() === cursor, 'Inspecting a deep comparison node moved the cursor');
    const portals = document.querySelectorAll('[data-touch-lens]').length;
    pinned.dispose();
    view.dispose();
    view.dispose();
    verify(
      document.querySelectorAll('[data-touch-lens]').length === portals - 3 &&
        host.children.length === 2 &&
        host.contains(sentinel) &&
        controller.getState() === cursor,
      'Comparison disposal leaked resources or destroyed host content/controller',
    );
    pinnedHost.remove();
    controller.dispose();
    host.remove();
    const collection = new sdk.RecordController({
      sgf: '(;SZ[9]' + ';B[];W[]'.repeat(250) + ')' + '(;SZ[9])'.repeat(999),
    });
    const collectionState = collection.getState();
    const chosen = collectionState.record.games.at(-1).id;
    const hidden = new Set(collectionState.record.games.slice(1, -1).map((node) => node.id));
    const inspect = collection.inspectNode.bind(collection);
    collection.inspectNode = (id) => {
      if (hidden.has(id)) throw Error('Comparison selector replayed a hidden game');
      return inspect(id);
    };
    const collectionHost = document.createElement('div');
    document.body.append(collectionHost);
    let collectionView;
    try {
      collectionView = sdk.mountComparison(collectionHost, {
        controller: collection,
        right: chosen,
      });
      collectionView.update({ locale: 'ko' });
      const select = collectionHost.querySelector('[data-pane="right"] select');
      verify(
        select.value === chosen &&
          select.options.length === 501 &&
          collectionHost.querySelector('[data-limit]').textContent &&
          collection.getState() === collectionState,
        'Bounded collection selector lost the chosen hidden node, limit notice or cursor',
      );
    } finally {
      collectionView?.dispose();
      collection.dispose();
      collectionHost.remove();
    }
    return 'Pinned inspection, changed-stone highlights, crop/transforms, SVG/PNG, deletion/Undo, recycled IDs, bounded selectors and disposal passed';
  });
  await page.goto(`${origin}/studio/`);
  await page.locator('#file').setInputFiles({
    name: 'compare.sgf',
    mimeType: 'application/x-go-sgf',
    buffer: Buffer.from(
      '(;SZ[5:9]GN[Comparison study]AB[bc][de](;AW[bc]AE[de]AB[ei]C[Right note])(;AW[bc]AE[de]AB[ei]C[Alternate note]))',
    ),
  });
  await page.waitForFunction(
    () => document.querySelector('#game-name').textContent === 'Comparison study',
  );
  await studioControl(page, '#compare', 'comparison', () => page.locator('#compare').click());
  const studio = page.locator('#comparison-panel');
  if (!(await studio.locator('[data-result]').innerText()).startsWith('3 changed'))
    throw Error('Studio comparison initial pair failed');
  await studio.getByRole('combobox', { name: 'Left position', exact: true }).selectOption('n2');
  await studio.getByRole('combobox', { name: 'Right position', exact: true }).selectOption('n3');
  if (
    !(await studio.locator('[data-result]').innerText()).startsWith('0 changed') ||
    (await page.locator('#dirty').innerText()) !== 'No changes' ||
    (await page.locator('#board svg').getAttribute('data-node-id')) !== 'n1'
  )
    throw Error('Studio comparison selection navigated/edited the main controller');
  await page.locator('#next').click();
  await studioControl(page, '#pin-right', 'comparison', () => page.locator('#pin-right').click());
  if (
    (await studio.getByRole('combobox', { name: 'Right position', exact: true }).inputValue()) !==
    'n2'
  )
    throw Error('Studio pin-current failed');
  await studio.getByRole('combobox', { name: 'Left position', exact: true }).selectOption('n1');
  await studioControl(page, '#rotation', 'view', () =>
    page.locator('#rotation').selectOption('90'),
  );
  await page.locator('#flip-x').check();
  if (
    (await studio.locator('[data-position="left"] svg').getAttribute('data-rotation')) !== '90' ||
    (await studio.locator('[data-position="right"] svg').getAttribute('data-flip-x')) !== 'true'
  )
    throw Error('Studio comparison transform update missing');
  await page.screenshot({ path: 'output/playwright/studio-comparison.png', fullPage: true });
  await studioControl(page, '#compare', 'comparison', () => page.locator('#compare').click());
  if (
    (await studio.locator('svg').count()) ||
    (await page.locator('#board svg').getAttribute('data-node-id')) !== 'n2'
  )
    throw Error('Studio comparison disposal left DOM or changed cursor');
  for (const framework of ['react', 'vue', 'svelte']) {
    await page.goto(`${origin}/${framework}/`);
    await studioControl(page, '#compare', 'comparison', () => page.locator('#compare').click());
    const left = page.locator('#compare-left svg'),
      right = page.locator('#compare-right svg');
    await left.waitFor();
    if (
      (await left.getAttribute('data-node-id')) !== 'n1' ||
      (await right.getAttribute('data-node-id')) !== 'n2' ||
      (await right.locator('[data-difference]').count()) !== 1
    )
      throw Error(`${framework}: comparison props did not render pinned nodes/highlights`);
    const initial = await page.locator('#state').innerText();
    await right.focus();
    await page.keyboard.press('PageDown');
    await page.keyboard.press('Enter');
    if ((await page.locator('#state').innerText()) !== initial)
      throw Error(`${framework}: pinned input mutated/navigated controller`);
    await page.locator('#advance').click();
    if (
      (await left.getAttribute('data-node-id')) !== 'n1' ||
      (await right.getAttribute('data-node-id')) !== 'n2'
    )
      throw Error(`${framework}: normal navigation moved comparison pins`);
    await studioControl(page, '#pin-left', 'comparison', () => page.locator('#pin-left').click());
    await page.waitForFunction(() =>
      document.querySelector('#comparison-summary').textContent.startsWith('0 changed'),
    );
    await page.locator('#advance').click();
    await studioControl(page, '#pin-right', 'comparison', () => page.locator('#pin-right').click());
    await page.waitForFunction(() =>
      document.querySelector('#comparison-summary').textContent.startsWith('1 changed'),
    );
    await page.locator('#rotate').click();
    await page.locator('#reflect').click();
    if (
      (await left.getAttribute('data-rotation')) !== '90' ||
      (await right.getAttribute('data-flip-x')) !== 'true'
    )
      throw Error(`${framework}: comparison transform updates missing`);
    const before = await page.locator('#state').innerText(),
      leftId = await left.getAttribute('data-node-id'),
      rightId = await right.getAttribute('data-node-id');
    await page.locator('#toggle').click();
    if (
      (await page.locator('#comparison-host').count()) ||
      (await page.locator('[data-touch-lens]').count())
    )
      throw Error(`${framework}: comparison unmount leaked DOM/portals`);
    await page.locator('#toggle').click();
    await left.waitFor();
    if (
      (await left.getAttribute('data-node-id')) !== leftId ||
      (await right.getAttribute('data-node-id')) !== rightId ||
      (await page.locator('#state').innerText()) !== before
    )
      throw Error(`${framework}: remount lost comparison/current controller`);
    await page.locator('#swap').click();
    if (await page.locator('#comparison-host').count())
      throw Error(`${framework}: old comparison followed a different controller`);
    await page.locator('#swap').click();
    await left.waitFor();
    if (
      (await left.getAttribute('data-node-id')) !== leftId ||
      (await page.locator('#state').innerText()) !== before
    )
      throw Error(`${framework}: comparison owner restoration failed`);
    await page.screenshot({
      path: `output/playwright/${framework}-comparison.png`,
      fullPage: true,
    });
    await studioControl(page, '#compare', 'comparison', () => page.locator('#compare').click());
    if (
      (await page.locator('#comparison-host').count()) ||
      (await page.locator('#state').innerText()) !== before
    )
      throw Error(`${framework}: closing comparison edited the controller`);
  }
  return 'banora-comparison-complete';
};

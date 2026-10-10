// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  const result = await page.evaluate(async () => {
    const sdk = await import('/sdk/index.js');
    const verify = (value, message) => {
      if (!value) throw Error(message);
    };
    const host = document.createElement('div');
    host.style.cssText = 'width:520px;margin:20px auto';
    document.body.append(host);
    const beforeLenses = document.querySelectorAll('[data-touch-lens]').length;
    const state = {
      key: 'host/document/node/revision-1',
      width: 5,
      height: 3,
      stones: Array(15).fill(null),
      toPlay: 'white',
      moveNumber: 42,
      captures: { black: 2, white: 3 },
      markers: [{ kind: 'label', point: { x: 0, y: 0 }, label: '<img src=x onerror=alert(1)>' }],
      overlays: [
        {
          kind: 'badge',
          point: { x: 2, y: 1 },
          color: '#2266aa',
          label: 'A',
          ariaLabel: 'Host candidate A',
        },
        { kind: 'heatmap', point: { x: 3, y: 1 }, color: '#dd3322', opacity: 0.3 },
        { kind: 'ring', point: { x: 4, y: 1 }, color: '#228855' },
      ],
    };
    state.stones[0] = 'black';
    const intents = [];
    const view = sdk.mountControlledBoard(host, {
      state,
      onIntent: (intent) => intents.push(intent),
      contextMenu: true,
      labels: {
        board: 'Host board',
        point: 'Point {coordinate}: {stone}',
        white: 'White stone',
        empty: 'Open point',
      },
    });
    const svg = host.querySelector('svg');
    verify(
      !('controller' in view) && !('rules' in view.getSnapshot()),
      'A controlled board exposed a local game engine',
    );
    const snapshot = view.getSnapshot();
    state.stones[0] = null;
    verify(
      snapshot.stones[0] === 'black' && svg.querySelectorAll('[data-stone]').length === 1,
      'Host state was borrowed or mutated',
    );
    verify(
      svg.getAttribute('aria-label') === 'Host board' && !svg.querySelector('img'),
      'Host labels were interpreted as markup',
    );
    verify(svg.querySelectorAll('[data-overlay]').length === 3, 'Host overlays were missing');
    const input = (point, kind = 'pointerup') => {
      const displayed = sdk.toDisplayPoint(point, view.getSnapshot(), {
        rotation: Number(svg.getAttribute('data-rotation')),
        flipX: svg.getAttribute('data-flip-x') === 'true',
      });
      const vector = svg.createSVGPoint();
      vector.x = displayed.x + 1.25;
      vector.y = displayed.y + 1.25;
      const screen = vector.matrixTransform(svg.getScreenCTM());
      const Constructor = kind === 'contextmenu' ? MouseEvent : PointerEvent;
      svg.dispatchEvent(
        new Constructor(kind, {
          clientX: screen.x,
          clientY: screen.y,
          button: kind === 'contextmenu' ? 2 : 0,
          pointerType: 'mouse',
          pointerId: 1,
          isPrimary: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    };
    for (const rotation of [0, 90, 180, 270])
      for (const flipX of [false, true]) {
        view.update({ transform: { rotation, flipX } });
        input({ x: 2, y: 1 });
        const event = intents.at(-1);
        verify(
          event.type === 'point' &&
            event.point.x === 2 &&
            event.point.y === 1 &&
            event.stateKey === snapshot.key,
          'Transformed intent lost logical coordinates or host identity',
        );
        verify(
          view.getSnapshot() === snapshot && Object.isFrozen(event) && Object.isFrozen(event.point),
          'An intention applied a local move',
        );
      }
    view.update({
      transform: { rotation: 0 },
      state: {
        ...snapshot,
        key: 'host/document/node/revision-2',
        visiblePoints: [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
        ],
        dimPoints: [{ x: 2, y: 0 }],
      },
    });
    let count = intents.length;
    input({ x: 1, y: 0 });
    verify(intents.length === count, 'Hidden intersection accepted input');
    input({ x: 2, y: 0 });
    verify(intents.at(-1).stateKey.endsWith('revision-2'), 'New host key was not forwarded');
    input({ x: 0, y: 0 });
    svg.focus();
    svg.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    );
    verify(
      svg.querySelector('[data-cursor]').getAttribute('data-cursor') === '2,0',
      'Keyboard cursor lost nonrectangular visibility',
    );
    svg.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, cancelable: true }),
    );
    verify(
      intents.at(-1).type === 'navigate' && intents.at(-1).direction === 'next',
      'Navigation was handled by a local record',
    );
    input({ x: 2, y: 0 }, 'contextmenu');
    verify(intents.at(-1).type === 'context-menu', 'Host context menu did not receive an intent');
    const accepted = view.getSnapshot();
    try {
      view.update({
        state: { ...accepted, key: 'must-not-commit' },
        crop: { x: 0, y: 0, width: 99, height: 2 },
        onIntent: () => {
          throw Error('Rejected handler committed');
        },
      });
      throw Error('Invalid crop accepted');
    } catch (error) {
      verify(String(error).includes('Crop'), 'Invalid update did not fail at crop validation');
    }
    verify(
      view.getSnapshot() === accepted && svg.getAttribute('data-node-id') === accepted.key,
      'Failed update committed partial state',
    );
    input({ x: 2, y: 0 });
    verify(intents.at(-1).stateKey === accepted.key, 'Failed update replaced the callback');
    view.update({ readOnly: true });
    count = intents.length;
    input({ x: 2, y: 0 });
    svg.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
    );
    verify(intents.length === count, 'Read-only view forwarded a placement');
    view.update({
      readOnly: false,
      state: { ...accepted, visiblePoints: [] },
      drawing: { color: '#224466' },
    });
    count = intents.length;
    for (const key of [' ', 'ArrowRight', 'Enter'])
      svg.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    verify(
      intents.length === count && !svg.querySelector('[data-cursor]'),
      'An empty mask exposed input',
    );
    view.update({
      readOnly: false,
      state: { ...accepted, visiblePoints: null },
      drawing: { color: '#224466', width: 0.1 },
    });
    for (const key of [' ', 'ArrowDown', ' ', 'Enter'])
      svg.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    verify(
      intents.at(-1).type === 'stroke' &&
        Object.isFrozen(intents.at(-1).points) &&
        view.getSnapshot().strokes.length === 0,
      'Ink was committed locally',
    );
    view.update({
      drawing: null,
      state: {
        ...accepted,
        visiblePoints: [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
          { x: 2, y: 1 },
        ],
        numbers: [{ point: { x: 0, y: 0 }, value: 42 }],
      },
      moveNumbers: true,
    });
    const diagram = view.exportSvg({ width: 400, title: 'Host board & snapshot' });
    const parsed = new DOMParser().parseFromString(diagram, 'image/svg+xml');
    verify(
      !parsed.querySelector('parsererror') &&
        parsed.querySelector('clipPath') &&
        diagram.includes('&lt;img') &&
        !diagram.includes('data-cursor'),
      'Controlled diagram lost masks/text safety or retained cursor',
    );
    const png = await view.exportPng({ width: 400 });
    const signature = [...new Uint8Array(await png.arrayBuffer()).slice(0, 8)].join(',');
    verify(signature === '137,80,78,71,13,10,26,10', 'Controlled PNG was not an actual image');
    view.update({
      state: { key: 'smaller-host', width: 2, height: 2, stones: [null, 'black', 'white', null] },
      crop: null,
    });
    verify(svg.getAttribute('data-board-width') === '2', 'Host dimension replacement failed');
    view.announce('Host rejected this request');
    verify(
      host.querySelector('[aria-live]').textContent === 'Host rejected this request',
      'Host rejection announcement failed',
    );
    count = intents.length;
    view.dispose();
    view.dispose();
    svg.dispatchEvent(
      new PointerEvent('pointerup', {
        button: 0,
        pointerId: 1,
        pointerType: 'mouse',
        isPrimary: true,
      }),
    );
    verify(
      intents.length === count &&
        !host.querySelector('svg') &&
        document.querySelectorAll('[data-touch-lens]').length === beforeLenses,
      'Controlled disposal leaked listeners or UI',
    );
    let failed = false;
    try {
      view.getSnapshot();
    } catch {
      failed = true;
    }
    verify(failed, 'Disposed view returned active host state');
    host.remove();
    return 'controlled-contract-verified';
  });
  if (result !== 'controlled-contract-verified')
    throw Error('Controlled board contract did not finish');
  return 'banora-controlled-complete';
};

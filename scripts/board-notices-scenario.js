// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
  await page.evaluate(async () => {
    const { RecordController } = await import('/sdk/controller.js');
    const { mountBoard } = await import('/sdk/board.js');
    const { mountControlledBoard } = await import('/sdk/controlled-board.js');
    const { createBoardLabels, SUPPORTED_LOCALES, formatUiMessage, formatUiFailure } =
      await import('/sdk/locale.js');
    const verify = (value, message) => {
      if (!value) throw Error(message);
    };
    const nativeHost = document.createElement('div'),
      controlledHost = document.createElement('div');
    document.body.append(nativeHost, controlledHost);
    const controller = new RecordController({ sgf: '(;SZ[5]AB[aa]PL[B]XX[keep])' });
    const native = mountBoard(nativeHost, {
      controller,
      labels: createBoardLabels({ locale: 'en' }),
    });
    const state = { key: 'host-doc', width: 5, height: 5, stones: Array(25).fill(null) };
    const intents = [];
    const controlled = mountControlledBoard(controlledHost, {
      state,
      onIntent: (intent) => intents.push(intent),
      labels: createBoardLabels(),
    });
    const nativeLive = () => nativeHost.querySelector('[aria-live]').textContent;
    const controlledLive = () => controlledHost.querySelector('[aria-live]').textContent;
    const key = (host, value) =>
      host
        .querySelector('svg')
        .dispatchEvent(
          new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }),
        );
    const hostState = controlled.getSnapshot(),
      initialNode = controller.getState().node.id;
    for (const locale of SUPPORTED_LOCALES) {
      const labels = createBoardLabels({ locale }),
        before = controller.getState();
      native.update({ labels, drawing: null, compareTo: null });
      for (let i = 0; i < 5; i++) {
        key(nativeHost, 'ArrowLeft');
        key(nativeHost, 'ArrowUp');
      }
      key(nativeHost, 'Enter');
      verify(
        nativeLive() ===
          formatUiMessage(labels.moveRejected, {
            reason: formatUiFailure('occupied', { locale }),
          }) && controller.getState() === before,
        `${locale}: rejected move changed or leaked machine text`,
      );
      const failed = controller.play({ x: 0, y: 0 });
      verify(!failed.ok && failed.reason === 'occupied', 'Localization changed command failure');
      native.update({ labels: createBoardLabels({ locale: 'ko' }) });
      verify(
        nativeLive() ===
          formatUiMessage(createBoardLabels({ locale: 'ko' }).moveRejected, {
            reason: formatUiFailure('occupied', { locale: 'ko' }),
          }),
        'Existing failure stayed in old language',
      );
      native.update({ labels });
      key(nativeHost, 'ArrowRight');
      verify(
        nativeLive() === formatUiMessage(labels.point, { coordinate: 'B5', stone: labels.empty }),
        `${locale}: cursor announcement`,
      );
      native.update({ drawing: { color: '#112233' } });
      key(nativeHost, ' ');
      verify(nativeLive() === labels.inkStarted, `${locale}: ink start`);
      const drawing = controller.getState(),
        markup = nativeHost.innerHTML;
      let rejected = false;
      try {
        native.update({
          labels: createBoardLabels({ locale: 'ja' }),
          crop: { x: 0, y: 0, width: 999, height: 3 },
        });
      } catch {
        rejected = true;
      }
      verify(
        rejected && nativeHost.innerHTML === markup && controller.getState() === drawing,
        'Rejected combined update changed pending input',
      );
      key(nativeHost, 'ArrowDown');
      key(nativeHost, ' ');
      key(nativeHost, 'Enter');
      verify(
        nativeLive() === labels.inkAdded && controller.getState().strokes.length === 1,
        `${locale}: completed ink`,
      );
      const inkState = controller.getState();
      native.update({ labels: createBoardLabels({ locale: 'ja' }) });
      verify(
        nativeLive() === createBoardLabels({ locale: 'ja' }).inkAdded &&
          controller.getState() === inkState,
        'Ink feedback did not relocalize safely',
      );
      controller.undo();
      native.update({ labels });
      key(nativeHost, ' ');
      const pendingState = controller.getState();
      native.update({ labels });
      verify(
        nativeLive() === labels.pendingCancelled &&
          controller.getState() === pendingState &&
          !nativeHost.querySelector('[data-preview="ink"]'),
        `${locale}: update cancellation announcement`,
      );
      key(nativeHost, 'Escape');
      verify(nativeLive() === labels.pendingCancelled, `${locale}: Escape announcement`);
      native.update({ drawing: null });
      verify(controller.play({ x: 2, y: 2 }).ok, 'Difference fixture move rejected');
      native.update({ compareTo: initialNode });
      const difference = nativeHost.querySelector('[data-difference][data-point="2,2"]');
      verify(
        difference?.getAttribute('aria-label') ===
          formatUiMessage(labels.difference, {
            coordinate: 'C3',
            before: labels.empty,
            after: labels.black,
          }),
        `${locale}: difference accessible description (${difference?.getAttribute('aria-label')}; ${nativeHost.querySelector('svg').getAttribute('data-comparison-status')})`,
      );
      controller.undo();
      const custom = { ...labels, inkStarted: '$& <b> custom start' };
      controlled.update({ labels: custom, drawing: { color: '#112233' } });
      custom.inkStarted = 'caller mutation';
      controlled.update({ coordinates: false });
      for (let i = 0; i < 5; i++) {
        key(controlledHost, 'ArrowLeft');
        key(controlledHost, 'ArrowUp');
      }
      key(controlledHost, ' ');
      verify(
        controlledLive() === '$& <b> custom start' && !controlledHost.querySelector('b'),
        'Controlled custom notice ownership/literal text failed',
      );
      controlled.update({ labels });
      verify(controlledLive() === labels.pendingCancelled, `${locale}: controlled cancellation`);
      key(controlledHost, ' ');
      key(controlledHost, 'ArrowRight');
      key(controlledHost, ' ');
      key(controlledHost, 'Enter');
      verify(
        controlledLive() === labels.inkAdded &&
          controlled.getSnapshot() === hostState &&
          intents.at(-1).type === 'stroke' &&
          intents.at(-1).stateKey === state.key,
        `${locale}: controlled drawing notice/state/intent`,
      );
      const authorText = 'Authored $& <b> notice';
      controlled.announce(authorText);
      controlled.update({ labels: createBoardLabels({ locale: 'ja' }) });
      verify(
        controlledLive() === authorText && !controlledHost.querySelector('b'),
        'Host announcement was translated or interpreted',
      );
      const controlledMarkup = controlledHost.innerHTML;
      for (const bad of [
        { inkStarted: 'x'.repeat(1025) },
        { moveRejected: null },
        { failureOccupied: 7 },
        { difference: 'x'.repeat(1025) },
      ]) {
        let invalid = false;
        try {
          controlled.update({ labels: { ...labels, ...bad } });
        } catch {
          invalid = true;
        }
        verify(
          invalid &&
            controlledHost.innerHTML === controlledMarkup &&
            controlled.getSnapshot() === hostState,
          'Controlled notice validation not atomic',
        );
      }
    }
    const limitLabels = createBoardLabels({ locale: 'ko' });
    controlled.update({ labels: limitLabels });
    for (let i = 0; i < 5; i++) {
      key(controlledHost, 'ArrowLeft');
      key(controlledHost, 'ArrowUp');
    }
    const count = intents.length;
    key(controlledHost, ' ');
    for (let i = 0; i < 512; i++) {
      key(controlledHost, i % 2 === 0 ? 'ArrowRight' : 'ArrowLeft');
      key(controlledHost, ' ');
    }
    verify(
      controlledLive() === formatUiMessage(limitLabels.strokeLimit, { limit: 512 }) &&
        intents.length === count &&
        controlled.getSnapshot() === hostState &&
        !controlledHost.querySelector('[data-preview="ink"]'),
      'Stroke overflow notice or cancellation changed',
    );
    native.update({ labels: undefined, drawing: null, compareTo: null });
    for (let i = 0; i < 5; i++) {
      key(nativeHost, 'ArrowLeft');
      key(nativeHost, 'ArrowUp');
    }
    key(nativeHost, 'Enter');
    verify(nativeLive() === 'Move rejected: occupied.', 'Unlocalized English fallback changed');
    const root = controller.getState().node.id;
    controller.play({ x: 3, y: 3 });
    native.update({
      nodeId: controller.getState().node.id,
      labels: createBoardLabels({ locale: 'ko' }),
    });
    controller.undo();
    verify(
      nativeLive() === createBoardLabels({ locale: 'ko' }).pinnedUnavailable &&
        nativeHost
          .querySelector('svg')
          .textContent.includes(createBoardLabels({ locale: 'ko' }).nodeUnavailable),
      'Unavailable pinned labels stayed English',
    );
    native.update({ nodeId: null });
    verify(
      nativeLive() !== createBoardLabels({ locale: 'ko' }).pinnedUnavailable,
      'Recovered pin retained unavailable announcement',
    );
    verify(
      controller.getState().node.id === root &&
        controller.getState().node.properties.XX[0] === 'keep',
      'Notices changed authored source',
    );
    native.dispose();
    controlled.dispose();
    controller.dispose();
    verify(
      !nativeHost.children.length && !controlledHost.children.length,
      'Notice disposal retained DOM',
    );
    nativeHost.remove();
    controlledHost.remove();
  });
  return 'banora-board-notices-complete';
};

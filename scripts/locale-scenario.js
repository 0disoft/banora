// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page, studioControl) => {
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
    const indicator = () =>
      container.querySelector('[aria-current="true"] .banora-comment-indicator');
    check(indicator()?.title === '코멘트 있음', 'Root comment indicator missing');
    controller.next();
    check(!indicator(), 'Empty comment has an indicator');
    controller.setComment('Unsaved <tag> comment');
    check(indicator() && !container.querySelector('tag'), 'Comment indicator missing or unsafe');
    controller.undo();
    check(!indicator(), 'Undo retained comment indicator');
    controller.redo();
    check(indicator(), 'Redo lost comment indicator');
    controller.setComment(' \n\t ');
    check(!indicator(), 'Whitespace-only comment has an indicator');
    controller.undo();
    const before = controller.prepareExport().text;
    view.update({ locale: 'en', messages: { variations: '<tag>Branches</tag>' } });
    check(
      container.querySelector('summary').textContent === '<tag>Branches</tag>' &&
        !container.querySelector('summary tag'),
      'Custom messages interpreted as HTML',
    );
    check(
      indicator()?.title === 'Has comment' &&
        container
          .querySelector('[data-tree] button[aria-current="true"]')
          .getAttribute('aria-description') === 'Has comment',
      'Comment indicator accessibility did not follow language',
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
    view.update({ locale: 'zh', messages: {} });
    check(
      container.querySelector('section').lang === 'zh' &&
        container.querySelector('nav > span').textContent === '第 1 手' &&
        container.querySelector('summary').textContent === '变化图' &&
        container
          .querySelector('svg[role="application"]')
          .getAttribute('aria-label')
          .startsWith('围棋棋盘。') &&
        indicator()?.title === '有评注' &&
        container.querySelector('.banora-record-playback').lang === 'zh',
      'Chinese viewer/board/playback localization failed',
    );
    check(
      controller.prepareExport().text === before &&
        controller.getState().position.moveNumber === 1 &&
        controller.getState().dirty &&
        view.playback.getState().intervalMs === 500,
      'Chinese update changed record, history or playback settings',
    );
    view.update({ locale: 'ja', messages: {} });
    check(
      container.querySelector('section').lang === 'ja' &&
        container.querySelector('nav > span').textContent === '1手目' &&
        container.querySelector('summary').textContent === '変化図' &&
        container
          .querySelector('svg[role="application"]')
          .getAttribute('aria-label')
          .startsWith('碁盤。') &&
        indicator()?.title === 'コメントあり' &&
        container.querySelector('.banora-record-playback').lang === 'ja',
      'Japanese viewer/board/playback localization failed',
    );
    check(
      controller.prepareExport().text === before &&
        controller.getState().position.moveNumber === 1 &&
        controller.getState().dirty &&
        view.playback.getState().intervalMs === 500,
      'Japanese update changed record, history or playback settings',
    );
    controller.loadSgf('(;SZ[19])(;SZ[13])(;SZ[9])', { discardChanges: true });
    view.update({ board: { crop: { x: 10, y: 10, width: 3, height: 3 } } });
    controller.goTo(controller.getState().record.games[1].id);
    check(
      container.querySelector('svg').getAttribute('viewBox') === '10 10 4.5 4.5',
      'Valid crop was discarded on a board size change',
    );
    controller.goTo(controller.getState().record.games[2].id);
    check(
      container.querySelector('svg').getAttribute('viewBox') === '0 0 10.5 10.5',
      'Invalid inherited crop was not cleared on a smaller game',
    );
    const selected = controller.getState();
    view.update({ locale: 'ko', board: { theme: 'flat' }, playback: { intervalMs: 1500 } });
    check(
      container.querySelector('section').lang === 'ko' &&
        container.querySelector('svg').getAttribute('viewBox') === '0 0 10.5 10.5' &&
        view.playback.getState().intervalMs === 1500 &&
        controller.getState() === selected,
      'Unrelated Viewer update revived a cleared crop or changed record state',
    );
    controller.loadSgf('(;SZ[7])');
    view.update({ comments: false });
    check(
      container.querySelector('svg').getAttribute('viewBox') === '0 0 8.5 8.5' &&
        container.querySelector('[data-notes]').hidden,
      'Update after record replacement revived the old crop',
    );
    try {
      view.update({ locale: 'en', board: { crop: { x: 10, y: 10, width: 3, height: 3 } } });
      throw Error('Explicit invalid crop accepted');
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
    }
    check(
      container.querySelector('section').lang === 'ko' &&
        container.querySelector('svg').getAttribute('viewBox') === '0 0 8.5 8.5',
      'Explicit invalid crop changed Viewer presentation',
    );
    view.dispose();
    controller.dispose();
    container.remove();
    return 'banora-locale-core-complete';
  });
  if (result !== 'banora-locale-core-complete') throw Error('Locale core did not finish');
  const origin = new URL(page.url()).origin;
  await page.goto(`${origin}/studio/`);
  await page.locator('#file').setInputFiles({
    name: 'localized-pass.sgf',
    mimeType: 'application/x-go-sgf',
    buffer: Buffer.from('(;SZ[5]XX[pass-locale];B[];W[tt]MN[9])'),
  });
  await page.locator('#last').click();
  for (const [locale, labels, boardInfo] of [
    ['en', ['1 · Black pass', '9 · White pass'], '5 × 5 / not specified'],
    ['ko', ['1 · 흑 패스', '9 · 백 패스'], '5 × 5 / 미지정'],
    ['zh', ['1 · 黑停一手', '9 · 白停一手'], '5 × 5 / 未指定'],
    ['ja', ['1 · 黒 パス', '9 · 白 パス'], '5 × 5 / 未指定'],
  ]) {
    await page.locator('#language').selectOption(locale);
    for (const label of labels)
      if (
        (await page.locator('#tree').getByRole('button', { name: label, exact: true }).count()) !==
        1
      )
        throw Error(
          `Localized pass caption missing: ${locale}: ${await page.locator('#tree button').allTextContents()}`,
        );
    if ((await page.locator('#board-info').textContent()) !== boardInfo)
      throw Error(
        `Unlocalized missing komi: ${locale}: ${await page.locator('#board-info').textContent()}`,
      );
    if (await page.locator('#dirty').evaluate((element) => element.classList.contains('changed')))
      throw Error('Pass caption localization changed authored data');
  }
  const passDownload = page.waitForEvent('download');
  await page.locator('#export').click();
  await (await passDownload).saveAs('output/playwright/localized-pass-preserved.sgf');
  await studioControl(page, '#sample', 'record', () => page.locator('#sample').click());
  await page.locator('#language').selectOption('ko');
  if ((await page.locator('html').getAttribute('lang')) !== 'ko')
    throw Error('Studio language missing');
  await page.getByRole('button', { name: '다음 수', exact: true }).click();
  await page.locator('#comment').fill('Authored English <tag> note');
  await page.locator('#comment').blur();
  if (!(await page.locator('#tree [aria-current="true"] .banora-comment-indicator').count()))
    throw Error('Studio comment indicator missing');
  await page.locator('#comment').fill(' ');
  await page.locator('#comment').blur();
  if (await page.locator('#tree [aria-current="true"] .banora-comment-indicator').count())
    throw Error('Studio retained whitespace-only comment indicator');
  await page.locator('#undo').click();
  if (!(await page.locator('#tree [aria-current="true"] .banora-comment-indicator').count()))
    throw Error('Studio Undo lost comment indicator');
  if ((await page.locator('#move').textContent()) !== '1수')
    throw Error('Studio move untranslated');
  if (
    !(await page.locator('#tree').getByRole('button', { name: '1 · 흑 G7', exact: true }).count())
  )
    throw Error('Studio variation untranslated');
  await page.locator('#language').selectOption('en');
  if (
    (await page.locator('#comment').inputValue()) !== 'Authored English <tag> note' ||
    (await page.locator('#move').textContent()) !== 'Move 1' ||
    (await page.locator('#dirty').textContent()) !== 'Unsaved changes'
  )
    throw Error('Studio language switch lost state');
  await page.locator('#language').selectOption('ko');
  await studioControl(page, '[data-share="create"]', 'share', () =>
    page.getByRole('button', { name: '링크 만들기', exact: true }).click(),
  );
  await studioControl(page, '#score-open', 'scoring', () =>
    page.getByRole('button', { name: '현재 위치 계가', exact: true }).click(),
  );
  if (!(await page.locator('#score-result').textContent()).startsWith('임시 결과:'))
    throw Error('Korean scoring result untranslated');
  await page.getByRole('button', { name: '계가 닫기', exact: true }).click();
  await page.locator('#language').selectOption('zh');
  if (
    (await page.locator('html').getAttribute('lang')) !== 'zh' ||
    (await page.locator('#language option[value="zh"]').textContent()) !== '中文' ||
    (await page.locator('#comment').inputValue()) !== 'Authored English <tag> note' ||
    (await page.locator('#move').textContent()) !== '第 1 手' ||
    (await page.locator('#dirty').textContent()) !== '有未保存的更改' ||
    !(await page
      .locator('#tree')
      .getByRole('button', { name: '1 · 黑 G7', exact: true })
      .count()) ||
    (await page
      .locator('#tree [aria-current="true"] .banora-comment-indicator')
      .getAttribute('title')) !== '有评注'
  )
    throw Error('Chinese Studio switch lost data or labels');
  await studioControl(page, '[data-share="create"]', 'share', () =>
    page.getByRole('button', { name: '生成链接', exact: true }).click(),
  );
  if (!(await page.locator('[data-share="output"]').inputValue()).includes('#banora='))
    throw Error('Localized sharing failed');
  await studioControl(page, '#score-open', 'scoring', () =>
    page.getByRole('button', { name: '计算当前局面得分', exact: true }).click(),
  );
  if (!(await page.locator('#score-result').textContent()).startsWith('暂定结果：'))
    throw Error('Scoring result untranslated');
  await page.getByRole('button', { name: '关闭计分', exact: true }).click();
  await page.locator('#language').selectOption('ja');
  if (
    (await page.locator('html').getAttribute('lang')) !== 'ja' ||
    (await page.locator('#language option[value="ja"]').textContent()) !== '日本語' ||
    (await page.locator('#comment').inputValue()) !== 'Authored English <tag> note' ||
    (await page.locator('#move').textContent()) !== '1手目' ||
    (await page.locator('#dirty').textContent()) !== '未保存の変更' ||
    !(await page
      .locator('#tree')
      .getByRole('button', { name: '1 · 黒 G7', exact: true })
      .count()) ||
    (await page
      .locator('#tree [aria-current="true"] .banora-comment-indicator')
      .getAttribute('title')) !== 'コメントあり'
  )
    throw Error('Japanese Studio switch lost data or labels');
  await page.getByRole('button', { name: '次の手', exact: true }).click();
  if ((await page.locator('#move').textContent()) !== '2手目')
    throw Error('Japanese next move failed');
  await page.getByRole('button', { name: '前の手', exact: true }).click();
  await studioControl(page, '[data-share="create"]', 'share', () =>
    page.getByRole('button', { name: 'リンクを作成', exact: true }).click(),
  );
  if (!(await page.locator('[data-share="output"]').inputValue()).includes('#banora='))
    throw Error('Japanese sharing failed');
  await studioControl(page, '#score-open', 'scoring', () =>
    page.getByRole('button', { name: '現在の局面を計算', exact: true }).click(),
  );
  if (!(await page.locator('#score-result').textContent()).startsWith('暫定結果：'))
    throw Error('Japanese scoring result untranslated');
  await page.getByRole('button', { name: '計算を閉じる', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'SGF を保存', exact: true }).click();
  const exported = await download;
  await exported.saveAs('output/playwright/localized-preserved.sgf');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'output/playwright/studio-ja-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 1000 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    throw Error('Japanese mobile layout overflow');
  await page.screenshot({ path: 'output/playwright/studio-ja-mobile.png', fullPage: true });
  await page.reload();
  if ((await page.locator('#language').inputValue()) !== 'ja')
    throw Error('Language preference not retained');
  // Reload now starts a blank 19-line workspace, so texture checks need an explicit record.
  await page.locator('#file').setInputFiles('output/playwright/localized-preserved.sgf');
  await page.waitForFunction(
    () => document.querySelector('#game-name').textContent === 'Opening study',
  );
  await page.locator('#language').selectOption('en');
  await page.locator('#board-menu').click();
  await page.locator('[data-board-menu-section="textures"]').click();
  for (const locale of ['ko', 'zh', 'ja', 'en']) {
    await page.locator('#language').selectOption(locale);
    if (
      (await page.locator('#board-menu-panel input[data-texture-file]').count()) !== 2 ||
      !(await page
        .locator('#board-menu-panel')
        .evaluate((element) => element.matches(':popover-open')))
    )
      throw Error(`Language ${locale} removed borrowed texture inputs`);
  }
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d');
    context.fillStyle = '#123456';
    context.fillRect(0, 0, 64, 64);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await page.locator('[data-texture-file="black"]').setInputFiles({
    name: 'localized-texture.png',
    mimeType: 'image/png',
    buffer: Buffer.from(png, 'base64'),
  });
  await page.waitForFunction(
    () => !document.querySelector('[data-texture-reset="black"]').disabled,
  );
  await page.locator('#board-menu-panel [data-close]').click();
  await page.locator('#next').click();
  if ((await page.locator('#board [data-texture="black"]').count()) !== 1)
    throw Error('Texture input lost its upload handler across language switches');
  await studioControl(page, '[data-texture-reset="black"]', 'textures', () =>
    page.locator('[data-texture-reset="black"]').click(),
  );
  if ((await page.locator('#dirty').textContent()) !== 'No changes')
    throw Error('Localized texture upload changed record history');
  const context = await page
    .context()
    .browser()
    .newContext({ locale: 'zh-CN', viewport: { width: 390, height: 1000 } });
  try {
    const chinesePage = await context.newPage();
    await chinesePage.goto(`${origin}/studio/`);
    await chinesePage.locator('#board svg').waitFor();
    if (
      (await chinesePage.locator('#language').inputValue()) !== 'zh' ||
      (await chinesePage.locator('html').getAttribute('lang')) !== 'zh' ||
      (await chinesePage.locator('#game-name').textContent()) !== '棋盘 1'
    )
      throw Error('Chinese browser detection failed or translated authored title');
    await chinesePage.locator('#language').selectOption('ko');
    await chinesePage.reload();
    if ((await chinesePage.locator('#language').inputValue()) !== 'ko')
      throw Error('Saved selection did not override Chinese browser language');
  } finally {
    await context.close();
  }
  const japaneseContext = await page
    .context()
    .browser()
    .newContext({ locale: 'ja-JP', viewport: { width: 390, height: 1000 } });
  try {
    const japanesePage = await japaneseContext.newPage();
    await japanesePage.goto(`${origin}/studio/`);
    await japanesePage.locator('#board svg').waitFor();
    if (
      (await japanesePage.locator('#language').inputValue()) !== 'ja' ||
      (await japanesePage.locator('html').getAttribute('lang')) !== 'ja' ||
      (await japanesePage.locator('#game-name').textContent()) !== '碁盤 1'
    )
      throw Error('Japanese browser detection failed or translated authored title');
    await japanesePage.locator('#language').selectOption('zh');
    await japanesePage.reload();
    if ((await japanesePage.locator('#language').inputValue()) !== 'zh')
      throw Error('Saved selection did not override Japanese browser language');
  } finally {
    await japaneseContext.close();
  }
  await page.setViewportSize({ width: 1280, height: 1000 });
  const expandedContext = await page.context().browser().newContext({ locale: 'en-US' });
  try {
    const expanded = await expandedContext.newPage();
    await expanded.goto(`${origin}/studio/`);
    await expanded.locator('#file').setInputFiles({
      name: 'twelve-languages.sgf',
      mimeType: 'application/x-go-sgf',
      buffer: Buffer.from(
        '(;SZ[19]GN[Authored <tag> title]PB[Player Black]PW[Player White];B[dd]C[Authored English $& comment];W[])',
      ),
    });
    await expanded.locator('#next').click();
    const cases = [
      ['en', 'Open SGF'],
      ['zh', '打开 SGF'],
      ['hi', 'SGF खोलें'],
      ['es', 'Abrir SGF'],
      ['fr', 'Ouvrir SGF'],
      ['ru', 'Открыть SGF'],
      ['id', 'Buka SGF'],
      ['ja', 'SGF を開く'],
      ['vi', 'Mở SGF'],
      ['ko', 'SGF 열기'],
      ['th', 'เปิด SGF'],
      ['ms', 'Buka SGF'],
    ];
    if ((await expanded.locator('#language option').count()) !== 12)
      throw Error('Studio language selector is incomplete');
    for (const [locale, open] of cases) {
      await expanded.locator('#language').selectOption(locale);
      if (
        (await expanded.locator('html').getAttribute('lang')) !== locale ||
        (await expanded.locator('#open').textContent()).trim() !== open
      )
        throw Error(`Studio locale was not applied: ${locale}`);
      if (
        (await expanded.locator('#game-name').textContent()) !== 'Authored <tag> title' ||
        (await expanded.locator('#black-name').textContent()) !== 'Player Black' ||
        (await expanded.locator('#comment').inputValue()) !== 'Authored English $& comment' ||
        !(await expanded.locator('#tree [aria-current="true"]').textContent()).startsWith('1 · ')
      )
        throw Error(`Language switch changed authored state: ${locale}`);
      for (const width of [1440, 390]) {
        await expanded.setViewportSize({ width, height: 1000 });
        const fits = await expanded.locator('header').evaluate((header) => {
          const box = header.getBoundingClientRect();
          return [...header.querySelectorAll('button,select,.brand')]
            .filter((el) => getComputedStyle(el).display !== 'none')
            .every((el) => {
              const rect = el.getBoundingClientRect();
              return (
                rect.left >= box.left &&
                rect.right <= box.right + 1 &&
                rect.bottom <= box.bottom + 1
              );
            });
        });
        if (!fits) throw Error(`Localized header clipped: ${locale}/${width}`);
      }
      await studioControl(expanded, '#search-open', 'search', () =>
        expanded.locator('#search-open').click(),
      );
      if (
        locale !== 'en' &&
        (await expanded.locator('#search-title').textContent()) === 'Search record'
      )
        throw Error(`Search dialog stayed English: ${locale}`);
      await expanded.locator('#search-close').click();
      await expanded.waitForFunction(() => !document.querySelector('#search-dialog').open);
    }
    await expanded.reload();
    if ((await expanded.locator('#language').inputValue()) !== 'ms')
      throw Error('New language preference did not survive reload');
    const sdkResult = await expanded.evaluate(async () => {
      const {
        SUPPORTED_LOCALES,
        RecordController,
        mountViewer,
        mountComparison,
        createUiMessages,
      } = await import('/sdk/index.js');
      const controller = new RecordController({
        sgf: '(;SZ[9]GN[Literal <tag> title]C[Authored $& comment];B[aa])',
      });
      const before = controller.getState();
      const host = document.createElement('div'),
        compareHost = document.createElement('div');
      document.body.append(host, compareHost);
      const viewer = mountViewer(host, { controller });
      const comparison = mountComparison(compareHost, { controller });
      try {
        for (const locale of SUPPORTED_LOCALES) {
          const ui = createUiMessages({ locale });
          viewer.update({ locale });
          comparison.update({ locale });
          if (
            host.querySelector('.banora-viewer').getAttribute('aria-label') !== ui.viewer ||
            compareHost.querySelector('.banora-comparison').getAttribute('aria-label') !==
              ui.comparison ||
            host.querySelector('textarea').value !== 'Authored $& comment' ||
            controller.getState() !== before
          )
            throw Error(`SDK language update changed presentation/state: ${locale}`);
        }
        return 'twelve-sdk-locales-complete';
      } finally {
        viewer.dispose();
        comparison.dispose();
        controller.dispose();
        host.remove();
        compareHost.remove();
      }
    });
    if (sdkResult !== 'twelve-sdk-locales-complete')
      throw Error('Expanded SDK locales did not complete');
  } finally {
    await expandedContext.close();
  }
  for (const [language, locale] of [
    ['hi-IN', 'hi'],
    ['th-TH', 'th'],
  ]) {
    const detectedContext = await page.context().browser().newContext({ locale: language });
    try {
      const detected = await detectedContext.newPage();
      await detected.goto(`${origin}/studio/`);
      await detected.locator('#board svg').waitFor();
      if ((await detected.locator('#language').inputValue()) !== locale)
        throw Error(`Browser locale detection failed: ${language}`);
    } finally {
      await detectedContext.close();
    }
  }
  return 'banora-locale-complete';
};

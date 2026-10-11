// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
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
    view.dispose();
    controller.dispose();
    container.remove();
    return 'banora-locale-core-complete';
  });
  if (result !== 'banora-locale-core-complete') throw Error('Locale core did not finish');
  const origin = new URL(page.url()).origin;
  await page.goto(`${origin}/studio/`);
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
  await page.getByRole('button', { name: '링크 만들기', exact: true }).click();
  if (!(await page.locator('[data-share="output"]').inputValue()).includes('#banora='))
    throw Error('Localized sharing failed');
  await page.getByRole('button', { name: '현재 위치 계가', exact: true }).click();
  if (!(await page.locator('#score-result').textContent()).startsWith('임시 결과:'))
    throw Error('Scoring result untranslated');
  await page.getByRole('button', { name: '계가 닫기', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'SGF 저장', exact: true }).click();
  const exported = await download;
  await exported.saveAs('output/playwright/localized-preserved.sgf');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'output/playwright/studio-ko-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 1000 });
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth))
    throw Error('Korean mobile layout overflow');
  await page.screenshot({ path: 'output/playwright/studio-ko-mobile.png', fullPage: true });
  await page.reload();
  if ((await page.locator('#language').inputValue()) !== 'ko')
    throw Error('Language preference not retained');
  await page.locator('#language').selectOption('en');
  await page.setViewportSize({ width: 1280, height: 1000 });
  return 'banora-locale-complete';
};

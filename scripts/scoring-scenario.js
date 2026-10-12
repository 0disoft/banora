// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page, studioControl) => {
  const origin = new URL(page.url()).origin,
    errors = [],
    external = [];
  const onError = (error) => errors.push(String(error));
  const onRequest = (request) => {
    if (new URL(request.url()).origin !== origin) external.push(request.url());
  };
  page.on('pageerror', onError);
  page.on('request', onRequest);
  const verify = (value, message) => {
    if (!value) throw Error(message);
  };
  const archive =
    '(;FF[4]GM[1]SZ[3]GN[Scoring fixture]KM[6.5]HA[4]AB[aa][ba][bb][bc]AW[ab][ac]XX[score-preserve];B[];W[])';
  async function open(target, sgf = archive, name = 'scoring.sgf') {
    await target
      .locator('#file')
      .setInputFiles({ name, mimeType: 'application/x-go-sgf', buffer: Buffer.from(sgf) });
    await target.waitForFunction(() =>
      document.querySelector('#status').textContent.includes('Opened'),
    );
  }
  async function component(key, color = 'black') {
    return Number(
      await page
        .locator(`#score-breakdown [data-component="${key}"] [data-color="${color}"]`)
        .innerText(),
    );
  }
  async function mark(target, point, touch = false) {
    const stone = target.locator(`#score-board [data-stone="${point}"]`);
    await stone.scrollIntoViewIfNeeded();
    const box = await stone.boundingBox();
    verify(box, 'Scoring stone unavailable');
    if (touch) await target.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    else await target.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  }
  async function download(name) {
    const saved = page.waitForEvent('download');
    await page.locator('#export').click();
    await (await saved).saveAs(`output/playwright/${name}.sgf`);
  }
  let mobileContext;
  try {
    await page.goto(`${origin}/studio/`);
    await open(page);
    await page.locator('#last').click();
    await download('scoring-before');
    await studioControl(page, '#score-open', 'scoring', () => page.locator('#score-open').click());
    verify(
      (await page.locator('#score-board [data-stone]').count()) === 6,
      'Scoring diagram lost original stones',
    );
    verify(
      (await component('territory')) === 3 &&
        (await component('total')) === 3 &&
        (await component('komi', 'white')) === 6.5,
      'Initial Japanese components differ from headless fixture',
    );
    verify(
      (await page.locator('#score-formula').innerText()).startsWith('Territory total'),
      'Territory counting formula missing',
    );
    verify(
      (await page.locator('#score-warning').innerText()).includes('Pass sequence complete'),
      'Recorded alternating passes were not replayed',
    );
    await mark(page, '0,1');
    verify(
      (await page.locator('#score-result').innerText()).includes('2 dead stones') &&
        (await component('deadPrisoners')) === 2 &&
        (await component('total')) === 7,
      'A single dead seed did not select/count the complete group',
    );
    verify(
      (await page.locator('#score-board path[data-marker="0,1"]').count()) === 1 &&
        (await page.locator('#score-board path[data-marker="0,2"]').count()) === 1,
      'Dead group marks missing',
    );
    const svg = page.locator('#score-board svg');
    await svg.focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Enter');
    verify(
      (await component('deadPrisoners')) === 0 && (await component('total')) === 3,
      'Keyboard correction did not restore living group',
    );
    verify(
      await svg.evaluate((node) => document.activeElement === node),
      'Score redraw lost keyboard focus',
    );
    await page.keyboard.press('Enter');
    verify((await component('deadPrisoners')) === 2, 'Keyboard group selection failed');
    await studioControl(page, '#score-komi', 'scoring', () => page.locator('#score-komi').fill(''));
    verify(
      (await page.locator('#score-result').innerText()).startsWith('Cannot calculate') &&
        (await page.locator('#score-breakdown tbody tr').count()) === 0,
      'Invalid input retained a stale report',
    );
    await studioControl(page, '#score-komi', 'scoring', () =>
      page.locator('#score-komi').fill('-0.5'),
    );
    verify(
      (await component('deadPrisoners')) === 2 && (await component('komi', 'white')) === -0.5,
      'Invalid-input recovery lost marks or negative komi',
    );
    await studioControl(page, '#score-white-adjust', 'scoring', () =>
      page.locator('#score-white-adjust').fill('1.5'),
    );
    verify((await component('adjustment', 'white')) === 1.5, 'Explicit adjustment was hidden');
    await studioControl(page, '#score-profile', 'scoring', () =>
      page.locator('#score-profile').selectOption('aga-area'),
    );
    verify(
      (await component('total')) === 9 &&
        (await component('passPrisoners')) === 1 &&
        (await component('passPrisoners', 'white')) === 1 &&
        (await component('handicapCompensation', 'white')) === 3,
      'AGA area replay/handicap components failed',
    );
    verify(
      (await page.locator('#score-formula').innerText()).includes(
        'Prisoners are shown for reference',
      ),
      'Area table implied prisoners were added to the total',
    );
    await studioControl(page, '#score-profile', 'scoring', () =>
      page.locator('#score-profile').selectOption('aga-territory'),
    );
    verify(
      (await component('total')) === 8 && (await component('handicapCompensation', 'white')) === 0,
      'AGA territory included area handicap adjustment',
    );
    await studioControl(page, '#score-profile', 'scoring', () =>
      page.locator('#score-profile').selectOption('japanese-territory'),
    );
    await studioControl(page, '#score-reset', 'scoring', () =>
      page.locator('#score-reset').click(),
    );
    await studioControl(page, '#score-mark', 'scoring', () =>
      page.locator('#score-mark').selectOption('seki'),
    );
    await mark(page, '1,1');
    verify(
      (await page.locator('#score-result').innerText()).includes('4 seki stones') &&
        (await component('territory')) === 0,
      'Japanese seki did not exclude adjacent surrounded empties',
    );
    await studioControl(page, '#score-mark', 'scoring', () =>
      page.locator('#score-mark').selectOption('dead'),
    );
    await mark(page, '1,1');
    verify(
      (await page.locator('#score-result').innerText()).includes('0 seki stones') &&
        (await page.locator('#score-result').innerText()).includes('4 dead stones'),
      'Changing group status retained conflicting selections',
    );
    await studioControl(page, '#score-reset', 'scoring', () =>
      page.locator('#score-reset').click(),
    );
    await mark(page, '0,1');
    verify(
      (await page.locator('#dirty').innerText()) === 'No changes' &&
        (await page.locator('#move').innerText()) === 'Move 2' &&
        (await page.locator('#board [data-stone]').count()) === 6,
      'Scoring changed the source record/cursor/diagram',
    );
    await download('scoring-after');
    verify(
      (await component('deadPrisoners')) === 2,
      'Export acknowledgment erased independent scoring marks',
    );
    await page.locator('#previous').click();
    verify(
      (await component('deadPrisoners')) === 0 &&
        (await page.locator('#score-warning').innerText()).includes('not ended'),
      'Navigation retained marks or old pass status',
    );
    await studioControl(page, '#score-profile', 'scoring', () =>
      page.locator('#score-profile').selectOption('aga-territory'),
    );
    await studioControl(page, '#score-close', 'scoring', () =>
      page.locator('#score-close').click(),
    );
    verify(
      (await page.locator('#score-board svg').count()) === 0 &&
        (await page.locator('#board svg').count()) === 1,
      'Closing scoring leaked its view or disposed the source',
    );
    await studioControl(page, '#score-open', 'scoring', () => page.locator('#score-open').click());
    verify(
      (await component('passPrisoners', 'white')) === 1 && (await component('passPrisoners')) === 0,
      'Reopening selected node lost recorded-color pass accounting',
    );
    await page.locator('#last').click();
    await studioControl(page, '#score-profile', 'scoring', () =>
      page.locator('#score-profile').selectOption('japanese-territory'),
    );
    await mark(page, '0,1');
    await studioControl(page, '#score-komi', 'scoring', () =>
      page.locator('#score-komi').fill('7.5'),
    );
    await page.locator('#comment').fill('Context changed');
    await page.locator('#comment').blur();
    verify(
      (await component('deadPrisoners')) === 2 && (await component('komi', 'white')) === 7.5,
      'Comment edit reset independent scoring settings or marks',
    );
    await page.locator('#undo').click();
    verify(
      (await page.locator('#dirty').innerText()) === 'No changes',
      'Scoring changed source Undo semantics',
    );
    verify((await component('deadPrisoners')) === 2, 'Comment Undo erased scoring marks');
    await page.locator('#tool').selectOption('triangle');
    await page.locator('#board svg').focus();
    await page.keyboard.press('Enter');
    verify((await component('deadPrisoners')) === 2, 'Annotation edit erased scoring marks');
    await page.locator('#undo').click();
    await page.locator('#tool').selectOption('setup-empty');
    await page.locator('#board svg').focus();
    await page.keyboard.press('Enter');
    verify((await component('deadPrisoners')) === 0, 'Setup edit retained stale scoring marks');
    await page.locator('#undo').click();
    await page.locator('#tool').selectOption('play');
    await mark(page, '0,1');
    await open(page, '(;SZ[3]GN[Replacement]KM[0]AB[bb])', 'replacement.sgf');
    verify(
      (await component('deadPrisoners')) === 0 &&
        (await component('komi', 'white')) === 0 &&
        (await page.locator('#score-board [data-stone]').count()) === 1,
      'Replacement with reused node IDs retained scoring context',
    );
    await open(page, archive.replace(';B[];W[]', ';W[];B[]'), 'white-last-pass.sgf');
    await page.locator('#last').click();
    await studioControl(page, '#score-profile', 'scoring', () =>
      page.locator('#score-profile').selectOption('aga-territory'),
    );
    verify(
      (await page.locator('#score-warning').innerText()).includes('White to make the last pass') &&
        (await page.locator('#move').innerText()) === 'Move 2' &&
        (await page.locator('#dirty').innerText()) === 'No changes',
      'AGA warning synthesized a move or failed to check the recorded last color',
    );
    await studioControl(page, '#score-profile', 'scoring', () =>
      page.locator('#score-profile').selectOption('japanese-territory'),
    );
    await open(page);
    await page.locator('#last').click();
    await mark(page, '0,1');
    await page.screenshot({ path: 'output/playwright/studio-scoring.png', fullPage: true });
    mobileContext = await page
      .context()
      .browser()
      .newContext({
        locale: 'en-US',
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      });
    const mobile = await mobileContext.newPage();
    mobile.on('pageerror', onError);
    mobile.on('request', onRequest);
    await mobile.goto(`${origin}/studio/`);
    await open(mobile);
    await studioControl(mobile, '#score-open', 'scoring', () =>
      mobile.locator('#score-open').click(),
    );
    await mark(mobile, '0,1', true);
    verify(
      (await mobile.locator('#score-result').innerText()).includes('2 dead stones') &&
        (await mobile.locator('#dirty').innerText()) === 'No changes',
      'Mobile touch selection edited source or missed the complete group',
    );
    verify(
      await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      'Scoring controls overflow the mobile viewport',
    );
    await mobile
      .locator('#score-panel')
      .screenshot({ path: 'output/playwright/studio-scoring-mobile.png' });
    await studioControl(mobile, '#score-close', 'scoring', () =>
      mobile.locator('#score-close').click(),
    );
    verify(
      (await mobile.locator('#score-board svg').count()) === 0,
      'Mobile closing retained the view',
    );
    await studioControl(page, '#score-close', 'scoring', () =>
      page.locator('#score-close').click(),
    );
    verify(
      errors.length === 0 && external.length === 0,
      `Scoring errors/remote requests: ${[...errors, ...external].join('; ')}`,
    );
    return 'banora-scoring-complete';
  } finally {
    await mobileContext?.close();
    page.off('pageerror', onError);
    page.off('request', onRequest);
  }
};

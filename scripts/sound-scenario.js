// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page, studioControl) => {
  const origin = new URL(page.url()).origin;
  await page.addInitScript(() => {
    window.soundStarts = [];
    const create = AudioContext.prototype.createBufferSource;
    AudioContext.prototype.createBufferSource = function () {
      const node = create.call(this);
      const start = node.start.bind(node);
      const context = this;
      node.start = (...args) => {
        const samples = node.buffer.getChannelData(0);
        window.soundStarts.push({
          state: context.state,
          frames: samples.length,
          energy: samples.reduce((sum, value) => sum + value * value, 0),
        });
        return start(...args);
      };
      return node;
    };
  });
  await page.goto(`${origin}/studio/`);
  await page.locator('#language').selectOption('en');
  const verify = (ok, message) => {
    if (!ok) throw Error(message);
  };
  const count = () => page.evaluate(() => window.soundStarts.length);
  const sound = page.locator('#sound');
  verify(
    (await sound.getAttribute('aria-pressed')) === 'false' && (await count()) === 0,
    'Sound was not silent by default',
  );
  await sound.click();
  await page.locator('#board svg').focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.soundStarts.length === 1);
  verify(
    await page.evaluate(() =>
      window.soundStarts.every(
        (item) => item.state === 'running' && item.frames > 100 && item.energy > 0,
      ),
    ),
    'No actual nonzero native audio buffer started',
  );
  await page.locator('#comment').fill('silent comment');
  await page.locator('#comment').blur();
  await page.locator('#undo').click();
  await page.locator('#undo').click();
  await page.locator('#redo').click();
  await page.locator('#redo').click();
  await page.locator('#board svg').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  verify((await count()) === 1, 'Comment/history/rejected placement made a sound');
  await sound.click();
  await page.locator('#board svg').focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(100);
  verify((await count()) === 1, 'Muted placement made a sound');
  const exported = page.waitForEvent('download');
  await page.locator('#export').click();
  await (await exported).saveAs('output/playwright/sound-record.sgf');
  await page.locator('#file').setInputFiles({
    name: 'sound.sgf',
    mimeType: 'application/x-go-sgf',
    buffer: Buffer.from('(;SZ[19]GN[Sound fixture];B[aa];W[];B[bb];W[cc];B[dd];W[ee];B[ff])'),
  });
  await page.waitForFunction(
    () => document.querySelector('#game-name').textContent === 'Sound fixture',
  );
  await sound.click();
  verify((await count()) === 1, 'Import or enabling sound started playback');
  await page.getByRole('combobox', { name: 'Playback interval', exact: true }).selectOption('500');
  await page.getByRole('button', { name: 'Play record', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#move').textContent === 'Move 3');
  await page.waitForFunction(() => window.soundStarts.length === 3);
  const beforeMute = await page.locator('#playback').evaluate((element) => ({
    move: document.querySelector('#move').textContent,
    rootContains: element
      .querySelector('.banora-record-playback')
      .contains(document.querySelector('#sound')),
    labels: [...element.querySelectorAll('button')].map((button) =>
      button.getAttribute('aria-label'),
    ),
  }));
  await sound.click();
  verify(
    await page.getByRole('button', { name: 'Pause playback', exact: true }).isVisible(),
    `Muting unnecessarily paused replay: ${JSON.stringify({ beforeMute, after: await page.locator('#playback').evaluate((element) => ({ move: document.querySelector('#move').textContent, labels: [...element.querySelectorAll('button')].map((button) => button.getAttribute('aria-label')) })) })}`,
  );
  await page.waitForFunction(() => document.querySelector('#move').textContent === 'Move 4');
  verify((await count()) === 3, 'Pass or muted replay made a sound');
  await page.getByRole('button', { name: 'Pause playback', exact: true }).click();
  await sound.click();
  await page.locator('#new').click();
  await page.locator('[data-board-id="1"] [role="tab"]').click();
  verify((await count()) === 3, 'Tab switch made a sound');
  for (const [locale, label] of [
    ['ko', '착수 소리'],
    ['zh', '落子音效'],
    ['ja', '着手音'],
    ['en', 'Placement sound'],
  ]) {
    await page.locator('#language').selectOption(locale);
    verify((await sound.getAttribute('aria-label')) === label, 'Sound label not localized');
  }
  await page.reload();
  verify((await sound.getAttribute('aria-pressed')) === 'true', 'Sound preference not restored');
  verify((await count()) === 0, 'Reload eagerly played audio');
  await studioControl(page, '#settings-reset', 'preferences', () =>
    page.locator('#settings-reset').click(),
  );
  verify(
    (await sound.getAttribute('aria-pressed')) === 'false',
    'Settings reset did not mute sound',
  );
  return 'banora-sound-complete';
};

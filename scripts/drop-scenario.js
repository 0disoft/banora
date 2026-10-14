// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page, studioControl) => {
  const origin = new URL(page.url()).origin,
    errors = [],
    external = [];
  const onError = (error) => errors.push(String(error));
  const onRequest = (request) => {
    if (new URL(request.url()).origin !== origin || request.method() !== 'GET')
      external.push(request.url());
  };
  page.on('pageerror', onError);
  page.on('request', onRequest);
  const verify = (condition, message) => {
    if (!condition) throw Error(message);
  };
  async function drop(bytes, name) {
    // Exercise the production DOM file-drop boundary, without SDK/controller hooks.
    await page.evaluate(
      ({ bytes, name }) => {
        const transfer = new DataTransfer();
        transfer.items.add(
          new File([new Uint8Array(bytes)], name, { type: 'application/x-go-sgf' }),
        );
        const target = document.querySelector('#board');
        const over = new DragEvent('dragover', {
          bubbles: true,
          cancelable: true,
          dataTransfer: transfer,
        });
        if (target.dispatchEvent(over)) throw Error('Studio did not accept a file dragover');
        target.dispatchEvent(
          new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }),
        );
      },
      { bytes: [...bytes], name },
    );
  }
  try {
    await page.goto(`${origin}/studio/`);
    await page.locator('#board svg').waitFor();
    await drop(
      Buffer.from([
        ...Buffer.from('(;SZ[9]CA[Shift_JIS]GN[Japanese archive]PB['),
        0x83,
        0x5c,
        0x95,
        0x5c,
        ...Buffer.from(']C['),
        0x83,
        0x5c,
        0x95,
        0x5c,
        ...Buffer.from(']LB[aa:'),
        0x83,
        0x5c,
        ...Buffer.from('])'),
      ]),
      'japanese.sgf',
    );
    await page.waitForFunction(() =>
      document.querySelector('#status').textContent.includes('Opened japanese.sgf'),
    );
    verify(
      (await page.locator('#black-name').innerText()) === 'ソ表' &&
        (await page.locator('#comment').inputValue()) === 'ソ表' &&
        (await page.locator('#board [data-marker]').textContent()) === 'ソ',
      'Shift_JIS dropped metadata/comment/label lost',
    );
    await page.locator('#comment').fill('Edited 日本');
    await page.locator('#comment').blur();
    const japaneseSaved = page.waitForEvent('download');
    await page.locator('#export').click();
    await (await japaneseSaved).saveAs('output/playwright/japanese-roundtrip.sgf');
    await page.locator('#file').setInputFiles('output/playwright/japanese-roundtrip.sgf');
    await page.waitForFunction(() =>
      document.querySelector('#status').textContent.includes('Opened japanese-roundtrip.sgf'),
    );
    verify(
      (await page.locator('#black-name').innerText()) === 'ソ表' &&
        (await page.locator('#comment').inputValue()) === 'Edited 日本' &&
        (await page.locator('#board [data-marker]').textContent()) === 'ソ',
      'Japanese edit/export/reopen lost text',
    );
    const archive =
      '(;FF[4]GM[1]CA[UTF-8]SZ[9]GN[Drop archive]PB[Black & 日本]PW[White <tag>]KM[6.5]HA[2]AB[cc][gg]C[Imported notes]XX[drop-preserve](;W[ee]C[Main line]LB[ee:A])(;W[df]C[Alternative]))';
    await drop(Buffer.from(archive), 'drop-archive.sgf');
    await page.waitForFunction(() =>
      document.querySelector('#status').textContent.includes('Opened drop-archive.sgf'),
    );
    verify(
      (await page.locator('#black-name').innerText()) === 'Black & 日本',
      'Dropped UTF-8 metadata lost',
    );
    verify(
      (await page.locator('#white-name').innerText()) === 'White <tag>' &&
        (await page.locator('#white-name tag').count()) === 0,
      'Dropped metadata became markup',
    );
    verify(
      (await page.locator('#board-info').innerText()) === '9 × 9 / 6.5',
      'Dropped size/komi not displayed',
    );
    verify(
      (await page.locator('#board [data-stone]').count()) === 2 &&
        (await page.locator('#comment').inputValue()) === 'Imported notes',
      'Dropped setup/comments not displayed',
    );
    await page.locator('#next').click();
    verify(
      (await page.locator('#board [data-stone="4,4"]').count()) === 1 &&
        (await page.locator('#board [data-marker]').count()) === 1,
      'Dropped main line/marker failed',
    );
    await page.locator('#tree').getByRole('button', { name: '1 · White D4', exact: true }).click();
    verify(
      (await page.locator('#comment').inputValue()) === 'Alternative',
      'Dropped original branch failed',
    );
    await page.locator('#first').click();
    await page.locator('#comment').fill('Unsaved drop note');
    await page.locator('#comment').blur();
    const replacement = Buffer.from('(;SZ[13]GN[Replacement])');
    await drop(replacement, 'replacement.sgf');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    verify(
      (await page.locator('#game-name').innerText()) === 'Drop archive' &&
        (await page.locator('#comment').inputValue()) === 'Unsaved drop note',
      'Cancelled drop lost the active record',
    );
    await drop(replacement, 'replacement.sgf');
    const saved = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export & continue', exact: true }).click();
    const download = await saved;
    await download.saveAs('output/playwright/drop-preserved.sgf');
    await page.waitForFunction(
      () => document.querySelector('#game-name').textContent === 'Replacement',
    );
    await page.locator('#file').setInputFiles('output/playwright/drop-preserved.sgf');
    await page.waitForFunction(
      () => document.querySelector('#game-name').textContent === 'Drop archive',
    );
    verify(
      (await page.locator('#comment').inputValue()) === 'Unsaved drop note' &&
        (await page.locator('#dirty').innerText()) === 'No changes',
      'Dropped export/reopen lost notes or baseline',
    );
    verify(
      (await page
        .locator('#tree')
        .getByRole('button', { name: '1 · White E5', exact: true })
        .count()) === 1 &&
        (await page
          .locator('#tree')
          .getByRole('button', { name: '1 · White D4', exact: true })
          .count()) === 1,
      'Dropped export/reopen lost branches',
    );
    await drop(
      Buffer.from([...Buffer.from('(;CA[UTF-8]C['), 255, 93, 41]),
      'malformed-encoding.sgf',
    );
    await page.waitForFunction(() =>
      /decod|encod|malform/i.test(document.querySelector('#status').textContent),
    );
    verify(
      (await page.locator('#game-name').innerText()) === 'Drop archive' &&
        (await page.locator('#comment').inputValue()) === 'Unsaved drop note',
      'Invalid dropped bytes replaced the active record',
    );
    verify(
      (await page.locator('dialog[open]').count()) === 0,
      'Invalid dropped bytes opened a replacement guard',
    );
    await page.screenshot({ path: 'output/playwright/studio-drop-reopen.png', fullPage: true });
    // Defer the browser's real File read; exercise the same public drop boundary.
    await page.evaluate(() => {
      const original = File.prototype.arrayBuffer;
      window.restoreFileRead = () => {
        File.prototype.arrayBuffer = original;
      };
      File.prototype.arrayBuffer = function () {
        if (!this.name.startsWith('delayed-')) return original.call(this);
        return new Promise((resolve, reject) => {
          window.finishFileRead = async () => {
            if (this.name === 'delayed-error.sgf') reject(Error('Stale file read error'));
            else resolve(await original.call(this));
            await new Promise(requestAnimationFrame);
          };
        });
      };
    });
    try {
      const older = Buffer.from('(;SZ[9]GN[Older delayed record])');
      await drop(older, 'delayed-old.sgf');
      await drop(Buffer.from('(;SZ[13]GN[Latest selected record])'), 'latest.sgf');
      await page.waitForFunction(
        () => document.querySelector('#game-name').textContent === 'Latest selected record',
      );
      await page.evaluate(() => window.finishFileRead());
      verify(
        (await page.locator('#game-name').textContent()) === 'Latest selected record',
        'Late file read overwrote newer selection',
      );
      await drop(older, 'delayed-error.sgf');
      await drop(Buffer.from('(;SZ[9]GN[Latest after error])'), 'latest-error.sgf');
      await page.waitForFunction(
        () => document.querySelector('#game-name').textContent === 'Latest after error',
      );
      const status = await page.locator('#status').textContent();
      await page.evaluate(() => window.finishFileRead());
      verify(
        (await page.locator('#status').textContent()) === status,
        'Stale read error overwrote current status',
      );
      await drop(older, 'delayed-invalid.sgf');
      await drop(Buffer.from('(bad'), 'latest-invalid.sgf');
      await page.waitForFunction(() =>
        document.querySelector('#status').textContent.includes('SGF file has invalid syntax'),
      );
      await page.evaluate(() => window.finishFileRead());
      verify(
        (await page.locator('#game-name').textContent()) === 'Latest after error',
        'Earlier file replaced record after latest input failed',
      );
      await drop(older, 'delayed-new.sgf');
      await studioControl(page, '#new', 'record', () => page.locator('#new').click());
      await page.waitForFunction(
        () => document.querySelector('#board svg').getAttribute('data-board-width') === '19',
      );
      await page.evaluate(() => window.finishFileRead());
      verify(
        (await page.locator('#board svg').getAttribute('data-board-width')) === '19',
        'Late file replaced a new record',
      );
      await drop(older, 'delayed-sample.sgf');
      await studioControl(page, '#sample', 'record', () => page.locator('#sample').click());
      await page.waitForFunction(
        () => document.querySelector('#game-name').textContent === 'Opening study',
      );
      await page.evaluate(() => window.finishFileRead());
      verify(
        (await page.locator('#game-name').textContent()) === 'Opening study',
        'Late file replaced the example record',
      );
    } finally {
      await page.evaluate(() => {
        window.restoreFileRead();
        delete window.restoreFileRead;
        delete window.finishFileRead;
      });
    }
    verify(
      errors.length === 0 && external.length === 0,
      `Dropped file errors/remote requests: ${[...errors, ...external].join('; ')}`,
    );
    return 'banora-drop-complete';
  } finally {
    page.off('pageerror', onError);
    page.off('request', onRequest);
  }
};

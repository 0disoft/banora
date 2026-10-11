// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async (page) => {
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

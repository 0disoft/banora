async page => {
  const origin = new URL(page.url()).origin;
  const errors = [], external = [];
  const onError = error => errors.push(String(error));
  const onRequest = request => {
    if (new URL(request.url()).origin !== origin || request.method() !== 'GET') external.push(request.url());
  };
  const verify = (condition, message) => {if (!condition) throw Error(message);};
  page.on('pageerror', onError);
  page.on('request', onRequest);
  const archive = '(;FF[4]GM[1]CA[UTF-8]SZ[9]GN[Standalone archive]PB[Black 日本]PW[White <tag>]XX[standalone-preserve]AB[cc][gg]PL[W](;W[ee]C[Main line])(;W[df]C[Alternative]))';
  const upload = async (buffer, name = 'my-study.sgf', target = page) => {
    await target.locator('#file').setInputFiles({name, mimeType: 'application/x-go-sgf', buffer});
  };
  const opened = async (name, target = page) => {
    await target.waitForFunction(name => document.querySelector('#status').textContent.includes(`Opened ${name}`), name);
  };
  try {
    await page.locator('#viewer svg').waitFor();
    await upload(Buffer.from(archive));
    await opened('my-study.sgf');
    verify(await page.locator('#viewer [data-stone]').count() === 2, 'Opening SGF lost setup');
    verify((await page.locator('[data-summary]').innerText()).includes('Black 日本 / White <tag>'), 'Metadata was not rendered as text');
    verify(await page.locator('#viewer tag').count() === 0, 'Metadata became markup');
    await page.getByRole('button', {name: 'Next move', exact: true}).click();
    verify(await page.getByRole('textbox', {name: 'Position comments'}).inputValue() === 'Main line', 'Main line failed');
    await page.getByText('Variations', {exact: true}).click();
    await page.getByRole('button', {name: 'Select White D4', exact: true}).click();
    verify(await page.getByRole('textbox', {name: 'Position comments'}).inputValue() === 'Alternative', 'Original branch failed');

    // Public board keyboard creates a new continuation; no private app/model hooks.
    const board = page.locator('#viewer svg');
    await board.focus();
    for (let i = 0; i < 9; i++) {await board.press('ArrowLeft'); await board.press('ArrowUp');}
    await board.press('Enter');
    await page.waitForFunction(() => document.querySelector('#record-state').textContent.includes('Move 2'));
    verify(await page.locator('#viewer [data-stone="0,0"]').count() === 1, 'Keyboard continuation was not placed');
    const comment = page.getByRole('textbox', {name: 'Position comments'});
    await comment.fill('My saved continuation');
    await comment.blur();
    await page.getByRole('button', {name: 'Undo', exact: true}).click();
    verify(await comment.inputValue() === '', 'Comment Undo failed');
    await page.getByRole('button', {name: 'Redo', exact: true}).click();
    verify(await comment.inputValue() === 'My saved continuation', 'Comment Redo failed');

    await page.getByRole('button', {name: 'New record', exact: true}).click();
    await page.getByRole('button', {name: 'Cancel', exact: true}).click();
    verify(await comment.inputValue() === 'My saved continuation', 'Cancelled replacement lost changes');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', {name: 'Save SGF', exact: true}).click();
    const download = await downloadPromise;
    verify(download.suggestedFilename() === 'my-study.sgf', 'Download filename was lost');
    await download.saveAs('output/playwright/standalone-roundtrip.sgf');
    verify((await page.locator('#record-state').innerText()).includes('No changes'), 'Save did not update baseline');
    await page.getByRole('button', {name: 'New record', exact: true}).click();
    await opened('untitled.sgf');
    await page.locator('#file').setInputFiles('output/playwright/standalone-roundtrip.sgf');
    await opened('standalone-roundtrip.sgf');
    await page.getByRole('button', {name: 'Select Black A9', exact: true}).click();
    verify(await comment.inputValue() === 'My saved continuation', 'Reopen lost continuation/comment');
    verify(await page.getByRole('button', {name: 'Select White E5', exact: true}).count() === 1 &&
      await page.getByRole('button', {name: 'Select White D4', exact: true}).count() === 1, 'Reopen lost original branches');

    await page.locator('#editing').uncheck();
    verify(await comment.getAttribute('readonly') !== null && !await page.getByRole('button', {name: 'Pass', exact: true}).isVisible(), 'Read-only toggle failed');
    await page.getByRole('button', {name: 'Previous move', exact: true}).click();
    verify(await comment.inputValue() === 'Alternative', 'Read-only navigation failed');
    await page.locator('#editing').check();
    await comment.fill('Guarded local note');
    await comment.blur();
    const stateBefore = await page.locator('#record-state').innerText();
    await upload(Buffer.from('not an SGF'), 'invalid.sgf');
    await page.waitForFunction(() => !document.querySelector('#open').disabled);
    verify(await page.locator('#record-state').innerText() === stateBefore && await comment.inputValue() === 'Guarded local note', 'Invalid SGF destroyed the record');
    verify(await page.locator('dialog[open]').count() === 0, 'Invalid SGF opened the replacement guard');
    await upload(Buffer.from([40,59,67,65,91,85,84,70,45,56,93,67,91,255,93,41]), 'invalid-encoding.sgf');
    await page.waitForFunction(() => !document.querySelector('#open').disabled);
    verify(await comment.inputValue() === 'Guarded local note' && /encod|decod/i.test(await page.locator('#status').innerText()), 'Invalid byte encoding was not retained/reported');
    await upload(Buffer.alloc(5 * 1024 * 1024 + 1), 'oversize.sgf');
    verify((await page.locator('#status').innerText()).includes('5 MiB') && await comment.inputValue() === 'Guarded local note', 'Oversize guard failed');

    const guardedSave = page.waitForEvent('download');
    await page.getByRole('button', {name: 'Open sample', exact: true}).click();
    await page.getByRole('button', {name: 'Save & open', exact: true}).click();
    await (await guardedSave).saveAs('output/playwright/standalone-guarded.sgf');
    await opened('opening-study.sgf');
    await page.getByRole('textbox', {name: 'Position comments'}).fill('Discard this note');
    await page.getByRole('button', {name: 'New record', exact: true}).click();
    await page.getByRole('button', {name: 'Discard & open', exact: true}).click();
    await opened('untitled.sgf');
    verify(await page.getByRole('textbox', {name: 'Position comments'}).inputValue() === '', 'Discard did not open clean replacement');
    await page.getByRole('button', {name: 'Open sample', exact: true}).click();
    await opened('opening-study.sgf');
    await page.screenshot({path: 'output/playwright/standalone-desktop.png', fullPage: true});

    const mobile = await page.context().browser().newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, deviceScaleFactor: 2});
    try {
      const phone = await mobile.newPage();
      phone.on('pageerror', onError);
      phone.on('request', onRequest);
      await phone.goto(`${origin}/`);
      await phone.locator('#viewer svg').waitFor();
      await upload(Buffer.from(archive), 'phone.sgf', phone);
      await opened('phone.sgf', phone);
      await phone.locator('#viewer svg').scrollIntoViewIfNeeded();
      const point = await phone.locator('#viewer svg').evaluate(svg => {
        const point = svg.createSVGPoint(); point.x = 1.25; point.y = 1.25;
        const ctm = svg.getScreenCTM();
        if (!ctm) throw Error('Missing board transform');
        const shown = point.matrixTransform(ctm);
        return {x: shown.x, y: shown.y};
      });
      await phone.touchscreen.tap(point.x, point.y);
      await phone.waitForFunction(() => document.querySelector('#record-state').textContent.includes('Move 1'));
      verify(await phone.locator('#viewer [data-stone="0,0"]').count() === 1, 'Emulated touch placement failed');
      verify(await phone.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile layout overflows');
      await phone.screenshot({path: 'output/playwright/standalone-mobile.png', fullPage: true});
    } finally {await mobile.close();}
    verify(errors.length === 0 && external.length === 0, `Runtime errors or remote requests: ${[...errors, ...external].join('; ')}`);
    return 'banora-standalone-complete';
  } finally {page.off('pageerror', onError); page.off('request', onRequest);}
}

// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async page => {
  const origin=new URL(page.url()).origin,errors=[],requests=[];
  page.on('pageerror',error => errors.push(String(error)));
  page.on('request',request => {if (/^https?:/.test(request.url()) && new URL(request.url()).origin!==origin) requests.push(request.url());});
  const verify=(condition,message) => {if (!condition) throw Error(message);};
  const wait=async predicate => {
    try {await page.waitForFunction(predicate,undefined,{timeout:10_000});}
    catch {
      await page.screenshot({path:'output/playwright/share-failure.png',fullPage:true});
      throw Error(`Share wait failed at ${page.url()}: ${await page.locator('[data-share="status"]').allTextContents()} / ${await page.locator('#state,#status').allTextContents()}`);
    }
  };
  await page.goto(`${origin}/studio/`);
  const fixtures=await page.evaluate(async () => {
    const sdk=await import('/sdk/index.js');
    const controller=new sdk.RecordController({sgf:'(;SZ[9]PB[private name]XX[keep])(;SZ[5:9]AB[ab]C[root private];B[bc](;W[cd]C[left private])(;W[de];B[ei]C[제로디 🦆 <img src=x onerror=alert(1)>]))'});
    controller.goTo(controller.getState().record.games[1].id);controller.next();controller.next(1);controller.next();
    controller.setMarker({x:2,y:2},'label','Share');controller.setConnection({x:1,y:2},{x:4,y:8},'arrow');
    controller.addStroke([{x:0.5,y:2},{x:3,y:4.25}],{color:'#cc5522'});
    const result={};
    for (const kind of ['record','node','position']) {
      const link=sdk.createShareLink(controller.getState(),location.href,{kind});if (!link.ok) throw Error(link.message);result[kind]=new URL(link.value).hash;
    }
    controller.dispose();return result;
  });
  const selector=name => page.locator(`[data-share="${name}"]`);
  for (const name of ['studio','react','vue','svelte']) {
    const studio=name==='studio',path=`${origin}/${name}/`;
    await page.goto(path+fixtures.node);
    await wait(() => document.querySelector('[data-share="status"]')?.textContent.includes('Opened the shared record'));
    const svg=page.locator(studio ? '#board svg' : '#board-host svg');
    const notes=studio ? page.locator('#comment') : page.locator('#viewer-host').getByRole('textbox',{name:'Position comments'});
    verify(await svg.getAttribute('data-board-width')==='5' && await svg.getAttribute('data-board-height')==='9',`${name}: target game lost`);
    verify(await svg.locator('[data-stone]').count()===4,`${name}: target branch lost`);
    verify(await notes.inputValue()==='제로디 🦆 <img src=x onerror=alert(1)>',`${name}: Unicode/comment target lost`);
    verify(await page.locator('img').count()===0,`${name}: SGF comment interpreted as HTML`);
    const count=await svg.locator('[data-stroke]').count();verify(count>0,`${name}: shared ink missing`);
    await selector('create').click();const created=await selector('output').inputValue();
    const decoded=await page.evaluate(async link => (await import('/sdk/share.js')).decodeShareLink(link),created);
    verify(decoded.ok && decoded.value.locator.gameIndex===1 && decoded.value.locator.path.join(',')==='0,1,0',`${name}: share target changed`);
    verify(created.startsWith(path+'#banora=v1.') && decoded.value.sgf.includes('XX[keep]'),`${name}: record loss/base URL failed`);
    await notes.fill('unsaved sharing note');await notes.blur();
    await selector('create').click();const dirtyLink=await selector('output').inputValue();
    await page.evaluate(() => {window.__copied='';Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text => {window.__copied=text;}}});});
    await selector('copy').click();await wait(() => document.querySelector('[data-share="status"]').textContent.includes('Link copied'));
    verify(await page.evaluate(() => window.__copied)===dirtyLink,`${name}: clipboard snapshot failed`);
    verify(studio ? (await page.locator('#dirty').innerText()).includes('Unsaved') : (await page.locator('#state').innerText()).includes('changed'),`${name}: copy cleared dirty baseline`);
    verify(new URL(page.url()).hash===fixtures.node,`${name}: creation/copy navigated address`);
    await page.evaluate(() => {navigator.clipboard.writeText=async () => {throw Error('Clipboard blocked');};});
    await selector('copy').click();await wait(() => document.querySelector('[data-share="status"]').textContent.includes('copy it manually'));
    verify(await selector('output').inputValue()===dirtyLink,`${name}: clipboard failure lost manual link`);
    await selector('input').fill(path+'#banora=v2.AA');await selector('open').click();
    verify(await selector('status').innerText()==='Unsupported Banora share version',`${name}: malformed link not reported`);
    verify(await notes.inputValue()==='unsaved sharing note' && await page.locator('dialog[open]').count()===0,`${name}: invalid link changed record or prompted`);
    await selector('input').fill(path+fixtures.position);await selector('open').click();
    const guard=page.locator('dialog[open]');await guard.waitFor();await guard.getByRole('button',{name:'Cancel',exact:true}).click();
    await wait(() => !document.querySelector('dialog[open]'));
    verify(await notes.inputValue()==='unsaved sharing note',`${name}: cancelled share lost edits`);
    await selector('open').click();await guard.waitFor();
    const downloadPromise=page.waitForEvent('download');await guard.getByRole('button',{name:'Export & continue',exact:true}).click();
    const download=await downloadPromise;await download.saveAs(`output/playwright/${name}-share-before-open.sgf`);
    await wait(() => document.querySelector('[data-share="status"]').textContent.includes('Opened a static position'));
    verify(await notes.inputValue()==='' && await svg.locator('[data-stone]').count()===4,`${name}: static position failed`);
    await selector('kind').selectOption('position');await selector('create').click();
    const position=await page.evaluate(async link => (await import('/sdk/share.js')).decodeShareLink(link),await selector('output').inputValue());
    verify(position.ok && !position.value.sgf.includes('private') && !position.value.sgf.includes('XX[') && !position.value.sgf.includes('unsaved'),`${name}: position leaked record metadata`);
    verify(position.value.record.games.length===1 && position.value.record.games[0].children.length===0,`${name}: static link contains moves`);
    await notes.fill('optional current comment');await notes.blur();await selector('comment').check();await selector('create').click();
    const commentShare=await page.evaluate(async link => (await import('/sdk/share.js')).decodeShareLink(link),await selector('output').inputValue());
    verify(commentShare.ok && commentShare.value.record.games[0].properties.C[0]==='optional current comment',`${name}: comment opt-in failed`);
    await selector('input').fill(path+fixtures.record);await selector('open').click();await guard.waitFor();
    await guard.getByRole('button',{name:'Discard',exact:true}).click();
    await wait(() => document.querySelector('[data-share="status"]').textContent.includes('Opened the shared record'));
    verify(await notes.inputValue()==='root private' && await svg.locator('[data-stone]').count()===1,`${name}: record link did not select game root`);
    await notes.fill('x'.repeat(20_000));await notes.blur();await selector('kind').selectOption('node');await selector('create').click();
    verify((await selector('status').innerText()).includes('too large') && await selector('output').inputValue()==='' && await selector('copy').isDisabled(),`${name}: oversized link truncated or retained old output`);
    await notes.fill('pending edit retained');await notes.blur();
    if (!studio) {
      await selector('input').fill(path+fixtures.node);await selector('open').click();await guard.waitFor();
      // The host may replace an adapter/controller while a modal is pending.
      await page.locator('#swap').evaluate(button => button.click());
      await wait(() => !document.querySelector('dialog[open]') && document.querySelector('#state').textContent.includes('13 × 13'));
      await page.locator('#swap').click();await wait(() => document.querySelector('#board-host svg')?.dataset.boardWidth==='5');
      verify(await notes.inputValue()==='pending edit retained',`${name}: disposed approval replaced old controller`);
      await page.locator('#toggle').click();verify(await page.locator('.sharing-controls').count()===0,`${name}: unmounted share panel leaked`);
      await page.locator('#toggle').click();await selector('create').waitFor();
      verify(await page.locator('.sharing-controls').count()===1 && await notes.inputValue()==='pending edit retained',`${name}: remount reopened initial hash or duplicated UI`);
    }
    await page.screenshot({path:`output/playwright/${name}-sharing.png`,fullPage:true});
    // Playwright CLI yields control at native dialogs, including beforeunload.
    // Save this intentionally dirty fixture before moving to the next consumer.
    if (studio) {
      const saved=page.waitForEvent('download');await page.locator('#export').click();await saved;
      verify((await page.locator('#dirty').innerText()).includes('No changes'),'Studio fixture export did not clear its exact baseline');
    }
  }
  verify(errors.length===0,`Share browser errors: ${errors.join('; ')}`);
  verify(requests.length===0,`Share triggered external requests: ${requests.join('; ')}`);
  return 'banora-sharing-complete: studio react vue svelte';
}

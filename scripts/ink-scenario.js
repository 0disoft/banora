async page => {
  const origin = new URL(page.url()).origin;
  const errors = [];
  const onError = error => errors.push(String(error)); page.on('pageerror',onError);
  const verify = (condition, message) => {if (!condition) throw Error(message);};
  async function screen(board, points) {
    await board.scrollIntoViewIfNeeded();
    return board.evaluate(async (svg, logical) => {
      const sdk = await import('/sdk/index.js');
      const size = {width:Number(svg.dataset.boardWidth),height:Number(svg.dataset.boardHeight)};
      const transform = {rotation:Number(svg.dataset.rotation),flipX:svg.dataset.flipX === 'true'};
      return logical.map(point => {
        const shown = sdk.toDisplayPoint(point,size,transform), vector = svg.createSVGPoint();
        vector.x=shown.x+1.25; vector.y=shown.y+1.25;
        const result = vector.matrixTransform(svg.getScreenCTM());
        return {x:result.x,y:result.y};
      });
    },points);
  }
  async function drag(board, points, finish = true) {
    const targets = await screen(board,points);
    await page.mouse.move(targets[0].x,targets[0].y); await page.mouse.down();
    for (const target of targets.slice(1)) await page.mouse.move(target.x,target.y,{steps:4});
    if (finish) await page.mouse.up();
  }
  const points = [{x:1.125,y:2.25},{x:2.25,y:3.125},{x:3.5,y:5.75}];
  try {
    await page.goto(`${origin}/studio/`);
    await page.locator('#file').setInputFiles({name:'ink.sgf',mimeType:'application/x-go-sgf',buffer:Buffer.from('(;SZ[5:9]GN[Ink study]XX[keep];B[aa])')});
    await page.waitForFunction(() => document.querySelector('#game-name').textContent === 'Ink study');
    await page.locator('#rotation').selectOption('90'); await page.locator('#flip-x').check();
    await page.locator('#tool').selectOption('pen');
    await page.locator('#ink-color').fill('#cc5522'); await page.locator('#ink-width').selectOption('0.16');
    const board = page.locator('#board svg');
    await drag(board,points,false);
    verify(await board.locator('[data-preview="ink"]').count() === 1,'Ink preview missing');
    verify(await page.locator('#dirty').innerText() === 'No changes','Preview edited the record');
    await page.keyboard.press('Escape'); await page.mouse.up();
    verify(await board.locator('[data-stroke],[data-preview="ink"]').count() === 0,'Escape did not discard ink');
    await drag(board,points);
    verify(await board.locator('[data-stroke]').count() === 1 && await page.locator('#move').innerText() === 'Move 0','Drawing placed stones or lost ink');
    verify(await page.locator('#dirty').innerText() === 'Unsaved changes','Ink did not mark record dirty');
    await page.locator('#undo').click();
    verify(await board.locator('[data-stroke]').count() === 0 && await page.locator('#dirty').innerText() === 'No changes','Stroke was not one Undo unit');
    await page.locator('#redo').click();
    const downloadPromise = page.waitForEvent('download'); await page.locator('#export').click();
    const download = await downloadPromise; await download.saveAs('output/playwright/ink-roundtrip.sgf');
    await page.locator('#clear-ink').click();
    verify(await board.locator('[data-stroke]').count() === 0,'Studio clear ink failed');
    await page.locator('#undo').click();
    verify(await page.locator('#dirty').innerText() === 'No changes','Clear Undo lost export baseline');
    await page.locator('#file').setInputFiles('output/playwright/ink-roundtrip.sgf');
    await page.waitForFunction(() => document.querySelectorAll('#board [data-stroke]').length === 1);
    await page.screenshot({path:'output/playwright/studio-ink.png',fullPage:true});
    await page.locator('#next').click();
    verify(await board.locator('[data-stroke]').count() === 0,'Ink leaked onto another node');
    await page.locator('#previous').click();

    // Real pointers exercise capture; direct public APIs inspect the persisted format.
    const exportedText = await (await download.createReadStream()).toArray();
    const persisted = await page.evaluate(async text => {
      const sdk = await import('/sdk/index.js'); const record = new sdk.RecordController({sgf:text});
      const state = record.getState(); record.dispose();
      return {strokes:state.strokes,unknown:state.node.properties.XX};
    }, Buffer.concat(exportedText).toString());
    verify(persisted.unknown[0] === 'keep' && persisted.strokes.length === 1,'Ink SGF lost unknown properties');
    const stroke = persisted.strokes[0];
    verify(stroke.color === '#cc5522' && stroke.width === 0.16,'Studio ink style not persisted');
    verify(Math.abs(stroke.points[0].x-points[0].x)<0.02 && Math.abs(stroke.points.at(-1).y-points.at(-1).y)<0.02,'Transformed ink saved display coordinates');

    const result = await page.evaluate(async () => {
      const sdk = await import('/sdk/index.js');
      const host = document.createElement('div'); host.style.width='420px'; document.body.append(host);
      const controller = new sdk.RecordController({sgf:'(;SZ[5:9];B[aa])'});
      const view = sdk.mountBoard(host,{controller,drawing:{color:'#ff0000',width:0.2},coordinates:false,transform:{rotation:90,flipX:true}});
      const svg = host.querySelector('svg'); svg.focus();
      const key = name => svg.dispatchEvent(new KeyboardEvent('keydown',{key:name,bubbles:true,cancelable:true}));
      const baseline = controller.getState();
      key(' '); key('ArrowUp'); key(' ');
      if (controller.getState() !== baseline || !svg.querySelector('[data-preview="ink"]') || view.exportSvg().includes('data-preview')) throw Error('Keyboard preview mutated/exported pending ink');
      const before = svg.outerHTML; let rejected=false;
      try {view.update({drawing:{color:'url(https://example.com)'}});} catch {rejected=true;}
      if (!rejected || svg.outerHTML !== before) throw Error('Invalid drawing config cancelled the gesture');
      key('Enter');
      if (controller.getState().strokes.length !== 1 || controller.getState().position.moveNumber !== 0) throw Error('Keyboard ink failed');
      const stroke = controller.getState().strokes[0];
      if (stroke.points[0].x !== 0 || stroke.points.at(-1).x !== 1) throw Error('Keyboard ink lost logical transform');
      const xml = new DOMParser().parseFromString(view.exportSvg({width:420}),'image/svg+xml');
      if (xml.querySelector('parsererror') || !xml.querySelector('[data-stroke]') || xml.querySelector('[data-preview],[data-cursor]')) throw Error('SVG lost saved ink or retained preview');
      const image = await createImageBitmap(await view.exportPng({width:420}));
      const canvas = document.createElement('canvas'); canvas.width=image.width; canvas.height=image.height;
      const context = canvas.getContext('2d'); context.drawImage(image,0,0); image.close();
      // Reflection then rotation maps logical (0.5,0) to (8,3.5), SVG (9.25,4.75).
      const pixel = context.getImageData(Math.round(9.25/10.5*420),Math.round(4.75/6.5*canvas.height),1,1).data;
      if (pixel[0] !== 255 || pixel[1] !== 0 || pixel[2] !== 0 || pixel[3] !== 255) throw Error('PNG did not contain ink: '+[...pixel]);
      key(' '); key('ArrowUp'); key(' '); controller.next();
      if (svg.querySelector('[data-preview="ink"]') || controller.getState().strokes.length) throw Error('Node navigation failed to cancel pending ink');
      controller.previous();
      key(' '); key('ArrowUp'); key(' '); view.update({drawing:null});
      if (svg.querySelector('[data-preview="ink"]')) throw Error('Tool switch retained preview');
      view.update({drawing:{},readOnly:true}); key(' '); key('ArrowUp'); key('Enter');
      if (controller.getState().strokes.length !== 1 || svg.querySelector('[data-preview="ink"]')) throw Error('Read-only keyboard drawing edited ink');
      view.update({readOnly:false}); key(' '); key('ArrowUp'); key(' ');
      const untouched = controller.getState(); view.dispose();
      if (controller.getState() !== untouched || host.querySelector('svg')) throw Error('Disposal committed pending ink or destroyed external controller');
      controller.dispose(); host.remove(); return true;
    });
    verify(result,'Public ink lifecycle failed');

    await page.evaluate(async () => {
      const sdk = await import('/sdk/index.js');
      const host = document.createElement('div'); host.id='ink-lifecycle'; host.style.width='420px'; document.body.append(host);
      const controller = new sdk.RecordController({sgf:'(;SZ[5:9];B[aa])'});
      const view = sdk.mountBoard(host,{controller,drawing:{},crop:{x:1,y:2,width:3,height:4}});
      window.banoraInkCheck = {host,controller,view};
    });
    const lifecycle = page.locator('#ink-lifecycle svg');
    try {
      for (const rotation of [0,90,180,270]) for (const flipX of [false,true]) {
        await page.evaluate(config => window.banoraInkCheck.view.update({transform:config}),{rotation,flipX});
        await drag(lifecycle,[{x:1.125,y:2.25},{x:2.75,y:4.5}]);
        verify(await page.evaluate(() => {
          const stroke=window.banoraInkCheck.controller.getState().strokes.at(-1);
          return Math.abs(stroke.points[0].x-1.125)<0.02 && Math.abs(stroke.points.at(-1).y-4.5)<0.02;
        }),'Cropped/transformed drag lost logical coordinates');
      }
      await drag(lifecycle,[{x:1.5,y:2.5},{x:2.5,y:4}],false);
      await page.evaluate(() => window.banoraInkCheck.view.update({drawing:null})); await page.mouse.up();
      verify(await page.evaluate(() => {
        const state=window.banoraInkCheck.controller.getState(); return state.strokes.length===8 && state.position.moveNumber===0;
      }),'Cancelled drawing pointerup became a stone placement');
      await page.evaluate(() => window.banoraInkCheck.view.update({drawing:{}}));
      await drag(lifecycle,[{x:1.5,y:2.5},{x:2.5,y:4}],false);
      await page.evaluate(() => window.banoraInkCheck.controller.next()); await page.mouse.up();
      verify(await lifecycle.locator('[data-stroke],[data-preview="ink"]').count()===0,'Navigation committed a pending drag onto another node');
      const click = (await screen(lifecycle,[{x:2,y:3}]))[0]; await page.mouse.click(click.x,click.y);
      verify(await lifecycle.locator('[data-stroke]').count()===0,'A click created degenerate ink');
    } finally {
      await page.mouse.up();
      await page.evaluate(() => {const {host,controller,view}=window.banoraInkCheck; view.dispose();controller.dispose();host.remove();delete window.banoraInkCheck;});
    }

    for (const framework of ['react','vue','svelte']) {
      await page.goto(`${origin}/${framework}/`);
      const widget = page.locator('#board-host svg'), viewer = page.locator('#viewer-host svg');
      await widget.waitFor(); await page.locator('#ink').click(); await page.locator('#rotate').click(); await page.locator('#reflect').click();
      await drag(widget,[{x:2.25,y:2.5},{x:4,y:5}]);
      await page.waitForFunction(() => document.querySelector('#ink-count').textContent === 'Ink strokes 1');
      verify(await viewer.locator('[data-stroke]').count() === 1,`${framework}: shared viewer lost ink`);
      verify(await widget.locator('[data-stroke]').getAttribute('stroke') === '#cc5522',`${framework}: style update missing`);
      await page.locator('#readonly').click(); await drag(widget,[{x:5,y:5},{x:7,y:7}]);
      verify(await page.locator('#ink-count').innerText() === 'Ink strokes 1',`${framework}: read-only ink mutated record`);
      await page.locator('#readonly').click();
      await drag(viewer,[{x:3,y:3},{x:6,y:4}]);
      await page.waitForFunction(() => document.querySelector('#ink-count').textContent === 'Ink strokes 2');
      await page.locator('#undo-edit').click(); await page.locator('#clear-ink').click(); await page.locator('#undo-edit').click();
      await page.waitForFunction(() => document.querySelector('#ink-count').textContent === 'Ink strokes 1');
      await page.locator('#toggle').click(); await page.locator('#toggle').click();
      await widget.waitFor();
      verify(await widget.locator('[data-stroke]').count() === 1,`${framework}: remount lost ink`);
      await page.locator('#ink').click();
      verify(await widget.evaluate(svg => svg.style.touchAction === 'none' && !svg.getAttribute('aria-label').includes('ink tool')),`${framework}: disabling ink failed to restore configured touch placement`);
    }
    const mobileContext = await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    try {
      const mobile = await mobileContext.newPage(); mobile.on('pageerror',onError);
      await mobile.goto(`${origin}/studio/`); await mobile.locator('#tool').selectOption('pen');
      const touchBoard = mobile.locator('#board svg'), targets = await screen(touchBoard,[{x:4,y:4},{x:5.5,y:6},{x:8,y:8}]);
      const cdp = await mobileContext.newCDPSession(mobile);
      const touch = (type, point) => cdp.send('Input.dispatchTouchEvent',{type,touchPoints:point ? [{x:point.x,y:point.y,id:1}] : []});
      await touch('touchStart',targets[0]); await touch('touchMove',targets[1]); await touch('touchMove',targets[2]); await touch('touchEnd');
      verify(await touchBoard.locator('[data-stroke]').count() === 1,'Touch drag ink did not commit');
      await touch('touchStart',targets[0]); await touch('touchMove',targets[1]); await touch('touchCancel');
      verify(await touchBoard.locator('[data-stroke]').count() === 1 && await touchBoard.locator('[data-preview="ink"]').count() === 0,'Touch cancellation committed ink');
      verify(!await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth),'Ink controls overflow on mobile');
      await mobile.screenshot({path:'output/playwright/studio-ink-touch.png',fullPage:true});
      await cdp.detach();
    } finally {await mobileContext.close();}
    verify(errors.length === 0,`Ink browser errors: ${errors.join('; ')}`);
    return 'Ink drag/touch/keyboard, cancellation, logical transforms, Undo/reopen, SVG/PNG pixels and all three native adapters passed';
  } finally {page.off('pageerror',onError);}
}

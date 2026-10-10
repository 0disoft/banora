async page => {
  const origin = new URL(page.url()).origin;
  const context = await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const errors=[];
  const verify = (condition,message) => {if (!condition) throw Error(message);};
  try {
    const mobile = await context.newPage();mobile.on('pageerror',error => errors.push(String(error)));
    await mobile.goto(`${origin}/studio/`);
    await mobile.evaluate(async () => {
      const sdk = await import('/sdk/index.js');
      const host=document.createElement('div');host.id='touch-fixture';host.style.cssText='width:320px;margin:auto;transform:translateZ(0);--banora-black:#123456;--banora-board:#fff;';document.body.append(host);
      const controller=new sdk.RecordController({sgf:'(;SZ[5:9]AB[bc]LB[bc:A];B[aa])'});
      const view=sdk.mountBoard(host,{controller,touch:{mode:'confirm'},coordinates:false});
      window.banoraTouchCheck={sdk,host,controller,view,before:controller.getState(),hits:[]};
    });
    let board=mobile.locator('#touch-fixture svg[role="application"]');
    const cdp=await context.newCDPSession(mobile);
    async function screen(points) {
      await board.scrollIntoViewIfNeeded();
      return board.evaluate(async (svg,points) => {
        const sdk=await import('/sdk/index.js');
        return points.map(point => {
          const shown=sdk.toDisplayPoint(point,{width:Number(svg.dataset.boardWidth),height:Number(svg.dataset.boardHeight)},
            {rotation:Number(svg.dataset.rotation),flipX:svg.dataset.flipX==='true'});
          const vector=svg.createSVGPoint();vector.x=shown.x+1.25;vector.y=shown.y+1.25;
          const result=vector.matrixTransform(svg.getScreenCTM());return {x:result.x,y:result.y};
        });
      },points);
    }
    const touch=(type,point) => cdp.send('Input.dispatchTouchEvent',{type,touchPoints:point ? [{x:point.x,y:point.y,id:1}] : []});
    const unchanged=() => mobile.evaluate(() => window.banoraTouchCheck.controller.getState()===window.banoraTouchCheck.before);
    async function start(points) {
      const targets=await screen(points);await touch('touchStart',targets[0]);
      for (const target of targets.slice(1)) await touch('touchMove',target);
      return targets;
    }
    for (const rotation of [0,90,180,270]) for (const flipX of [false,true]) {
      await mobile.evaluate(config => {const f=window.banoraTouchCheck;f.view.update({touch:{mode:'confirm'},transform:config,crop:{x:1,y:2,width:3,height:4}});f.before=f.controller.getState();},{rotation,flipX});
      await start([{x:2,y:3},{x:3,y:4}]);
      verify(await unchanged(),'Aiming changed the record');
      verify(await board.locator('[data-preview="touch"]').getAttribute('data-target')==='3,4','Drag chose wrong logical target');
      const lens=mobile.locator('[data-touch-lens]').last();
      verify(await lens.isVisible(),'Magnified touch lens missing');
      verify(await lens.evaluate(lens => {
        const rectangle=lens.getBoundingClientRect();return rectangle.x>=7 && rectangle.y>=7 && rectangle.right<=innerWidth-7 && rectangle.bottom<=innerHeight-7;
      }),'Touch lens escaped viewport or transformed host');
      verify(await lens.locator('[data-marker="1,2"]').count()===1,'Magnifier did not share board annotations');
      const color=await lens.locator('[data-stone="1,2"]').evaluate(stone => getComputedStyle(stone).fill);
      verify(color==='rgb(18, 52, 86)','Magnifier lost inherited stone color');
      verify(await mobile.evaluate(() => {
        const {view,controller}=window.banoraTouchCheck;const text=view.exportSvg();
        return !text.includes('data-preview') && !text.includes('data-touch-') && !controller.getState().dirty;
      }),'Transient touch state entered diagrams/dirty tracking');
      await touch('touchEnd');
      verify(await unchanged(),'Confirm mode placed before approval');
      verify(!await lens.isVisible(),'Magnifier remained after release');
      await mobile.getByRole('button',{name:'Confirm placement at D5',exact:true}).click();
      verify(await board.locator('[data-stone="3,4"]').count()===1,'Confirmation placed wrong intersection');
      verify(await mobile.evaluate(() => window.banoraTouchCheck.controller.getState().position.moveNumber===1),'Confirmation placed twice');
      await mobile.evaluate(() => window.banoraTouchCheck.controller.undo());
      verify(await mobile.evaluate(() => !window.banoraTouchCheck.controller.getState().dirty),'Touch Undo did not return to baseline');
    }
    await mobile.evaluate(() => {const f=window.banoraTouchCheck;f.view.update({transform:undefined,crop:null,touch:{mode:'release'}});f.before=f.controller.getState();});
    await start([{x:2,y:3},{x:3,y:5}]);verify(await unchanged(),'Release mode edited during drag');await touch('touchEnd');
    verify(await board.locator('[data-stone="3,5"]').count()===1,'Release mode did not commit final target');
    await mobile.evaluate(() => window.banoraTouchCheck.controller.undo());

    for (const action of ['pointercancel','outside','node','update','resize','blur']) {
      await mobile.evaluate(() => {const f=window.banoraTouchCheck;f.controller.goTo(f.controller.getState().record.games[0].id);f.view.update({touch:{mode:'confirm'}});f.before=f.controller.getState();});
      const targets=await start([{x:2,y:3},{x:3,y:5}]);
      if (action==='pointercancel') await touch('touchCancel');
      else if (action==='outside') {await touch('touchMove',{x:1,y:1});await touch('touchEnd');}
      else {
        await mobile.evaluate(action => {
          const f=window.banoraTouchCheck;
          if (action==='node') f.controller.next();
          if (action==='update') f.view.update({touch:null});
          if (action==='resize') dispatchEvent(new Event('resize'));
          if (action==='blur') document.querySelector('#touch-fixture svg').blur();
        },action);
        await touch('touchEnd');
      }
      verify(await board.locator('[data-preview="touch"]').count()===0 && !await mobile.locator('[data-touch-confirm]').last().isVisible(),`${action} retained pending touch`);
      if (action==='update') verify(await board.evaluate(svg => svg.style.touchAction)==='manipulation','Restoring direct mode did not restore browser touch handling');
      verify(await mobile.evaluate(action => {
        const f=window.banoraTouchCheck;return !f.controller.getState().dirty && (action==='node' || f.controller.getState()===f.before);
      },action),`${action} committed cancelled touch`);
    }
    await mobile.evaluate(() => {const f=window.banoraTouchCheck;f.controller.previous();f.view.update({touch:{mode:'confirm',magnifier:false}});f.before=f.controller.getState();});
    await start([{x:2,y:3}]);verify(!await mobile.locator('[data-touch-lens]').last().isVisible(),'Disabled magnifier was visible');await touch('touchEnd');
    verify(await mobile.getByRole('button',{name:'Cancel placement',exact:true}).isVisible(),'Common fixture: confirmation missing after release');
    await mobile.getByRole('button',{name:'Cancel placement',exact:true}).click();verify(await unchanged(),'Cancel button edited record');
    await start([{x:2,y:3}]);await touch('touchEnd');
    await board.focus();await mobile.keyboard.press('ArrowRight');await mobile.keyboard.press('Enter');
    verify(await board.locator('[data-stone="3,3"]').count()===1,'Keyboard refinement/confirmation failed');
    await mobile.evaluate(() => window.banoraTouchCheck.controller.undo());
    await start([{x:2,y:3}]);await touch('touchEnd');await board.focus();await mobile.keyboard.press('Escape');
    verify(!await mobile.locator('[data-touch-confirm]').last().isVisible(),'Escape did not cancel confirmation');
    await start([{x:2,y:3}]);await touch('touchEnd');
    await mobile.evaluate(() => {const f=window.banoraTouchCheck;const before=document.querySelector('#touch-fixture').innerHTML;let rejected=0;
      for (const touch of [{mode:'invalid'},{magnifier:'yes'},{mode:null},{magnifier:null},false,[]]) try {f.view.update({touch});} catch {rejected++;}
      if (rejected!==6 || before!==f.host.innerHTML) throw Error('Invalid touch configuration changed pending selection');
    });
    verify(await mobile.getByRole('button',{name:'Cancel placement',exact:true}).isVisible(),'Common fixture: invalid options removed confirmation');
    await mobile.getByRole('button',{name:'Cancel placement',exact:true}).click();
    await mobile.evaluate(() => window.banoraTouchCheck.view.update({readOnly:true,touch:{mode:'confirm'}}));
    await start([{x:2,y:3},{x:3,y:5}]);await touch('touchEnd');
    verify(await board.locator('[data-preview="touch"]').count()===0 && await board.locator('[data-stone]').count()===1,'Read-only touch mutated board');
    await mobile.evaluate(() => {const f=window.banoraTouchCheck;f.view.update({readOnly:false,touch:{mode:'confirm'},onPoint:point => f.hits.push(point)});f.before=f.controller.getState();});
    await start([{x:2,y:3}]);verify(await mobile.evaluate(() => window.banoraTouchCheck.hits.length===0),'Host callback fired while aiming');await touch('touchEnd');
    verify(await mobile.evaluate(() => window.banoraTouchCheck.hits.length===0),'Host callback fired before confirmation');
    await mobile.getByRole('button',{name:'Confirm placement at C6',exact:true}).click();
    verify(await unchanged() && await mobile.evaluate(() => window.banoraTouchCheck.hits.length===1 && window.banoraTouchCheck.hits[0].x===2 && window.banoraTouchCheck.hits[0].y===3),'Host callback did not receive only final logical target');
    await mobile.evaluate(() => window.banoraTouchCheck.view.update({onPoint:undefined}));
    await start([{x:2,y:3}]);await touch('touchEnd');
    await mobile.screenshot({path:'output/playwright/touch-confirm.png',fullPage:true});
    await mobile.evaluate(() => {const f=window.banoraTouchCheck,portals=document.querySelectorAll('[data-touch-lens]').length;f.view.dispose();if (f.controller.getState()!==f.before || f.host.children.length || document.querySelectorAll('[data-touch-lens]').length!==portals-1) throw Error('Touch disposal leaked DOM or edited/destroyed external controller');f.controller.dispose();f.host.remove();delete window.banoraTouchCheck;});
    await mobile.goto(`${origin}/studio/`);board=mobile.locator('#board svg[role="application"]');await board.waitFor();
    await start([{x:4,y:4},{x:6,y:5}]);
    verify(await mobile.locator('#move').innerText()==='Move 0','Studio touch edited during aiming');
    await mobile.screenshot({path:'output/playwright/studio-touch-lens.png'});
    await touch('touchEnd');
    verify(await board.locator('[data-stone="6,5"]').count()===1,'Studio release aiming did not place');
    await mobile.locator('#undo').click();
    await mobile.locator('#touch-mode').selectOption('confirm');await mobile.locator('#rotation').selectOption('90');await mobile.locator('#flip-x').check();
    await start([{x:3,y:4},{x:4,y:5}]);await touch('touchEnd');
    verify(await mobile.locator('#dirty').innerText()==='No changes','Studio pending confirmation marked record dirty');
    verify(await mobile.getByRole('button',{name:'Cancel placement',exact:true}).isVisible(),'Studio: confirmation missing before screenshot');
    await mobile.screenshot({path:'output/playwright/studio-touch-confirm.png'});
    await mobile.getByRole('button',{name:'Cancel placement',exact:true}).click();
    await start([{x:3,y:4},{x:4,y:5}]);await touch('touchEnd');
    await mobile.getByRole('button',{name:'Confirm placement at E4',exact:true}).click();
    verify(await board.locator('[data-stone="4,5"]').count()===1,'Studio transformed confirmation failed');await mobile.locator('#undo').click();
    await start([{x:3,y:4}]);await mobile.locator('#touch-mode').selectOption('direct');await touch('touchEnd');
    verify(await mobile.locator('#dirty').innerText()==='No changes','Studio tool update saved cancelled touch');

    for (const framework of ['react','vue','svelte']) {
      await mobile.goto(`${origin}/${framework}/`);board=mobile.locator('#board-host svg[role="application"]');await board.waitFor();
      await start([{x:3,y:3},{x:5,y:5}]);
      verify((await mobile.locator('#state').innerText()).includes('clean'),`${framework}: aiming edited record`);
      await touch('touchEnd');verify(await board.locator('[data-stone="5,5"]').count()===1,`${framework}: touch release placement missing`);
      await mobile.locator('#undo-edit').click();await mobile.locator('#touch-confirm').click();await mobile.locator('#rotate').click();await mobile.locator('#reflect').click();
      await start([{x:2,y:2},{x:3,y:3}]);await touch('touchEnd');
      const panel=mobile.locator('#board-host [data-touch-confirm]');
      verify(await panel.isVisible() && (await mobile.locator('#state').innerText()).includes('clean'),`${framework}: confirm props did not update`);
      await mobile.locator('#magnify').click();verify(!await panel.isVisible(),`${framework}: option update retained stale confirmation`);
      await start([{x:2,y:2},{x:3,y:3}]);
      verify(await mobile.locator('[data-touch-lens]:visible').count()===0,`${framework}: magnifier flag update missing`);
      await touch('touchEnd');await panel.getByRole('button',{name:'Confirm placement at D6',exact:true}).click();
      verify(await board.locator('[data-stone="3,3"]').count()===1,`${framework}: confirmation lost logical target`);await mobile.locator('#undo-edit').click();
      await start([{x:2,y:2},{x:4,y:3}]);await mobile.locator('#readonly').click();await touch('touchEnd');
      verify((await mobile.locator('#state').innerText()).includes('clean') && await board.locator('[data-preview="touch"]').count()===0,`${framework}: read-only update saved pending touch`);
      await start([{x:2,y:2},{x:3,y:3}]);await touch('touchEnd');
      verify((await mobile.locator('#state').innerText()).includes('clean'),`${framework}: read-only touch mutated record`);await mobile.locator('#readonly').click();
      board=mobile.locator('#viewer-host svg[role="application"]');
      await start([{x:2,y:2},{x:4,y:3}]);await touch('touchEnd');
      await mobile.locator('#viewer-host [data-touch-confirm]').getByRole('button',{name:'Confirm placement at E6',exact:true}).click();
      verify(await mobile.locator('#board-host [data-stone="4,3"]').count()===1,`${framework}: nested viewer touch did not share controller`);await mobile.locator('#undo-edit').click();
      board=mobile.locator('#board-host svg[role="application"]');
      await start([{x:2,y:2}]);await touch('touchEnd');await mobile.locator('#toggle').click();
      verify(await mobile.locator('[data-touch-lens],[data-touch-confirm]').count()===0,`${framework}: unmount leaked touch UI`);
      verify((await mobile.locator('#state').innerText()).includes('clean'),`${framework}: unmount committed confirmation`);await mobile.locator('#toggle').click();await board.waitFor();
      await start([{x:2,y:2}]);await touch('touchEnd');await mobile.locator('#swap').click();
      verify(!await mobile.locator('#board-host [data-touch-confirm]').isVisible() && (await mobile.locator('#state').innerText()).includes('13 × 13'),`${framework}: controller switch retained stale confirmation`);
      await mobile.locator('#swap').click();
      verify((await mobile.locator('#state').innerText()).includes('clean'),`${framework}: switching back lost clean record`);
      await mobile.screenshot({path:`output/playwright/${framework}-touch.png`,fullPage:true});
    }
    await cdp.detach();verify(errors.length===0,`Touch errors: ${errors.join('; ')}`);
    return 'Magnified real touch drag, eight cropped transforms, confirmation, callbacks, cancellation, keyboard and disposal passed';
  } finally {await context.close();}
}

// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async page => {
  const origin=new URL(page.url()).origin;await page.goto(`${origin}/studio/`);await page.emulateMedia({reducedMotion:'no-preference'});
  const result=await page.evaluate(async () => {
    const sdk=await import('/sdk/index.js'),verify=(value,message) => {if (!value) throw Error(message);};
    const host=document.createElement('div');host.id='animation-fixture';host.style.cssText='width:480px;margin:30px auto;';document.body.append(host);
    const controller=new sdk.RecordController({sgf:'(;SZ[5:9];B[bc];W[de];B[ei])'});
    const view=sdk.mountBoard(host,{controller,placementAnimation:{durationMs:1000}}),svg=host.querySelector('svg');
    const effects=() => svg.getAnimations({subtree:true});
    verify(effects().length===0,'Initial rendering animated');controller.next();
    verify(effects().length===1 && svg.querySelector('[data-placement-animation]').dataset.stone==='1,2','Single step did not animate exactly the new stone');
    const effect=effects()[0];effect.pause();effect.currentTime=0;
    const stone=svg.querySelector('[data-stone="1,2"]'),computed=getComputedStyle(stone),box=stone.getBoundingClientRect();
    verify(computed.transform!=='none' && computed.transformBox==='fill-box' && Number(computed.opacity)===1,'Motion transforms/origin/opacity failed');
    const center=svg.createSVGPoint();center.x=Number(stone.getAttribute('cx'));center.y=Number(stone.getAttribute('cy'));
    const shown=center.matrixTransform(svg.getScreenCTM());
    verify(Math.abs((box.x+box.width/2)-shown.x)<1 && Math.abs((box.y+box.height/2)-shown.y)<12,'Stone animated around the board instead of its own center');
    const snapshot=controller.getState(),xml=new DOMParser().parseFromString(view.exportSvg({width:480}),'image/svg+xml');
    verify(!xml.querySelector('[data-placement-animation],animate') && !xml.querySelector('[data-stone]').hasAttribute('transform'),'SVG retained transient motion');
    const image=await createImageBitmap(await view.exportPng({width:480})),canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
    const pixels=canvas.getContext('2d');pixels.drawImage(image,0,0);image.close();
    const logical=svg.viewBox.baseVal;
    const pixel=[...pixels.getImageData(Math.floor((2.25+0.35-logical.x)/logical.width*canvas.width),Math.floor((3.25-logical.y)/logical.height*canvas.height),1,1).data];
    verify(pixel.join(',')==='32,39,42,255','PNG exported an intermediate scaled stone: '+pixel);
    verify(controller.getState()===snapshot && effects().length===1,'Export changed record or cancelled live motion');
    effect.play();const prior=Number(effect.currentTime);svg.dispatchEvent(new Event('focus'));controller.setComment('during motion');
    verify(effects().length===1 && Number(effects()[0].currentTime)>=prior,'Transient/annotation redraw restarted or lost motion');
    const html=svg.outerHTML;
    try {view.update({placementAnimation:{durationMs:1001},theme:'flat'});throw Error('Invalid duration accepted');} catch (error) {verify(error.name==='RangeError','Wrong duration rejection');}
    verify(svg.outerHTML===html && effects().length===1,'Failed duration update changed the drawing');
    view.update({placementAnimation:{durationMs:1000}});verify(effects().length===1,'Equivalent option update cancelled motion');
    view.update({transform:{rotation:90}});verify(effects().length===0,'Transform update retained old motion');
    controller.next();verify(effects().length===1,'Next playback step did not animate');controller.previous();verify(effects().length===0,'Backward navigation retained motion');
    controller.loadSgf('(;SZ[5:9];B[bc];W[de];B[ei])',{discardChanges:true,locator:{gameIndex:0,path:[0,0,0]}});verify(effects().length===0,'Imported target animated');
    controller.goTo(controller.getState().path[0]);controller.goTo(controller.getState().node.children[0].children[0].id);verify(effects().length===0,'Multi-step jump animated');
    controller.play(null);verify(effects().length===0,'Pass animated');controller.setSetup([{x:0,y:1,color:'black'}]);verify(effects().length===0,'Setup animated');
    controller.loadSgf('(;SZ[5:9])',{discardChanges:true});controller.play({x:2,y:3});verify(effects().length===1,'New legal move did not animate');
    controller.undo();verify(effects().length===0,'Undo retained abandoned motion');controller.redo();verify(effects().length===1,'Single placement Redo did not animate');
    const redone=controller.getState();view.update({readOnly:true});verify(effects().length===0 && controller.getState()===redone,'Read-only update retained motion or changed record');
    view.update({placementAnimation:false});controller.play({x:3,y:4});verify(effects().length===0,'Disabled motion animated');
    view.update({readOnly:false,placementAnimation:{durationMs:1000}});controller.play({x:4,y:5});verify(effects().length===1,'Motion did not re-enable');
    const beforeDispose=controller.getState();view.dispose();verify(effects().length===0 && !host.children.length && controller.getState()===beforeDispose,'Disposal leaked effects or disposed borrowed controller');controller.dispose();host.remove();
    const ready=document.createElement('div');ready.id='animation-motion-fixture';ready.style.width='400px';document.body.append(ready);
    const model=new sdk.RecordController({size:9}),motion=sdk.mountBoard(ready,{controller:model,placementAnimation:{durationMs:1000}});
    model.play({x:3,y:3});window.__animationFixture={ready,model,motion};
    return 'banora-animation-sdk-complete';
  });
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(() => !document.querySelector('#animation-motion-fixture svg').getAnimations({subtree:true}).length);
  await page.evaluate(() => {
    const {model,ready}=window.__animationFixture;model.play({x:4,y:4});
    if (ready.querySelector('svg').getAnimations({subtree:true}).length) throw Error('Reduced motion ignored');
  });
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(() => {const {model,ready}=window.__animationFixture;model.play({x:5,y:5});if (ready.querySelector('svg').getAnimations({subtree:true}).length!==1) throw Error('Motion did not recover after preference changed');});
  await page.waitForFunction(() => !document.querySelector('#animation-motion-fixture svg').getAnimations({subtree:true}).length);
  await page.evaluate(() => {
    const {model,motion,ready}=window.__animationFixture;
    const animate=Element.prototype.animate;try {Element.prototype.animate=undefined;model.play({x:6,y:6});if (ready.querySelectorAll('[data-stone]').length!==4) throw Error('Missing API blocked logical rendering');} finally {Element.prototype.animate=animate;}
    motion.dispose();model.dispose();ready.remove();delete window.__animationFixture;
  });
  return result;
}

async page => {
  const origin=new URL(page.url()).origin;
  await page.goto(`${origin}/studio/`);
  const result=await page.evaluate(async () => {
    const sdk=await import('/sdk/index.js');
    const host=document.createElement('div');host.id='comparison-fixture';host.style.cssText='width:100%;max-width:960px;margin:30px auto;padding:16px;';
    const sentinel=document.createElement('p');sentinel.textContent='Host content';host.append(sentinel);document.body.append(host);
    const controller=new sdk.RecordController({sgf:'(;SZ[5:9]AB[bc][de]XX[keep](;AW[bc]AE[de]AB[ei]C[Right note]LB[bc:R])(;AW[bc]AE[de]AB[ei]C[Same stones]))(;SZ[9])'});
    const initial=controller.getState(),root=initial.node,left=root.id,right=root.children[0].id,alternate=root.children[1].id;
    const view=sdk.mountComparison(host,{controller,left,right});
    const region=host.querySelector('[role="region"]'),a=region.querySelector('[data-position="left"] svg'),b=region.querySelector('[data-position="right"] svg');
    const verify=(condition,message) => {if (!condition) throw Error(message);};
    const summary=() => region.querySelector('[data-result]').textContent;
    verify(summary().startsWith('3 changed intersections from left to right: 1 added, 1 removed, 1 color changed'),'Comparison summary failed');
    verify(b.querySelectorAll('[data-difference]').length===3 && b.querySelector('[data-point="4,8"]').dataset.difference==='added','Addition highlight missing');
    verify(b.querySelector('[data-point="3,4"]').dataset.difference==='removed' && b.querySelector('[data-point="1,2"]').dataset.difference==='replaced','Removal/replacement highlights failed');
    verify(b.querySelector('[data-marker="1,2"]').textContent==='R' && region.querySelector('[data-notes="right"]').textContent==='Right note','Pinned node lost annotations/comments');
    a.focus();for (const key of ['Enter','PageDown','PageUp']) a.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));
    const screen=a.createSVGPoint();screen.x=2.25;screen.y=3.25;const point=screen.matrixTransform(a.getScreenCTM());
    a.dispatchEvent(new PointerEvent('pointerup',{clientX:point.x,clientY:point.y,button:0}));
    verify(controller.getState()===initial,'Pinned board input navigated/edited the controller');
    const xml=new DOMParser().parseFromString(view.exportSvg('right',{width:520}),'image/svg+xml');
    verify(!xml.querySelector('parsererror') && xml.querySelectorAll('[data-difference]').length===3 && !xml.querySelector('[data-cursor],[data-preview]'),'Comparison SVG failed');
    const bitmap=await createImageBitmap(await view.exportPng('right',{width:520}));
    const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
    const context=canvas.getContext('2d');context.drawImage(bitmap,0,0);bitmap.close();
    const pixel=context.getImageData(420,701,1,1).data;
    verify(pixel[0]===15 && pixel[1]===118 && pixel[2]===110 && pixel[3]===255,'Comparison PNG lost added-stone highlight: '+[...pixel]);
    for (const rotation of [0,90,180,270]) for (const flipX of [false,true]) {
      view.update({board:{transform:{rotation,flipX},crop:{x:1,y:2,width:4,height:7}}});
      const highlight=b.querySelector('[data-point="4,8"]'),shown=sdk.toDisplayPoint({x:4,y:8},{width:5,height:9},{rotation,flipX});
      verify(Math.abs(Number(highlight.getAttribute('x'))-(shown.x+1.25-0.49))<0.0001 && Math.abs(Number(highlight.getAttribute('y'))-(shown.y+1.25-0.49))<0.0001,'Transformed difference coordinates failed');
      verify(controller.getState()===initial,'Comparison configuration edited the main record');
    }
    const before=region.innerHTML;
    for (const config of [{right:'absent'},{board:{transform:{rotation:45}}},{board:{crop:{x:4,y:8,width:2,height:2}}}]) {
      let rejected=false;try {view.update(config);} catch {rejected=true;}
      verify(rejected && region.innerHTML===before && controller.getState()===initial,'Invalid comparison update was not atomic');
    }
    view.update({left:right,right:alternate});verify(summary().startsWith('0 changed intersections'),'Comments/labels counted as stone differences');
    view.update({left,right,board:{crop:null,transform:undefined}});
    controller.removeBranch(right);
    verify(b.dataset.nodeStatus==='unavailable' && summary().includes('unavailable'),'Removed comparison node fell back to the cursor');
    let unavailableExport=false;try {view.exportSvg('right');} catch {unavailableExport=true;}
    verify(unavailableExport,'Unavailable pinned node exported the wrong board');
    controller.undo();verify(b.dataset.nodeStatus==='ready' && summary().startsWith('3 changed'),'Undo did not restore pinned branch');
    view.update({left:right,right:alternate});controller.removeBranch(right);controller.removeBranch(alternate);
    view.update({left});verify(a.dataset.nodeStatus==='ready' && b.dataset.nodeStatus==='unavailable','Recovering one missing comparison side failed');
    view.update({right:left});verify(summary().startsWith('0 changed'),'Recovering both comparison sides failed');
    controller.undo();controller.undo();view.update({left,right});
    const other=initial.record.games[1].id;view.update({right:other});
    verify(summary().startsWith('Different board dimensions') && b.dataset.comparisonStatus==='different-size' && !b.querySelector('[data-difference]'),'Mismatched board sizes were silently compared');
    view.update({right});
    const pinnedHost=document.createElement('div');pinnedHost.style.width='320px';host.append(pinnedHost);
    const pinned=sdk.mountBoard(pinnedHost,{controller,nodeId:right,compareTo:left});
    const pinnedSvg=pinnedHost.querySelector('svg');
    controller.loadSgf('(;SZ[9]GN[Replacement];B[hh])',{discardChanges:true});
    verify(summary().startsWith('0 changed') && a.dataset.nodeId===controller.getState().node.id && b.dataset.nodeId===controller.getState().node.id,'Comparison did not reset recycled IDs on import');
    verify(pinnedSvg.dataset.nodeStatus==='unavailable','Pinned board silently rebound a recycled ID');
    pinned.update({nodeId:right,compareTo:left,theme:'flat'});verify(pinnedSvg.dataset.nodeStatus==='unavailable','Unrelated option update rebound a stale pin');
    pinned.update({referenceGeneration:controller.getState().recordGeneration});
    verify(pinnedSvg.dataset.nodeStatus==='ready' && pinnedSvg.querySelector('[data-stone="7,7"]'),'Explicit generation rebinding failed');
    controller.loadSgf('(;SZ[9]'+Array.from({length:700},(_,i) => `;${i%2 ? 'W' : 'B'}[aa]`).join('')+')',{discardChanges:true});
    let leaf=controller.getState().node;while (leaf.children.length) leaf=leaf.children[0];
    const cursor=controller.getState();view.update({left:leaf.id});
    verify(region.querySelector('[aria-label="Left position"]').value===leaf.id && region.querySelector('[aria-label="Left position"]').options.length<=502 && region.querySelector('[data-limit]').textContent.includes('500'),'Large-record selection was truncated or unbounded');
    verify(controller.getState()===cursor,'Inspecting a deep comparison node moved the cursor');
    const portals=document.querySelectorAll('[data-touch-lens]').length;
    pinned.dispose();view.dispose();view.dispose();
    verify(document.querySelectorAll('[data-touch-lens]').length===portals-3 && host.children.length===2 && host.contains(sentinel) && controller.getState()===cursor,'Comparison disposal leaked resources or destroyed host content/controller');
    pinnedHost.remove();controller.dispose();host.remove();
    return 'Pinned inspection, changed-stone highlights, crop/transforms, SVG/PNG, deletion/Undo, recycled IDs, bounded selectors and disposal passed';
  });
  return result;
}

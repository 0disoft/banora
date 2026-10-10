async page => {
  const origin = new URL(page.url()).origin;
  await page.goto(`${origin}/studio/`);
  await page.locator('#file').setInputFiles({name:'rectangular.sgf', mimeType:'application/x-go-sgf', buffer:Buffer.from('(;SZ[5:9]GN[Rectangular view]AB[bc])')});
  await page.waitForFunction(() => document.querySelector('#game-name').textContent === 'Rectangular view');
  await page.locator('#rotation').selectOption('90');
  await page.locator('#flip-x').check();
  if (await page.locator('#dirty').innerText() !== 'No changes') throw Error('Studio presentation changed dirty state');
  const board = page.locator('#board svg');
  const target = await board.evaluate(svg => {
    const point = svg.createSVGPoint(); point.x = 4.25; point.y = 2.25;
    const screen = point.matrixTransform(svg.getScreenCTM());
    return {x:screen.x,y:screen.y};
  });
  await page.mouse.click(target.x,target.y);
  if (await page.locator('[data-stone="3,5"]').count() !== 1) throw Error('Studio transformed mouse placed at the wrong logical point');
  await page.locator('#undo').click();
  await board.focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  if (await page.locator('[data-stone="3,4"]').count() !== 1) throw Error('Studio transformed keyboard placement failed');
  await page.locator('#undo').click();
  if (await page.locator('#dirty').innerText() !== 'No changes') throw Error('Studio transformed Undo did not return to baseline');
  const result = await page.evaluate(async () => {
    const sdk = await import('/sdk/index.js');
    const host = document.createElement('div'); host.style.width = '520px'; document.body.append(host);
    const hits = [];
    const controller = new sdk.RecordController({sgf:'(;SZ[5:9]AB[bc]LB[bc:Upright]AR[bc:de])'});
    const view = sdk.mountBoard(host, {controller, onPoint:point => hits.push(point)});
    const baseline = controller.getState();
    for (const rotation of [0,90,180,270]) for (const flipX of [false,true]) {
      view.update({transform:{rotation,flipX}, crop:{x:1,y:2,width:3,height:4}});
      const svg = host.querySelector('svg');
      const stone = svg.querySelector('[data-stone="1,2"]');
      const shown = sdk.toDisplayPoint({x:1,y:2}, baseline.position, {rotation,flipX});
      if (Number(stone.getAttribute('cx')) !== shown.x + 1.25 || Number(stone.getAttribute('cy')) !== shown.y + 1.25) throw Error('Transformed stone location failed');
      if (svg.querySelector('text[data-marker]').textContent !== 'Upright' || svg.querySelector('text[data-marker]').hasAttribute('transform')) throw Error('Label orientation failed');
      const point = svg.createSVGPoint(); point.x = shown.x + 1.25; point.y = shown.y + 1.25;
      const screen = point.matrixTransform(svg.getScreenCTM());
      svg.dispatchEvent(new PointerEvent('pointerup',{clientX:screen.x,clientY:screen.y,button:0}));
      if (hits.at(-1).x !== 1 || hits.at(-1).y !== 2) throw Error('Transformed pointer did not emit logical coordinates');
      const size = sdk.displayCrop({x:1,y:2,width:3,height:4},baseline.position,{rotation,flipX});
      const box = svg.viewBox.baseVal;
      if (box.x !== size.x || box.y !== size.y || box.width !== size.width + 1.5 || box.height !== size.height + 1.5) throw Error('Transformed rectangular crop failed');
      const before = svg.outerHTML;
      let rejected = false;
      try {view.update({transform:{rotation:45}});} catch {rejected=true;}
      if (!rejected || svg.outerHTML !== before || controller.getState() !== baseline) throw Error('Invalid transform mutated presentation or record');
    }
    view.update({transform:{rotation:90}, crop:null});
    const svg = host.querySelector('svg');
    // The preceding pointer selected logical (1,2). Screen-down is logical-right.
    svg.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));
    svg.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
    if (hits.at(-1).x !== 2 || hits.at(-1).y !== 2) throw Error('Keyboard navigation did not follow screen axes');
    view.update({transform:undefined});
    if (svg.dataset.rotation !== '0' || svg.dataset.flipX !== 'false') throw Error('Clearing transform did not restore defaults');
    if (controller.getState() !== baseline) throw Error('Presentation changed semantic state');
    view.dispose(); controller.dispose(); host.remove();
    return 'Eight rectangular/cropped transforms, logical pointer input, screen keyboard axes, label orientation and atomic configuration passed';
  });
  return result;
}

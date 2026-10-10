// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async page => {
  await page.locator('#comment').fill('Record edits remain unsaved after image export');
  for (const format of ['svg','png']) {
    const promise = page.waitForEvent('download');
    await page.locator(`#${format}-export`).click();
    const download = await promise;
    await download.saveAs(`output/playwright/studio-diagram.${format}`);
    if (await page.locator('#dirty').innerText() !== 'Unsaved changes') throw Error('Image export incorrectly acknowledged SGF baseline');
  }
  await page.locator('#undo').click();
  await page.evaluate(async () => {
    const sdk = await import('/sdk/index.js');
    const host = document.createElement('div'); host.style.width='520px'; host.style.setProperty('--banora-black','#123456'); document.body.append(host);
    const controller = new sdk.RecordController({sgf:'(;SZ[5:9]AB[bc][de]LB[bc:A<&B][aa:Bad\u0000\ud800💠]AR[bc:de])'});
    const view = sdk.mountBoard(host,{controller, transform:{rotation:90,flipX:true}});
    const baseline = controller.getState();
    host.querySelector('svg').focus();
    const text = view.exportSvg({width:420,title:'Caption <&"'});
    const parsed = new DOMParser().parseFromString(text,'image/svg+xml');
    if (parsed.querySelector('parsererror') || parsed.documentElement.getAttribute('width') !== '420' || parsed.documentElement.getAttribute('height') !== '260') throw Error('Standalone SVG dimensions/XML failed');
    if (parsed.querySelector('[data-cursor],[data-preview],script,foreignObject') || text.includes('var(')) throw Error('Diagram retained interaction/unresolved styles');
    if (parsed.querySelector('title').textContent !== 'Caption <&"' || parsed.querySelector('[data-marker]').textContent !== 'A<&B') throw Error('SVG text escaping failed');
    const oddText = new DOMParser().parseFromString(view.exportSvg({title:'Bad\u0000\ud800💠'}),'image/svg+xml');
    if (oddText.querySelector('parsererror') || oddText.querySelector('title').textContent !== 'Bad��💠' || oddText.querySelector('[data-marker="0,0"]').textContent !== 'Bad��💠') throw Error('XML-invalid text or paired Unicode handling failed');
    if (controller.getState() !== baseline || !baseline.markers.some(marker => marker.label?.includes('\u0000'))) throw Error('Diagram text normalization edited SGF content');
    const pendingSnapshot = view.exportPng({width:420});
    controller.setSetup([{x:3,y:4,color:'white'}]);
    const blob = await pendingSnapshot;
    if (blob.type !== 'image/png') throw Error('PNG MIME type failed');
    const bitmap = await createImageBitmap(blob);
    if (bitmap.width !== 420 || bitmap.height !== 260) throw Error('PNG encoded dimensions failed');
    const canvas = document.createElement('canvas'); canvas.width=420; canvas.height=260;
    const context = canvas.getContext('2d'); context.drawImage(bitmap,0,0); bitmap.close();
    // Sample inside the stone, above the arrowhead drawn at its center.
    const pixel = context.getImageData(210,78,1,1).data;
    if (pixel[0] !== 18 || pixel[1] !== 52 || pixel[2] !== 86 || pixel[3] !== 255) throw Error('PNG lost inherited stone color or transform: '+[...pixel]);
    controller.undo();
    if (controller.getState().dirty || controller.getState().record !== baseline.record) throw Error('Pending diagram interfered with later record edits');
    for (const options of [{width:0},{width:8193},{width:8192,height:8192}]) {
      let rejected = false; try {view.exportSvg(options);} catch {rejected=true;}
      if (!rejected) throw Error('Unbounded diagram size accepted');
    }
    const encode = HTMLCanvasElement.prototype.toBlob;
    let encodingRejected = false;
    try {
      HTMLCanvasElement.prototype.toBlob = callback => callback(null);
      try {await view.exportPng({width:128});} catch {encodingRejected=true;}
    } finally {HTMLCanvasElement.prototype.toBlob=encode;}
    if (!encodingRejected) throw Error('PNG encoding failure silently succeeded');
    const beforeCancellation = controller.getState();
    const pending = view.exportPng({width:128}); view.dispose();
    let cancelled=false; try {await pending;} catch (error) {cancelled=error.name === 'AbortError';}
    if (!cancelled || controller.getState() !== beforeCancellation) throw Error('Disposed PNG export or record ownership failed');
    controller.dispose(); host.remove();
    return 'Standalone SVG/PNG, inherited colors, transforms, text escaping, size limits, encoding failure and disposal cancellation passed';
  });
  return 'banora-diagrams-complete';
}

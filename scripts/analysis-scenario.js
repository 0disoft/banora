// oxlint-disable-next-line eslint/no-unused-expressions -- Playwright CLI evaluates this callback expression.
async page => {
  const origin=new URL(page.url()).origin,errors=[],external=[];
  const onError=error => errors.push(String(error)),onRequest=request => {if (new URL(request.url()).origin!==origin) external.push(request.url());};
  page.on('pageerror',onError);page.on('request',onRequest);
  const verify=(value,message) => {if (!value) throw Error(message);};
  const host=page.locator('#analysis-host'),board=host.locator('[data-analysis-board] svg'),overlay=host.locator('[data-analysis-overlay]');
  async function point(target,x,y,touch=false,source=false) {
    const svg=target.locator(source ? '#source-board svg' : '#analysis-host [data-analysis-board] svg');await svg.scrollIntoViewIfNeeded();
    const screen=await svg.evaluate((svg,{x,y}) => {const point=svg.createSVGPoint();point.x=x+1.25;point.y=y+1.25;const screen=point.matrixTransform(svg.getScreenCTM());return {x:screen.x,y:screen.y};},{x,y});
    if (touch) await target.touchscreen.tap(screen.x,screen.y);else await target.mouse.click(screen.x,screen.y);
  }
  async function manualReply(query,fields={}) {
    const reply={id:query.id,turnNumber:query.moves.length,isDuringSearch:false,rootInfo:{currentPlayer:query.initialPlayer,winrate:0.35,scoreLead:-2.5,visits:100},
      moveInfos:[{move:'C4',order:0,winrate:0.3,scoreLead:-3.5,visits:90,pv:['C4','B3','D4']}],ownership:Array(query.boardXSize*query.boardYSize).fill(-0.7),...fields};
    await page.locator('#incoming').fill(JSON.stringify(reply));await page.locator('#receive').click();
  }
  async function save(button,path) {const event=page.waitForEvent('download');await page.locator(button).click();await (await event).saveAs(`output/playwright/${path}`);}
  let mobileContext;
  try {
    await page.goto(`${origin}/analysis/`);await board.waitFor();
    verify(await page.locator('#outgoing').inputValue()==='' && await host.locator('[data-analysis-candidate]').count()===0,'Analysis submitted on mount or showed fabricated ready data');
    await save('#sgf','analysis-before.sgf');
    await host.getByRole('button',{name:'Analyze position',exact:true}).click();await host.locator('p[data-analysis-status]').filter({hasText:'Analysis ready.'}).waitFor();
    verify((await host.locator('[data-analysis-summary]').innerText()).includes('Black win 72.0%') && (await host.locator('[data-analysis-summary]').innerText()).includes('+3.5'),'Root metrics not displayed in Black perspective');
    verify(await overlay.locator('[data-analysis-candidate]').count()===2 && await host.locator('tbody tr').count()===3,'Candidate rank/pass table mismatch');
    verify(await overlay.locator('[data-analysis-ownership="0,0"]').getAttribute('data-ownership-value')==='-0.65','Ownership root sign/coordinate lost');
    await board.focus();for (let i=0;i<4;i++) await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
    verify((await host.locator('[data-analysis-point]').innerText()).includes('E5 ownership: 0.800'),'Keyboard numeric ownership inspection failed');
    verify(await overlay.locator('[data-analysis-candidate]').count()===2 && await board.evaluate(svg => document.activeElement===svg),'Focus redraw erased independent overlays or focus');
    await host.getByRole('button',{name:'Preview B3 principal variation',exact:true}).click();
    verify(await host.locator('.banora-analysis').getAttribute('data-analysis-pv-step')==='1' && await board.locator('[data-stone="1,1"]').count()===0,'PV capture did not use core transition');
    verify(await page.locator('#source-board [data-stone="1,1"]').count()===1 && await overlay.locator('[data-analysis-ownership]').count()===0,'PV edited source or transferred root ownership');
    verify(await page.getByRole('button',{name:'Preview B3 principal variation',exact:true}).evaluate(button => document.activeElement===button),'Candidate table redraw lost button focus');
    await host.getByRole('button',{name:'Next PV move',exact:true}).click();await host.getByRole('button',{name:'Next PV move',exact:true}).click();
    verify(await board.locator('[data-stone]').count()===6 && await host.getByRole('button',{name:'Next PV move',exact:true}).isDisabled(),'PV complete position/step bounds failed');
    await save('#svg','analysis.svg');
    await host.getByRole('button',{name:'Previous PV move',exact:true}).click();verify(await board.locator('[data-stone]').count()===5,'PV previous did not restore earlier diagram');
    await host.getByRole('button',{name:'Return to analyzed position',exact:true}).click();
    await host.getByRole('button',{name:'Preview Pass principal variation',exact:true}).click();verify((await host.locator('[data-analysis-pv]').innerText()).includes('1. B Pass') && await board.locator('[data-stone]').count()===4,'Pass preview changed stones or lost pass text');
    await host.getByRole('button',{name:'Return to analyzed position',exact:true}).click();
    const ownership=host.getByRole('checkbox',{name:'Show ownership prediction'});await ownership.uncheck();verify(await overlay.locator('[data-analysis-ownership]').count()===0,'Ownership toggle ignored');await ownership.check();
    await page.locator('#theme').selectOption('flat');verify(await host.locator('.banora-analysis').getAttribute('data-analysis-status')==='ready','Theme invalidated result');
    await save('#sgf','analysis-after.sgf');
    await page.locator('#position').selectOption('1');verify(await page.locator('#outgoing').inputValue()==='' && await board.getAttribute('data-board-height')==='7','Position switch submitted or retained stale dimensions');
    await host.getByRole('button',{name:'Analyze position',exact:true}).click();await host.locator('p[data-analysis-status]').filter({hasText:'Analysis ready.'}).waitFor();
    const rows=await host.locator('tbody tr').allTextContents();verify(rows[0].includes('-3.5') && rows[1].includes('2.0') && rows[2].includes('4.0'),'White candidate loss/perspective incorrect');
    await page.locator('#rotation').selectOption('90');
    const geometry=await overlay.locator('[data-analysis-candidate="2,3"] circle').evaluate(circle => [Number(circle.getAttribute('cx')),Number(circle.getAttribute('cy'))]);
    verify(geometry[0]===4.25 && geometry[1]===3.25,'Rectangular rotation did not align candidate overlay');
    await page.locator('#rotation').selectOption('0');
    await page.locator('#provider').selectOption('manual');verify(await host.locator('.banora-analysis').getAttribute('data-analysis-status')==='idle' && await overlay.locator('[data-analysis-candidate]').count()===0,'Provider swap retained predictions');
    await host.getByRole('button',{name:'Analyze position',exact:true}).click();let query=JSON.parse(await page.locator('#outgoing').inputValue());
    await point(page,4,6,false,true);verify(await host.locator('.banora-analysis').getAttribute('data-analysis-status')==='idle','Source move did not invalidate loading request');
    await manualReply(query);verify(await host.locator('.banora-analysis').getAttribute('data-analysis-status')==='idle' && await overlay.locator('[data-analysis-candidate]').count()===0,'Late manual response annotated another position');
    await page.locator('#undo').click();await host.getByRole('button',{name:'Analyze position',exact:true}).click();query=JSON.parse(await page.locator('#outgoing').inputValue());
    await host.getByRole('button',{name:'Cancel analysis',exact:true}).click();verify(JSON.parse(await page.locator('#outgoing').inputValue()).action==='terminate','View cancellation did not submit scoped engine termination');
    await manualReply(query);verify(await host.locator('.banora-analysis').getAttribute('data-analysis-status')==='cancelled','Late cancelled response restored overlays');
    await host.getByRole('button',{name:'Analyze position',exact:true}).click();query=JSON.parse(await page.locator('#outgoing').inputValue());
    await manualReply(query,{error:'Private provider detail <img src=x>'});verify(await host.locator('.banora-analysis').getAttribute('data-analysis-status')==='error' && !(await host.innerText()).includes('Private provider'),'Engine error escaped redaction');
    await point(page,4,6,false,true);await page.locator('#undo').click();verify(await page.locator('#source-board [data-stone]').count()===2,'Provider error disabled local play/Undo');
    await host.getByRole('button',{name:'Analyze position',exact:true}).click();query=JSON.parse(await page.locator('#outgoing').inputValue());
    await page.locator('#toggle').click();verify(await host.locator('svg').count()===0,'Disposed view retained drawing');await manualReply(query);
    verify(await host.locator('svg').count()===0,'Late result annotated destroyed view');await page.locator('#toggle').click();
    verify(await host.locator('.banora-analysis').getAttribute('data-analysis-status')==='ready','Borrowed-session remount lost completed analysis');
    const oldId=await host.locator('.banora-analysis').getAttribute('data-analysis-request-id');await page.locator('#comment').fill('Comment <script> stays text');
    verify(await host.locator('.banora-analysis').getAttribute('data-analysis-status')==='ready' && await host.locator('.banora-analysis').getAttribute('data-analysis-request-id')===oldId && await host.locator('img,script').count()===0,'Metadata-only edit invalidated result or injected HTML');
    await page.evaluate(async () => {
      const {RecordController}=await import('/sdk/controller.js'),{AnalysisSession}=await import('/sdk/analysis.js'),{mountAnalysis}=await import('/sdk/analysis-view.js');
      const source=new RecordController({sgf:'(;SZ[5]XX[keep])'}),jobs=[],provider={id:'controlled',analyze(request,cancellation){return new Promise(resolve => jobs.push({request,cancellation,resolve}));}};
      const session=new AnalysisSession(source,provider,{profile:'japanese-territory'}),host=document.createElement('div');host.id='public-analysis';document.body.append(host);let callbacks=0;
      const view=mountAnalysis(host,{session,onComplete:() => callbacks++});const original=view.exportSvg(),before=source.getState();
      for (const update of [{board:{crop:{x:0,y:0,width:999,height:5}}},{request:{maxVisits:0}},{request:null},{board:null},{showOwnership:'yes'}]) {
        let rejected=false;try {view.update(update);} catch {rejected=true;}if (!rejected || view.exportSvg()!==original || source.getState()!==before) throw Error('Invalid view update was not atomic');
      }
      view.update({board:{crop:{x:1,y:1,width:3,height:3},transform:{rotation:270,flipX:true}},onComplete:() => callbacks+=10});
      host.querySelector('[data-analysis-request]').click();const request=jobs[0].request;
      jobs[0].resolve({requestId:request.id,contextKey:request.context.key,root:{visits:10,winProbabilityBlack:0.6,scoreLeadBlack:1},candidates:[
        {move:{x:2,y:2},rank:0,visits:8,winProbabilityBlack:0.7,scoreLeadBlack:2,principalVariation:[]},
        {move:{x:1,y:2},rank:1,visits:1,winProbabilityBlack:0.6,scoreLeadBlack:1,principalVariation:[]},
        {move:{x:0,y:0},rank:2,visits:1,winProbabilityBlack:0.5,scoreLeadBlack:0,principalVariation:[]}],ownership:Array(25).fill(0.7)});
      await Promise.resolve();await Promise.resolve();
      if (callbacks!==10 || host.querySelector('[data-analysis-overlay]').getAttribute('viewBox')!=='1 1 4.5 4.5') throw Error('Callback update or transformed crop failed');
      const shifted=host.querySelector('[data-analysis-candidate="1,2"] circle');
      if (shifted.getAttribute('cx')!=='3.25' || shifted.getAttribute('cy')!=='2.25' || host.querySelector('[data-analysis-overlay]').querySelectorAll('[data-analysis-ownership]').length!==9 || host.querySelector('[data-analysis-candidate="0,0"]')) throw Error('Reflection/crop did not preserve logical overlay coordinates');
      host.querySelector('[data-analysis-select]').click();if (!host.textContent.includes('Candidate only; no continuation supplied.') || source.getState()!==before) throw Error('Candidate-only preview not explicit or edited source');
      const retained=session.getState();view.dispose();if (host.children.length || session.getState()!==retained) throw Error('Borrowed view disposed session or leaked DOM');
      const remount=mountAnalysis(host,{session});remount.dispose();
      try {mountAnalysis(host,{session,board:{crop:{x:0,y:0,width:999,height:5}}});throw Error('Failed mount accepted');} catch (error) {if (!/crop/i.test(String(error))) throw error;}
      if (host.children.length || session.getState()!==retained) throw Error('Failed mount leaked DOM/ownership');
      const owned=mountAnalysis(host,{controller:source,provider,settings:{profile:'japanese-territory'}}),pending=owned.session.request();owned.dispose();
      if ((await pending).reason!=='disposed' || (await owned.session.request()).reason!=='disposed' || !source.play({x:0,y:0}).ok) throw Error('Owned disposal did not settle work/preserve source');
      let rejected=false;try {owned.exportSvg();} catch {rejected=true;}if (!rejected) throw Error('Disposed view exported a stale drawing');
      await owned.exportPng().then(() => {throw Error('Disposed view exported PNG');},() => {});
      const job=jobs.at(-1);job.resolve({requestId:job.request.id,contextKey:job.request.context.key,root:{visits:1,winProbabilityBlack:0.5,scoreLeadBlack:0},candidates:[]});await Promise.resolve();
      if (host.children.length || callbacks!==10) throw Error('Late owned result updated destroyed view');
      session.dispose();source.dispose();host.remove();
    });
    mobileContext=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
    const mobile=await mobileContext.newPage();mobile.on('pageerror',onError);mobile.on('request',onRequest);await mobile.goto(`${origin}/analysis/`);
    await mobile.getByRole('button',{name:'Analyze position',exact:true}).click();await point(mobile,1,2,true);
    verify(await mobile.locator('.banora-analysis').getAttribute('data-analysis-pv-step')==='1' && await mobile.locator('#analysis-host [data-stone="1,1"]').count()===0,'Mobile candidate selection/capture failed');
    verify(await mobile.evaluate(() => document.documentElement.scrollWidth<=window.innerWidth),'Analysis overflows mobile viewport');
    await mobile.screenshot({path:'output/playwright/analysis-mobile.png',fullPage:true});await mobile.locator('#toggle').click();verify(await mobile.locator('#analysis-host svg').count()===0,'Mobile view disposal leaked SVG');
    verify(errors.length===0 && external.length===0,`Analysis errors/remote requests: ${[...errors,...external].join('; ')}`);
    await page.screenshot({path:'output/playwright/analysis-desktop.png',fullPage:true});return 'banora-analysis-complete';
  } finally {await mobileContext?.close();page.off('pageerror',onError);page.off('request',onRequest);}
}

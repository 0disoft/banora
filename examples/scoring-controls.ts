import {RecordController,createSgfNode,mountBoard,pointToSgf,recordNodeAt,serializeSgf} from '@banora/sdk';
import type {BoardView,ControllerState,Point,Position,RecordLocator} from '@banora/sdk';
import {RULE_PROFILES,getRuleProfile} from '@banora/sdk/rules';
import type {RuleProfileId} from '@banora/sdk/rules';
import {scorePosition} from '@banora/sdk/scoring';
import type {ScoreBreakdown,ScoreSummary} from '@banora/sdk/scoring';
import './scoring-controls.css';

/** Public-package reference consumer; scoring never edits the supplied record. */
export function mountScoringControls(container:HTMLElement,source:RecordController): () => void {
  const root=document.createElement('section');root.className='scoring';
  root.innerHTML=`<button id="score-open" class="button" type="button">Score position</button>
    <section id="score-panel" class="card scoring-card" hidden><h2>Manual scoring</h2>
      <p class="small muted">Unmarked groups count as living. Mark dead or seki groups, finish dame, and agree on status before counting. B/W labels show surrounded empty points.</p>
      <div class="score-controls"><label>Counting preset <select id="score-profile"></select></label>
        <label>Komi <input id="score-komi" type="number" step="0.5" min="-1000000000" max="1000000000"/></label>
        <label>Handicap stones <input id="score-handicap" type="number" step="1" min="0"/></label>
        <label>Black adjustment <input id="score-black-adjust" type="number" step="0.5" value="0"/></label>
        <label>White adjustment <input id="score-white-adjust" type="number" step="0.5" value="0"/></label></div>
      <div class="score-controls"><label>Mark group <select id="score-mark"><option value="dead">Dead</option><option value="seki">Seki</option></select></label>
        <button id="score-reset" class="button" type="button">Clear scoring marks</button><button id="score-close" class="button" type="button">Close scoring</button></div>
      <p id="score-result" role="status"></p><p id="score-warning" class="small muted"></p><p id="score-formula" class="small muted"></p>
      <div class="score-layout"><div id="score-board"></div><table id="score-breakdown"><caption>Score components</caption><thead><tr><th>Component</th><th>Black</th><th>White</th></tr></thead><tbody></tbody></table></div>
      <p class="small muted">This counting preset does not change live move rules. Scoring marks are temporary and are not written to SGF.</p></section>`;
  container.append(root);const abort=new AbortController();
  const find=<T extends HTMLElement>(id:string) => root.querySelector<T>(`#${id}`)!;
  const preset=find<HTMLSelectElement>('score-profile'),panel=find('score-panel'),result=find('score-result'),warning=find('score-warning');
  for (const profile of Object.values(RULE_PROFILES)) {const option=document.createElement('option');option.value=profile.id;option.textContent=profile.label;preset.append(option);}
  let opened=false,disposed=false,bound:ControllerState|undefined,scoringPosition:Position|undefined,
    dead:readonly Point[]=[],seki:readonly Point[]=[],display:RecordController|undefined,view:BoardView|undefined,report:ScoreSummary|undefined;
  const number=(id:string) => find<HTMLInputElement>(id).valueAsNumber;
  function clearView() {view?.dispose();display?.dispose();view=undefined;display=undefined;}
  function derivePosition(state:ControllerState): Position {
    const path:number[]=[];let node=state.record.games[state.gameIndex]!;
    for (const id of state.path.slice(1)) {const index=node.children.findIndex(child => child.id===id);if (index<0) throw Error('Position is unavailable');path.push(index);node=node.children[index]!;}
    // Only the counting ledger is needed. Recorded moves bypass legal rejection;
    // omit the unused superko index rather than retaining a second large history.
    const model=new RecordController({sgf:serializeSgf(state.record),rules:{...getRuleProfile(preset.value as RuleProfileId).play,ko:'none'}});
    try {
      const locator:RecordLocator={gameIndex:state.gameIndex,path},target=recordNodeAt(model.getState().record,locator);
      if (!target) throw Error('Position is unavailable');return model.inspectNode(target.id)!.position;
    } finally {model.dispose();}
  }
  function displayRecord(value:ScoreSummary): string {
    const properties:Record<string,string[]>={SZ:[`${value.width}:${value.height}`]};
    const add=(key:string,point:Point,label?:string) => (properties[key] ??= []).push(pointToSgf(point)+(label ? ':'+label : ''));
    for (let index=0;index<value.originalBoard.length;index++) {
      const point={x:index%value.width,y:Math.floor(index/value.width)},stone=value.originalBoard[index],owner=value.ownership[index];
      if (stone) add(stone==='black' ? 'AB' : 'AW',point);
      else if (owner) add('LB',point,owner==='black' ? 'B' : 'W');
    }
    for (const point of value.deadStones) add('MA',point);for (const point of value.sekiStones) add('CR',point);
    return serializeSgf({games:[createSgfNode('score',properties)]});
  }
  function renderReport(value:ScoreSummary) {
    const rows:[keyof ScoreBreakdown,string][]=[['stones','Living stones'],['territory','Territory'],['captures','Captured prisoners'],
      ['deadPrisoners','Dead prisoners'],['passPrisoners','Pass prisoners'],['komi','Komi'],['handicapCompensation','Handicap bonus'],['adjustment','Adjustment'],['total','Total']];
    const body=find<HTMLTableElement>('score-breakdown').tBodies[0]!;body.replaceChildren();
    for (const [key,label] of rows) {
      const row=document.createElement('tr');row.dataset.component=key;
      const title=document.createElement('th');title.scope='row';title.textContent=label;row.append(title);
      for (const color of ['black','white'] as const) {const cell=document.createElement('td');cell.dataset.color=color;cell.textContent=String(value[color][key]);row.append(cell);}
      body.append(row);
    }
    result.textContent=`Provisional: ${value.winner==='draw' ? 'Draw' : `${value.winner==='black' ? 'Black' : 'White'} +${value.margin}`} · ${value.deadStones.length} dead stones · ${value.sekiStones.length} seki stones · ${value.neutral} neutral points`;
    warning.textContent=value.warnings.includes('white-last-pass-required') ? 'AGA requires White to make the last pass.' :
      value.warnings.length ? 'This position has not ended with two alternating passes.' : 'Pass sequence complete. Confirm the marked status before using this result.';
    find('score-formula').textContent=value.method==='area' ?
      'Area total = living stones + territory + komi + handicap bonus + adjustment. Prisoners are shown for reference.' :
      'Territory total = territory + captured/dead/pass prisoners + komi + adjustment. Living stones are shown for reference.';
  }
  function calculate() {
    if (!opened || disposed || !bound) return;
    try {
      scoringPosition ??= derivePosition(bound);
      const scored=scorePosition(scoringPosition,{profile:preset.value as RuleProfileId,komi:number('score-komi'),handicap:number('score-handicap'),
        adjustments:{black:number('score-black-adjust'),white:number('score-white-adjust')},deadStones:dead,sekiStones:seki});
      if (!scored.ok) throw Error(scored.message);
      report=scored.value;dead=report.deadStones;seki=report.sekiStones;renderReport(report);
      const sgf=displayRecord(report);
      if (!display) {display=new RecordController({sgf});view=mountBoard(find('score-board'),{controller:display,readOnly:true,onPoint:markGroup,touch:{mode:'release'}});}
      else if (!display.loadSgf(sgf,{discardChanges:true}).ok) throw Error('Could not display scoring marks');
    } catch (error) {
      report=undefined;clearView();find<HTMLTableElement>('score-breakdown').tBodies[0]!.replaceChildren();warning.textContent='';find('score-formula').textContent='';
      result.textContent=`Cannot calculate: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
  function markGroup(point:Point) {
    if (!scoringPosition || !report || !scoringPosition.board[point.y*scoringPosition.width+point.x]) return;
    const selected=scorePosition(scoringPosition,{profile:preset.value as RuleProfileId,deadStones:[point]});
    if (!selected.ok) return;
    const indices=new Set(selected.value.deadStones.map(point => point.y*scoringPosition!.width+point.x));
    const without=(points:readonly Point[]) => points.filter(point => !indices.has(point.y*scoringPosition!.width+point.x));
    const isDead=find<HTMLSelectElement>('score-mark').value==='dead',existing=isDead ? dead : seki;
    const already=existing.some(candidate => candidate.x===point.x && candidate.y===point.y);
    if (isDead) {dead=already ? without(dead) : [...dead,...selected.value.deadStones];seki=without(seki);}
    else {seki=already ? without(seki) : [...seki,...selected.value.deadStones];dead=without(dead);}
    calculate();
  }
  function bind(state:ControllerState) {
    bound=state;scoringPosition=undefined;dead=[];seki=[];
    const game=state.record.games[state.gameIndex]!;
    find<HTMLInputElement>('score-komi').value=game.properties.KM?.[0] ?? '0';
    const handicap=find<HTMLInputElement>('score-handicap');handicap.value=game.properties.HA?.[0] ?? '0';handicap.max=String(state.position.board.length);
    find<HTMLInputElement>('score-black-adjust').value='0';find<HTMLInputElement>('score-white-adjust').value='0';calculate();
  }
  find('score-open').addEventListener('click',() => {opened=true;panel.hidden=false;bind(source.getState());},{signal:abort.signal});
  find('score-close').addEventListener('click',() => {opened=false;panel.hidden=true;report=undefined;scoringPosition=undefined;dead=[];seki=[];clearView();},{signal:abort.signal});
  find('score-reset').addEventListener('click',() => {dead=[];seki=[];calculate();},{signal:abort.signal});
  preset.addEventListener('change',() => {scoringPosition=undefined;calculate();},{signal:abort.signal});
  for (const id of ['score-komi','score-handicap','score-black-adjust','score-white-adjust']) find(id).addEventListener('input',calculate,{signal:abort.signal});
  const unsubscribe=source.subscribe(state => {if (opened && (bound?.record!==state.record || bound.node.id!==state.node.id)) bind(state);});
  return () => {disposed=true;abort.abort();unsubscribe();clearView();root.remove();};
}

import {RecordController,mountBoard} from '@banora/sdk';
import type {BoardView} from '@banora/sdk';
import {AnalysisSession} from '@banora/sdk/analysis';
import {mountAnalysis} from '@banora/sdk/analysis-view';
import type {AnalysisView} from '@banora/sdk/analysis-view';
import {KataGoProvider} from '@banora/sdk/katago';
import type {KataGoQuery} from '@banora/sdk/katago';
import {analysisFixtures,illustrativeKataGoResponse} from '../fixtures/analysis.js';
const find=<T extends HTMLElement>(id:string) => document.getElementById(id) as T;
const position=find<HTMLSelectElement>('position'),mode=find<HTMLSelectElement>('provider'),theme=find<HTMLSelectElement>('theme'),rotation=find<HTMLSelectElement>('rotation');
for (const [index,fixture] of analysisFixtures.entries()) {const option=document.createElement('option');option.value=String(index);option.textContent=fixture.label;position.append(option);}
let controller:RecordController,provider:KataGoProvider,session:AnalysisSession,sourceView:BoardView,view:AnalysisView|undefined,unsubscribe:(() => void)|undefined;
function makeProvider():KataGoProvider {
  const offline=mode.value==='offline';let created:KataGoProvider;
  created=new KataGoProvider({sendLine(line) {
    find<HTMLTextAreaElement>('outgoing').value=line;
    if (!offline) {find('transport-state').textContent='Manual mode: deliver this line to your engine; paste its stdout response below.';return;}
    const message=JSON.parse(line);if (message.action) return;
    const response=illustrativeKataGoResponse(message as KataGoQuery);
    if (response) {created.receiveLine(JSON.stringify(response));find('transport-state').textContent='Authored illustration applied; no engine or remote request.';}
    else {created.receiveLine(JSON.stringify({id:message.id,error:'No authored fixture for this position.'}));find('transport-state').textContent='Offline illustrations support only the two original root positions. Return to the first record node or use Manual KataGo JSON.';}
  }},{perspective:'black',id:offline ? 'offline-protocol-illustrations' : 'manual-katago-json'});
  return created;
}
function boardOptions() {return {theme:theme.value as 'wood'|'flat',transform:{rotation:Number(rotation.value) as 0|90|180|270}};}
function mount() {view=mountAnalysis(find('analysis-host'),{session,board:boardOptions(),request:{includeOwnership:true}});find('toggle').textContent='Unmount analysis';find<HTMLButtonElement>('svg').disabled=false;}
function openPosition() {
  view?.dispose();unsubscribe?.();session?.dispose();provider?.dispose();sourceView?.dispose();controller?.dispose();
  controller=new RecordController({sgf:analysisFixtures[Number(position.value)]!.sgf});provider=makeProvider();session=new AnalysisSession(controller,provider,{profile:'japanese-territory'});
  sourceView=mountBoard(find('source-board'),{controller,...boardOptions()});
  unsubscribe=controller.subscribe(state => {find<HTMLTextAreaElement>('comment').value=state.node.properties.C?.[0]??'';find('source-state').textContent=`Move ${state.position.moveNumber} · ${state.position.toPlay==='black' ? 'Black' : 'White'} to play · ${state.dirty ? 'Unsaved edits' : 'Clean record'}`;});
  find<HTMLTextAreaElement>('outgoing').value='';find<HTMLTextAreaElement>('incoming').value='';find('transport-state').textContent='No query submitted.';mount();
}
openPosition();position.addEventListener('change',openPosition);
mode.addEventListener('change',() => {
  const previous=provider;provider=makeProvider();session.setProvider(provider);previous.dispose();
  find('mode-help').textContent=mode.value==='offline' ? 'Offline mode uses authored illustrative numbers and protocol fixtures. No engine computed these predictions, and no network request is sent.' : 'Manual mode uses your explicitly configured KataGo process. Analyze captures a query; paste its response to display predictions. This page opens no connection.';
  find<HTMLDetailsElement>('protocol').open=mode.value==='manual';
});
for (const select of [theme,rotation]) select.addEventListener('change',() => {sourceView.update(boardOptions());view?.update({board:boardOptions()});});
find('previous').addEventListener('click',() => controller.previous());find('next').addEventListener('click',() => controller.next());find('undo').addEventListener('click',() => controller.undo());find('root').addEventListener('click',() => controller.goTo(controller.getState().path[0]!));
find('comment').addEventListener('input',() => controller.setComment(find<HTMLTextAreaElement>('comment').value));
find('toggle').addEventListener('click',() => {if (view) {view.dispose();view=undefined;find('toggle').textContent='Remount analysis';find<HTMLButtonElement>('svg').disabled=true;} else mount();});
find('receive').addEventListener('click',() => {const result=provider.receiveLine(find<HTMLTextAreaElement>('incoming').value);find('transport-state').textContent=result.ok ? 'Protocol line processed; only a matching final response can update analysis.' : result.message;});
function download(blob:Blob,name:string) {const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(() => URL.revokeObjectURL(url),0);}
find('svg').addEventListener('click',() => {if (view) download(new Blob([view.exportSvg()],{type:'image/svg+xml'}),'banora-analysis.svg');});
find('sgf').addEventListener('click',() => {const ticket=controller.prepareExport();download(new Blob([ticket.text],{type:'application/x-go-sgf'}),'banora-analysis-source.sgf');controller.acknowledgeExport(ticket.id);});
window.addEventListener('pagehide',event => {if (!event.persisted) {view?.dispose();unsubscribe?.();session.dispose();provider.dispose();sourceView.dispose();controller.dispose();}});

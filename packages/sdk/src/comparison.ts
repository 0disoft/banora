import { comparePositions } from './core.js';
import { mountBoard } from './board.js';
import type { BoardOptions, BoardView, DiagramOptions } from './board.js';
import type { RecordController } from './controller.js';
import { displayCrop, normalizeBoardTransform } from './geometry.js';
import {normalizeStoneTextures} from './stone-textures.js';

export type ComparisonSide = 'left' | 'right';
export type ComparisonBoardOptions = Pick<BoardOptions,'theme'|'coordinates'|'moveNumbers'|'crop'|'transform'|'stoneTextures'>;
export interface ComparisonOptions {
  readonly controller: RecordController;
  readonly left?: string;
  readonly right?: string;
  readonly board?: ComparisonBoardOptions;
}
export interface ComparisonView {
  readonly controller: RecordController;
  update(options: Omit<ComparisonOptions,'controller'>): void;
  exportSvg(side: ComparisonSide, options?: DiagramOptions): string;
  exportPng(side: ComparisonSide, options?: DiagramOptions): Promise<Blob>;
  dispose(): void;
}

/** Read-only comparison with one borrowed authoritative controller and renderer. */
export function mountComparison(container: HTMLElement, initial: ComparisonOptions): ComparisonView {
  const controller=initial.controller,document=container.ownerDocument,state=controller.getState();
  let left=initial.left ?? state.node.id,right=initial.right ?? state.node.id,generation=state.recordGeneration;
  const pickBoard=(board?:ComparisonBoardOptions): ComparisonBoardOptions => ({theme:board?.theme,coordinates:board?.coordinates,
    moveNumbers:board?.moveNumbers,crop:board?.crop,transform:normalizeBoardTransform(board?.transform),stoneTextures:normalizeStoneTextures(board?.stoneTextures)});
  let boardOptions=pickBoard(initial.board);
  let disposed=false;
  const views={} as Record<ComparisonSide,BoardView>;
  function validate(a: string,b: string,board: ComparisonBoardOptions, changing=false): void {
    for (const id of [a,b]) {
      const snapshot=controller.inspectNode(id);
      if (!snapshot) {if (changing && (id===left || id===right)) continue;throw new RangeError('Comparison node does not exist');}
      normalizeBoardTransform(board.transform);
      if (board.crop) displayCrop(board.crop,snapshot.position,board.transform);
    }
  }
  validate(left,right,boardOptions);
  const root=document.createElement('section');root.className='banora-comparison';root.setAttribute('aria-label','Go position comparison');root.setAttribute('role','region');
  const style=document.createElement('style');style.textContent=`.banora-comparison{font:14px system-ui;color:#173d31}.banora-comparison [data-panes]{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.banora-comparison [data-pane]{min-width:0}.banora-comparison label{display:block;font-weight:600;margin-bottom:8px}.banora-comparison select{width:100%;font:inherit;color:inherit;padding:8px;border:1px solid #cfd9cb;border-radius:7px;background:#fff;margin:6px 0}.banora-comparison [data-notes]{font-size:12px;white-space:pre-wrap;margin:10px 0;overflow-wrap:anywhere}.banora-comparison [data-result]{line-height:1.6}.banora-comparison [data-limit]{font-size:12px;color:#687b69}@media(max-width:700px){.banora-comparison [data-panes]{grid-template-columns:1fr}}`;
  const summary=document.createElement('p');summary.setAttribute('data-result','');summary.setAttribute('role','status');
  const grid=document.createElement('div');grid.setAttribute('data-panes','');
  const panes={} as Record<ComparisonSide,{select:HTMLSelectElement;board:HTMLElement;notes:HTMLElement}>;
  const abort=new AbortController();
  for (const side of ['left','right'] as const) {
    const pane=document.createElement('section');pane.setAttribute('data-pane',side);
    const label=document.createElement('label');label.textContent=`${side==='left' ? 'Left' : 'Right'} position`;
    const select=document.createElement('select');select.setAttribute('aria-label',label.textContent);label.append(select);
    const host=document.createElement('div');host.setAttribute('data-position',side);
    const notes=document.createElement('p');notes.setAttribute('data-notes',side);pane.append(label,host,notes);grid.append(pane);
    panes[side]={select,board:host,notes};
    select.addEventListener('change',() => {
      try {update({[side]:select.value});}
      catch (error) {render();summary.textContent=`Comparison rejected: ${error instanceof Error ? error.message : String(error)}`;}
    },{signal:abort.signal});
  }
  const limit=document.createElement('p');limit.setAttribute('data-limit','');
  root.append(style,summary,grid,limit);container.append(root);
  function render(): void {
    const current=controller.getState();
    if (current.recordGeneration!==generation) {
      generation=current.recordGeneration;left=right=current.node.id;boardOptions={...boardOptions,crop:null};syncBoards();
    }
    const pending=current.record.games.map((node,index) => ({node,depth:0,game:index+1}));
    const rows:{id:string;label:string}[]=[];let count=0;
    while (pending.length && count++<500) {
      const {node,depth,game}=pending.shift()!;
      const caption=node.properties.N?.[0] ?? (node.properties.B ? `Black ${node.properties.B[0] || 'pass'}` : node.properties.W ? `White ${node.properties.W[0] || 'pass'}` : 'Annotation');
      rows.push({id:node.id,label:`Game ${game} · ${depth===0 ? 'Start' : `Node ${depth}`} · ${caption} (${node.id})`});
      pending.unshift(...node.children.map(child => ({node:child,depth:depth+1,game})));
    }
    const selected=new Set(rows.map(row => row.id));
    for (const id of [left,right]) if (!selected.has(id)) {rows.push({id,label:controller.inspectNode(id) ? `Selected node ${id}` : `Unavailable node ${id}`});selected.add(id);}
    for (const side of ['left','right'] as const) {
      const pane=panes[side],id=side==='left' ? left : right,snapshot=controller.inspectNode(id);
      pane.select.replaceChildren(...rows.map(row => {const option=document.createElement('option');option.value=row.id;option.textContent=row.label;return option;}));pane.select.value=id;
      pane.notes.textContent=snapshot?.node.properties.C?.[0] ?? (snapshot ? 'No comments on this position.' : 'Node unavailable. Restore the branch or choose another position.');
    }
    const first=controller.inspectNode(left),second=controller.inspectNode(right);
    if (!first || !second) summary.textContent='Comparison unavailable. Choose two existing nodes or restore the removed branch.';
    else if (first.position.width!==second.position.width || first.position.height!==second.position.height) summary.textContent=`Different board dimensions: ${first.position.width} × ${first.position.height} and ${second.position.width} × ${second.position.height}. No intersections are compared.`;
    else {
      const changes=comparePositions(first.position,second.position);
      const added=changes.filter(change => change.before===null).length,removed=changes.filter(change => change.after===null).length;
      summary.textContent=`${changes.length} changed intersection${changes.length===1 ? '' : 's'} from left to right: ${added} added, ${removed} removed, ${changes.length-added-removed} color changed. + added · − removed · ↔ replaced on each board relative to the other.`;
    }
    limit.textContent=pending.length ? 'First 500 nodes plus selected nodes shown. The API can compare any node in the record.' : '';
  }
  function syncBoards(): void {
    const common={...boardOptions,referenceGeneration:generation};
    views.left.update({...common,nodeId:left,compareTo:right});views.right.update({...common,nodeId:right,compareTo:left});
  }
  function update(next: Omit<ComparisonOptions,'controller'>): void {
    if (disposed) throw new Error('Comparison view is disposed');
    const a=next.left ?? left,b=next.right ?? right,board=pickBoard({...boardOptions,...next.board,
      transform:next.board && Object.hasOwn(next.board,'transform') ? next.board.transform : boardOptions.transform});
    validate(a,b,board,true);left=a;right=b;boardOptions=board;generation=controller.getState().recordGeneration;syncBoards();render();
  }
  let unsubscribe: (() => void) | undefined;
  try {
    views.left=mountBoard(panes.left.board,{...boardOptions,controller,nodeId:left,compareTo:right,referenceGeneration:generation});
    views.right=mountBoard(panes.right.board,{...boardOptions,controller,nodeId:right,compareTo:left,referenceGeneration:generation});
    unsubscribe=controller.subscribe(render);
  } catch (error) {abort.abort();views.left?.dispose();views.right?.dispose();root.remove();throw error;}
  const sideView=(side: ComparisonSide) => {if (disposed) throw new Error('Comparison view is disposed');if (!views[side]) throw new RangeError('Comparison side must be left or right');return views[side];};
  return Object.freeze({controller,update,
    exportSvg:(side:ComparisonSide,options?:DiagramOptions) => sideView(side).exportSvg(options),
    exportPng:(side:ComparisonSide,options?:DiagramOptions) => sideView(side).exportPng(options),
    dispose() {if (disposed) return;disposed=true;abort.abort();unsubscribe?.();views.left.dispose();views.right.dispose();root.remove();},
  });
}

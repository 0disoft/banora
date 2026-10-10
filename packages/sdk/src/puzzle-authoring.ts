import {isOnBoard,pass,play} from './core.js';
import type {Color,Point,Position,RulePolicy} from './core.js';
import {RecordController} from './controller.js';
import {recordNodeAt} from './sgf.js';
import type {RecordLocator} from './sgf.js';
import type {PuzzleHint} from './puzzle-types.js';

export interface CompiledPuzzleNode {
  readonly id:string;readonly move:Point|null;readonly result:'correct'|'incorrect'|undefined;
  readonly feedback:string;readonly hints:readonly PuzzleHint[];readonly children:readonly string[];
  readonly response:string|undefined;
}
export interface CompiledPuzzle {
  readonly id:string;readonly title:string;readonly prompt:string;readonly player:Color;
  readonly initial:Position;readonly root:string;readonly nodes:ReadonlyMap<string,CompiledPuzzleNode>;
}
function fail(message:string):never {throw new TypeError(`Invalid puzzle definition: ${message}`);}
function object(value:unknown,label:string): Record<string,unknown> {
  if (!value || typeof value!=='object' || Array.isArray(value)) fail(`${label} must be an object`);
  return value as Record<string,unknown>;
}
function identifier(value:unknown): string {
  if (typeof value!=='string' || !/^[A-Za-z0-9_-]{1,64}$/.test(value)) fail('IDs must contain 1 to 64 ASCII letters, digits, underscores or hyphens');
  return value;
}
export function puzzleMove(value:unknown,position:Pick<Position,'width'|'height'>): Point|null {
  if (value===null) return null;
  const point=object(value,'move/hint point');
  if (typeof point.x!=='number' || typeof point.y!=='number' || !isOnBoard(position,point as unknown as Point)) fail('move/hint point is outside the board');
  return Object.freeze({x:point.x,y:point.y});
}
const moveKey=(move:Point|null) => move ? `${move.x},${move.y}` : 'pass';

/** Validate and defensively compile the entire answer tree before publication. */
export function compilePuzzle(input:unknown): CompiledPuzzle {
  const definition=object(input,'definition');
  if (definition.schemaVersion!=='banora.puzzle/v1') fail('unsupported schemaVersion');
  let textSize=0;
  function text(value:unknown,label:string,max=4096): string {
    if (typeof value!=='string' || value.length>max) fail(`${label} must be text of at most ${max} characters`);
    textSize+=value.length;if (textSize>262_144) fail('aggregate authored text exceeds 262144 characters');return value;
  }
  const id=identifier(definition.id),title=text(definition.title,'title',256),prompt=text(definition.prompt,'prompt');
  textSize+=id.length;
  if (typeof definition.sgf!=='string') fail('sgf must be text');
  if (definition.rules!==undefined) {
    const rules=object(definition.rules,'rules');
    for (const key of Object.keys(rules)) if (!['suicide','ko','passStones'].includes(key)) fail(`unsupported rule option ${key}`);
    if (Object.values(rules).includes(null)) fail('rule options cannot be null');
  }
  const model=new RecordController({sgf:definition.sgf,rules:definition.rules as Partial<RulePolicy>|undefined});
  let initial:Position;
  try {
    const locator=definition.initial===undefined ? {gameIndex:0,path:[]} : definition.initial;
    const node=recordNodeAt(model.getState().record,locator as RecordLocator);
    if (!node) fail('initial locator does not identify a record node');initial=model.inspectNode(node.id)!.position;
  } finally {model.dispose();}
  const player=definition.player===undefined ? initial.toPlay : definition.player;
  if (player!=='black' && player!=='white') fail('player must be black or white');
  if (player!==initial.toPlay) fail('player must match the initial turn');
  const nodes=new Map<string,CompiledPuzzleNode>(),seen=new WeakSet<object>();
  const pending=[{raw:definition.tree,before:initial,depth:0}],root=identifier(object(definition.tree,'tree').id);
  while (pending.length) {
    const {raw,before,depth}=pending.pop()!;
    if (nodes.size>=1000 || depth>128) fail('answer tree exceeds 1000 nodes or depth 128');
    const node=object(raw,'tree node');
    if (seen.has(node)) fail('answer tree contains a cycle or reused node object');seen.add(node);
    const nodeId=identifier(node.id);textSize+=nodeId.length;
    if (nodes.has(nodeId)) fail(`duplicate node ID ${nodeId}`);
    if (depth===0 && node.move!==undefined) fail('root must omit move');
    const move=depth===0 ? null : puzzleMove(node.move,before);
    const played=depth===0 ? {ok:true as const,position:before} : move===null ? pass(before) : play(before,move);
    if (!played.ok) fail(`illegal authored move at ${nodeId}: ${played.reason}`);
    const position=played.position;
    const children=node.children===undefined ? [] : node.children;
    if (!Array.isArray(children) || children.length>1000 || children.includes(undefined)) fail('children must be a dense array of at most 1000 nodes');
    if (nodes.size+1+pending.length+children.length>1000) fail('answer tree exceeds 1000 nodes');
    const childIds:string[]=[],moves=new Set<string>();
    for (const rawChild of children) {
      const child=object(rawChild,'child'),childId=identifier(child.id),key=moveKey(puzzleMove(child.move,position));
      if (moves.has(key)) fail(`duplicate sibling move at ${nodeId}`);moves.add(key);childIds.push(childId);
    }
    if (node.result!==undefined && node.result!=='correct' && node.result!=='incorrect') fail(`invalid result at ${nodeId}`);
    const result=node.result as 'correct'|'incorrect'|undefined;
    if (result ? children.length>0 || node.response!==undefined : children.length===0) fail(`node ${nodeId} must be terminal or have children`);
    if (depth===0 && result) fail('root cannot be terminal');
    if (!result && position.toPlay!==player) {
      if (typeof node.response!=='string' || !childIds.includes(node.response)) fail(`opponent node ${nodeId} requires an explicit response child`);
    } else if (node.response!==undefined) fail(`solver/terminal node ${nodeId} cannot choose an automatic response`);
    const rawHints=node.hints===undefined ? [] : node.hints;
    if (!Array.isArray(rawHints) || rawHints.length>16 || rawHints.includes(undefined)) fail('hints must be a dense array of at most 16 entries');
    const hints=rawHints.map(value => {
      const hint=object(value,'hint'),point=hint.point===undefined ? undefined : puzzleMove(hint.point,position);
      if (point===null) fail('hint point cannot be null');
      return Object.freeze({text:text(hint.text,'hint text'),...(point ? {point} : {})});
    });
    const feedback=node.feedback===undefined ? '' : text(node.feedback,'feedback');
    if (textSize>262_144) fail('aggregate authored text exceeds 262144 characters');
    nodes.set(nodeId,Object.freeze({id:nodeId,move,result,feedback,hints:Object.freeze(hints),children:Object.freeze(childIds),response:node.response as string|undefined}));
    for (let index=children.length-1;index>=0;index--) pending.push({raw:children[index],before:position,depth:depth+1});
  }
  let correct=false;const reachable=[root];
  while (reachable.length) {
    const node=nodes.get(reachable.pop()!)!;
    if (node.result==='correct') {correct=true;break;}
    if (!node.result) reachable.push(...(node.response ? [node.response] : node.children));
  }
  if (!correct) fail('no correct result is reachable through the chosen response policy');
  return Object.freeze({id,title,prompt,player,initial,root,nodes});
}

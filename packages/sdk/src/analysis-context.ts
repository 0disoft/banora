import {pass,play,replayMove} from './core.js';
import type {Position} from './core.js';
import type {ControllerState} from './controller.js';
import {applyRecordNode,initialRecordPosition} from './record-runtime.js';
import {createSgfNode,pointFromSgf} from './sgf.js';
import {getRuleProfile} from './rules.js';
import type {ScoringPolicy} from './rules.js';
import {AnalysisError} from './analysis-types.js';
import type {AnalysisContext,AnalysisContextResult,AnalysisFailure,AnalysisMove,AnalysisSettings} from './analysis-types.js';
const signatures=new WeakMap<AnalysisContext,string>();let sequence=0;
export function analysisFailure(reason:AnalysisFailure['reason'],message:string): AnalysisFailure {return Object.freeze({ok:false,reason,message});}
function fail(message:string,reason:AnalysisFailure['reason']='invalid-context'):never {throw new AnalysisError(reason,message);}
function scoringPolicy(value:unknown): ScoringPolicy {
  if (!value || typeof value!=='object' || Array.isArray(value)) fail('Supply an explicit scoring policy or named profile.');
  const policy=value as ScoringPolicy;
  if (!['area','territory'].includes(policy.method) || !['include','exclude'].includes(policy.seki) ||
    !['none','white-minus-one'].includes(policy.handicapCompensation) || typeof policy.whiteLastPass!=='boolean') fail('Invalid custom scoring policy.');
  return Object.freeze({method:policy.method,seki:policy.seki,handicapCompensation:policy.handicapCompensation,whiteLastPass:policy.whiteLastPass});
}
const positionData=(position:Position) => ({width:position.width,height:position.height,board:position.board,toPlay:position.toPlay,
  rules:position.rules,captures:position.captures,passPrisoners:position.passPrisoners,consecutivePasses:position.consecutivePasses,
  previousBoard:position.previousBoard,moveNumber:position.moveNumber});
export function sameAnalysisContext(left:AnalysisContext|null,right:AnalysisContext|null): boolean {
  if (!left || !right) return left===right;
  const a=signatures.get(left),b=signatures.get(right);return a!==undefined && a===b;
}
export function isAnalysisContext(value:AnalysisContext): boolean {return signatures.has(value);}

/** Extract real epoch history; never infer missing move order from visible stones. */
export function createAnalysisContext(state:ControllerState,settings:AnalysisSettings): AnalysisContextResult {
  try {
    if (!settings || typeof settings!=='object' || Array.isArray(settings) || (settings.profile===undefined)===(settings.scoring===undefined)) fail('Supply exactly one named profile or custom scoring policy.');
    const profile=settings.profile===undefined ? null : getRuleProfile(settings.profile);
    const scoring=scoringPolicy(profile?.scoring ?? settings.scoring),rules=state.position.rules;
    if (profile && (profile.play.ko!==rules.ko || profile.play.suicide!==rules.suicide || profile.play.passStones!==rules.passStones)) fail('Named profile does not match the controller play policy.');
    const root=state.record.games[state.gameIndex];
    if (!root || !state.path.length || state.path[0]!==root.id || state.path.at(-1)!==state.node.id || state.path.length>50_000) fail('Invalid selected record path.');
    const komi=settings.komi===undefined ? Number(root.properties.KM?.[0] ?? '0') : settings.komi;
    const handicap=settings.handicap===undefined ? Number(root.properties.HA?.[0] ?? '0') : settings.handicap;
    if (typeof komi!=='number' || !Number.isFinite(komi) || Math.abs(komi)>1_000_000_000) fail('Komi must be finite and within the component bound.');
    if (typeof handicap!=='number' || !Number.isInteger(handicap) || handicap<0 || handicap>state.position.board.length) fail('Handicap must be an integer within board area.');
    if (!Number.isSafeInteger(state.recordGeneration) || state.recordGeneration<0) fail('Invalid source generation.');
    let node=root,position=initialRecordPosition(root,rules),initial=position,moves:AnalysisMove[]=[];
    for (let index=0;index<state.path.length;index++) {
      if (index>0) {const next=node.children.find(child => child.id===state.path[index]);if (!next) fail('Selected record path is unavailable.');node=next;}
      const props=node.properties;
      if (props.PL || ['AB','AW','AE'].some(key => (props[key]?.length ?? 0)>0)) {
        const setup:Record<string,readonly string[]>={};for (const key of ['AB','AW','AE','PL']) if (props[key]) setup[key]=props[key]!;
        position=applyRecordNode(position,createSgfNode(node.id,setup));initial=position;moves=[];
      }
      for (const [key,color] of [['B','black'],['W','white']] as const) {
        const value=props[key]?.[0];if (value===undefined) continue;
        const move=value==='' || (value==='tt' && position.width<=19 && position.height<=19) ? null : Object.freeze(pointFromSgf(value,position.width,position.height));
        const recorded=replayMove(position,move,color);if (!recorded.ok) fail('Recorded move is unavailable.','unsupported-history');
        position=recorded.position;moves.push(Object.freeze({color,move}));
      }
      if (props.MN) position=Object.freeze({...position,moveNumber:Number(props.MN[0])});
    }
    if (JSON.stringify(positionData(position))!==JSON.stringify(positionData(state.position))) fail('Record snapshot and selected position do not match.');
    let legal=initial;
    for (const move of moves) {
      const result=move.move===null ? pass(legal,move.color) : play(legal,move.move,move.color);
      if (!result.ok) fail(`Recorded epoch contains an unrepresentable move: ${result.reason}.`,'unsupported-history');legal=result.position;
    }
    if (sequence>=Number.MAX_SAFE_INTEGER) fail('Analysis context identity limit reached.','limit');
    const source=Object.freeze({gameIndex:state.gameIndex,nodeId:state.node.id,recordGeneration:state.recordGeneration});
    const value:AnalysisContext=Object.freeze({key:`context-${++sequence}`,source,position,initial,moves:Object.freeze(moves),profile:profile?.id ?? null,scoring,komi,handicap});
    signatures.set(value,JSON.stringify({source,position:positionData(position),initial:positionData(initial),moves,profile:value.profile,scoring,komi,handicap}));
    return {ok:true,value};
  } catch (error) {return error instanceof AnalysisError ? analysisFailure(error.reason,error.message) : analysisFailure('invalid-context','The record or analysis settings cannot form a valid context.');}
}

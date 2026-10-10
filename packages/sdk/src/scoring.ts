import {isOnBoard,opposite} from './core.js';
import type {Color,Point,Position} from './core.js';
import {getRuleProfile} from './rules.js';
import type {RuleProfile,RuleProfileId} from './rules.js';

export interface ScoreOptions {
  readonly profile:RuleProfileId;
  readonly komi?:number;
  readonly handicap?:number;
  readonly deadStones?:readonly Point[];
  readonly sekiStones?:readonly Point[];
  readonly adjustments?:Readonly<Partial<Record<Color,number>>>;
}
export interface ScoreBreakdown {
  readonly stones:number;
  readonly territory:number;
  readonly captures:number;
  readonly deadPrisoners:number;
  readonly passPrisoners:number;
  readonly prisoners:number;
  readonly komi:number;
  readonly handicapCompensation:number;
  readonly adjustment:number;
  readonly total:number;
}
export type ScoreWarning='passes-incomplete'|'white-last-pass-required';
export interface ScoreSummary {
  readonly profile:RuleProfileId;
  readonly method:'territory'|'area';
  readonly width:number;
  readonly height:number;
  readonly originalBoard:readonly (Color|null)[];
  readonly board:readonly (Color|null)[];
  readonly ownership:readonly (Color|null)[];
  readonly deadStones:readonly Readonly<Point>[];
  readonly sekiStones:readonly Readonly<Point>[];
  readonly black:ScoreBreakdown;
  readonly white:ScoreBreakdown;
  readonly neutral:number;
  readonly difference:number;
  readonly winner:Color|'draw';
  readonly margin:number;
  readonly passSequenceComplete:boolean;
  readonly warnings:readonly ScoreWarning[];
}
export type ScoreFailure='invalid-profile'|'invalid-position'|'invalid-options'|'invalid-selection'|'profile-mismatch';
export type ScoreResult={readonly ok:true;readonly value:ScoreSummary}|{readonly ok:false;readonly reason:ScoreFailure;readonly message:string};
const MAX_COMPONENT=1_000_000_000;
const failure=(reason:ScoreFailure,message:string): ScoreResult => ({ok:false,reason,message});
function neighbors(index:number,width:number,height:number): number[] {
  const x=index%width,y=Math.floor(index/width),result:number[]=[];
  if (x) result.push(index-1);if (x<width-1) result.push(index+1);
  if (y) result.push(index-width);if (y<height-1) result.push(index+width);
  return result;
}
function selectedGroups(position:Position,points:readonly Point[]|undefined): Set<number>|null {
  const selected=new Set<number>();if (points===undefined) return selected;
  if (!Array.isArray(points) || points.length>position.board.length) return null;
  for (const point of points) {
    if (!point || !isOnBoard(position,point)) return null;
    const start=point.y*position.width+point.x,color=position.board[start];
    if (!color) return null;if (selected.has(start)) continue;
    const pending=[start];selected.add(start);
    while (pending.length) for (const next of neighbors(pending.pop()!,position.width,position.height)) {
      if (position.board[next]===color && !selected.has(next)) {selected.add(next);pending.push(next);}
    }
  }
  return selected;
}
const bounded=(value:unknown): value is number => typeof value==='number' && Number.isFinite(value) && Math.abs(value)<=MAX_COMPONENT;
const count=(value:unknown): value is number => bounded(value) && Number.isInteger(value) && value>=0;
function validPosition(position:Position): boolean {
  return !!position && Number.isInteger(position.width) && position.width>=2 && position.width<=52 &&
    Number.isInteger(position.height) && position.height>=2 && position.height<=52 && Array.isArray(position.board) &&
    position.board.length===position.width*position.height && !(position.board as readonly unknown[]).includes(undefined) &&
    position.board.every(color => color===null || color==='black' || color==='white') &&
    ['black','white'].includes(position.toPlay) && count(position.captures?.black) && count(position.captures?.white) &&
    count(position.passPrisoners?.black) && count(position.passPrisoners?.white) && count(position.consecutivePasses);
}
function pointsFor(indices:Set<number>,width:number): readonly Readonly<Point>[] {
  return Object.freeze([...indices].sort((a,b) => a-b).map(index => Object.freeze({x:index%width,y:Math.floor(index/width)})));
}

/** Calculate from agreed status; does not predict life/death, edit records or end games. */
export function scorePosition(position:Position,options:ScoreOptions): ScoreResult {
  if (!validPosition(position)) return failure('invalid-position','Invalid board, turn or prisoner/pass counters');
  if (!options || typeof options!=='object' || Array.isArray(options)) return failure('invalid-options','Scoring options must be an object');
  let profile:RuleProfile;try {profile=getRuleProfile(options?.profile);} catch {return failure('invalid-profile','Unknown rule profile');}
  const komi=options.komi===undefined ? 0 : options.komi,handicap=options.handicap===undefined ? 0 : options.handicap,
    blackAdjustment=options.adjustments?.black===undefined ? 0 : options.adjustments.black,
    whiteAdjustment=options.adjustments?.white===undefined ? 0 : options.adjustments.white;
  if (!bounded(komi) || !bounded(blackAdjustment) || !bounded(whiteAdjustment) || !Number.isInteger(handicap) || handicap<0 || handicap>position.board.length ||
    (options.adjustments!==undefined && (!options.adjustments || typeof options.adjustments!=='object' || Array.isArray(options.adjustments)))) {
    return failure('invalid-options','Finite bounded komi/adjustments and an on-board integer handicap count are required');
  }
  if (profile.play.passStones && position.rules?.passStones!==true) return failure('profile-mismatch','AGA scoring requires a position replayed with pass-stone accounting');
  const dead=selectedGroups(position,options.deadStones),seki=selectedGroups(position,options.sekiStones);
  if (!dead || !seki || [...dead].some(index => seki.has(index))) return failure('invalid-selection','Select existing whole groups; dead and seki selections must not overlap');
  const board=[...position.board],deadPrisoners={black:0,white:0};
  for (const index of dead) {deadPrisoners[opposite(board[index]!)]++;board[index]=null;}
  const ownership=[...board],territory={black:0,white:0},stones={black:0,white:0},visited=new Set<number>();let neutral=0;
  for (let index=0;index<board.length;index++) {
    const color=board[index];if (color) {stones[color]++;continue;}
    if (visited.has(index)) continue;
    const region=[index],pending=[index];visited.add(index);let border=0,sekiBorder=false;
    while (pending.length) for (const next of neighbors(pending.pop()!,position.width,position.height)) {
      const neighbor=board[next];
      if (neighbor) {border|=neighbor==='black' ? 1 : 2;if (seki.has(next)) sekiBorder=true;}
      else if (!visited.has(next)) {visited.add(next);pending.push(next);region.push(next);}
    }
    const owner=profile.scoring.seki==='exclude' && sekiBorder ? null : border===1 ? 'black' : border===2 ? 'white' : null;
    for (const point of region) ownership[point]=owner;
    if (owner) territory[owner]+=region.length;else neutral+=region.length;
  }
  function breakdown(color:Color): ScoreBreakdown {
    const captures=position.captures[color],passPrisoners=profile.play.passStones ? position.passPrisoners[color] : 0,
      prisoners=captures+passPrisoners+deadPrisoners[color],komiValue=color==='white' ? komi : 0,
      handicapCompensation=color==='white' && profile.scoring.handicapCompensation==='white-minus-one' ? Math.max(0,handicap-1) : 0,
      adjustment=color==='black' ? blackAdjustment : whiteAdjustment,
      total=territory[color]+(profile.scoring.method==='area' ? stones[color] : prisoners)+komiValue+handicapCompensation+adjustment;
    return Object.freeze({stones:stones[color],territory:territory[color],captures,deadPrisoners:deadPrisoners[color],
      passPrisoners,prisoners,komi:komiValue,handicapCompensation,adjustment,total});
  }
  const black=breakdown('black'),white=breakdown('white'),difference=black.total-white.total;
  const passSequenceComplete=position.consecutivePasses>=2 && (!profile.scoring.whiteLastPass || position.toPlay==='black');
  const warnings:ScoreWarning[]=passSequenceComplete ? [] : [profile.scoring.whiteLastPass && position.consecutivePasses>=2 ? 'white-last-pass-required' : 'passes-incomplete'];
  return {ok:true,value:Object.freeze({profile:profile.id,method:profile.scoring.method,width:position.width,height:position.height,
    originalBoard:Object.freeze([...position.board]),board:Object.freeze(board),ownership:Object.freeze(ownership),
    deadStones:pointsFor(dead,position.width),sekiStones:pointsFor(seki,position.width),black,white,neutral,difference,
    winner:difference===0 ? 'draw' : difference>0 ? 'black' : 'white',margin:Math.abs(difference),passSequenceComplete,warnings:Object.freeze(warnings)})};
}

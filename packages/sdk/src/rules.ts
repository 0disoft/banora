import type {RulePolicy} from './core.js';

export type RuleProfileId='japanese-territory'|'aga-territory'|'aga-area'|'tromp-taylor';
export interface ScoringPolicy {
  readonly method:'territory'|'area';
  readonly seki:'exclude'|'include';
  readonly handicapCompensation:'none'|'white-minus-one';
  readonly whiteLastPass:boolean;
}
export interface RuleProfile {
  readonly id:RuleProfileId;
  readonly label:string;
  readonly play:RulePolicy;
  readonly scoring:ScoringPolicy;
  readonly coverage:'agreed-position';
}
function profile(id:RuleProfileId,label:string,play:RulePolicy,scoring:ScoringPolicy): RuleProfile {
  return Object.freeze({id,label,play:Object.freeze(play),scoring:Object.freeze(scoring),coverage:'agreed-position' as const});
}
export const RULE_PROFILES:Readonly<Record<RuleProfileId,RuleProfile>>=Object.freeze({
  'japanese-territory':profile('japanese-territory','Japanese territory',
    {suicide:'forbid',ko:'simple',passStones:false},
    {method:'territory',seki:'exclude',handicapCompensation:'none',whiteLastPass:false}),
  'aga-territory':profile('aga-territory','AGA territory',
    {suicide:'forbid',ko:'situational-superko',passStones:true},
    {method:'territory',seki:'include',handicapCompensation:'none',whiteLastPass:true}),
  'aga-area':profile('aga-area','AGA area',
    {suicide:'forbid',ko:'situational-superko',passStones:true},
    {method:'area',seki:'include',handicapCompensation:'white-minus-one',whiteLastPass:true}),
  'tromp-taylor':profile('tromp-taylor','Tromp-Taylor area',
    {suicide:'allow',ko:'positional-superko',passStones:false},
    {method:'area',seki:'include',handicapCompensation:'none',whiteLastPass:false}),
});
export function getRuleProfile(id:RuleProfileId): RuleProfile {
  if (typeof id!=='string' || !Object.hasOwn(RULE_PROFILES,id)) throw new TypeError('Unknown rule profile');
  return RULE_PROFILES[id];
}

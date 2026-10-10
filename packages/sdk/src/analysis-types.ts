import type {Color,Point,Position} from './core.js';
import type {RuleProfileId,ScoringPolicy} from './rules.js';
export interface AnalysisSettings {
  /** Supply exactly one of profile or an explicit custom scoring policy. */
  readonly profile?:RuleProfileId;
  readonly scoring?:ScoringPolicy;
  readonly komi?:number;
  readonly handicap?:number;
}
export interface AnalysisMove {readonly color:Color;readonly move:Point|null}
export interface AnalysisContext {
  readonly key:string;
  readonly source:{readonly gameIndex:number;readonly nodeId:string;readonly recordGeneration:number};
  readonly position:Position;
  readonly initial:Position;
  readonly moves:readonly AnalysisMove[];
  readonly profile:RuleProfileId|null;
  readonly scoring:ScoringPolicy;
  readonly komi:number;
  readonly handicap:number;
}
export interface AnalysisRequestOptions {readonly maxVisits?:number;readonly maxPvLength?:number;readonly includeOwnership?:boolean}
export interface AnalysisRequest {
  readonly id:string;readonly providerId:string;readonly context:AnalysisContext;
  readonly limits:{readonly maxVisits:number;readonly maxPvLength:number;readonly includeOwnership:boolean};
}
export interface AnalysisMetrics {readonly winProbabilityBlack:number;readonly scoreLeadBlack:number;readonly visits:number}
export interface AnalysisCandidateInput extends AnalysisMetrics {
  readonly move:Point|null;readonly rank:number;readonly principalVariation:readonly (Point|null)[];
}
export interface AnalysisResultInput {
  readonly requestId:string;readonly contextKey:string;readonly root:AnalysisMetrics;
  readonly candidates:readonly AnalysisCandidateInput[];readonly ownership?:readonly number[];
}
export interface AnalysisCandidate extends AnalysisCandidateInput {readonly scoreLoss:number}
export interface AnalysisResult {
  readonly requestId:string;readonly contextKey:string;readonly providerId:string;readonly root:AnalysisMetrics;
  readonly candidates:readonly AnalysisCandidate[];readonly ownership:readonly number[]|null;
}
/** Portable headless cancellation; hosts bridge this to AbortController/engine termination. */
export interface AnalysisCancellation {readonly cancelled:boolean;onCancel(listener:() => void):() => void}
export interface AnalysisProvider {readonly id:string;analyze(request:AnalysisRequest,cancellation:AnalysisCancellation):Promise<unknown>}
export type AnalysisFailureReason='invalid-context'|'unsupported-history'|'invalid-request'|'invalid-result'|'provider'|'unsupported'|'cancelled'|'stale'|'disposed'|'busy'|'limit';
export interface AnalysisFailure {readonly ok:false;readonly reason:AnalysisFailureReason;readonly message:string}
export type AnalysisContextResult={readonly ok:true;readonly value:AnalysisContext}|AnalysisFailure;
export type AnalysisCompletion={readonly ok:true;readonly result:AnalysisResult}|AnalysisFailure;
export type AnalysisActionResult={readonly ok:true}|AnalysisFailure;
export interface AnalysisState {
  readonly status:'idle'|'loading'|'ready'|'error'|'cancelled'|'unavailable';
  readonly providerId:string;readonly context:AnalysisContext|null;readonly requestId:string|null;
  readonly result:AnalysisResult|null;readonly error:AnalysisFailure|null;
}
/** Throw only messages intended for public display; arbitrary transport exceptions are redacted. */
export class AnalysisError extends Error {
  readonly reason:AnalysisFailureReason;
  constructor(reason:AnalysisFailureReason,message:string) {
    if (typeof message!=='string' || message.length>4096) throw TypeError('Analysis error text must contain at most 4096 characters');
    super(message);this.name='AnalysisError';this.reason=reason;
  }
}

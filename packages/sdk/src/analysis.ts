import type {RecordController} from './controller.js';
import {AnalysisError} from './analysis-types.js';
import type {AnalysisActionResult,AnalysisCompletion,AnalysisContextResult,AnalysisFailure,AnalysisProvider,AnalysisRequest,AnalysisRequestOptions,AnalysisSettings,AnalysisState} from './analysis-types.js';
import {analysisFailure,createAnalysisContext,sameAnalysisContext} from './analysis-context.js';
import {normalizeAnalysisResult} from './analysis-result.js';
import {AnalysisToken} from './analysis-cancellation.js';
import {analysisRequestLimits} from './analysis-request.js';
export type * from './analysis-types.js';
export {AnalysisError,createAnalysisContext,sameAnalysisContext,normalizeAnalysisResult};
interface PendingAnalysis {
  owner:AnalysisSession|undefined;request:AnalysisRequest|undefined;token:AnalysisToken;
  resolve:(result:AnalysisCompletion) => void;
}
let sessions=0;
function providerSnapshot(provider:AnalysisProvider):AnalysisProvider {
  if (!provider || typeof provider.id!=='string' || !/^[A-Za-z0-9_-]{1,64}$/.test(provider.id) || typeof provider.analyze!=='function') throw TypeError('An analysis provider requires an ASCII ID and analyze method');
  return Object.freeze({id:provider.id,analyze:provider.analyze.bind(provider)});
}
const settingsSnapshot=(settings:AnalysisSettings):AnalysisSettings => Object.freeze({...settings,...(settings?.scoring===undefined ? {} : {scoring:Object.freeze({...settings.scoring})})});

/** Explicit-only external analysis over a borrowed record controller. */
export class AnalysisSession {
  #controller:RecordController|undefined;#provider:AnalysisProvider|undefined;#settings:AnalysisSettings;
  #state:AnalysisState|undefined;#pending:PendingAnalysis|undefined;#unsubscribeSource:(() => void)|undefined;
  #listeners=new Set<(state:AnalysisState) => void>();#queue:AnalysisState[]=[];
  #notifying=false;#working=0;#disposed=false;#version=0;#sequence=0;#sessionId:number;
  constructor(controller:RecordController,provider:AnalysisProvider,settings:AnalysisSettings) {
    if (!controller || typeof controller.getState!=='function' || typeof controller.subscribe!=='function') throw TypeError('An analysis session requires a record controller');
    if (sessions>=Number.MAX_SAFE_INTEGER) throw RangeError('Analysis session identity limit reached');
    this.#sessionId=++sessions;this.#controller=controller;this.#provider=providerSnapshot(provider);this.#settings=settingsSnapshot(settings);
    this.#state=this.#contextState(this.#capture());this.#unsubscribeSource=controller.subscribe(() => this.#sync());
  }
  #capture():AnalysisContextResult {
    try {return createAnalysisContext(this.#controller!.getState(),this.#settings);} catch {return analysisFailure('invalid-context','The source record is unavailable.');}
  }
  #contextState(context:AnalysisContextResult):AnalysisState {
    return Object.freeze({status:context.ok ? 'idle' : 'unavailable',providerId:this.#provider!.id,
      context:context.ok ? context.value : null,requestId:null,result:null,error:context.ok ? null : context});
  }
  #assertLive():void {if (this.#disposed) throw Error('AnalysisSession is disposed');}
  #guard():AnalysisFailure|undefined {
    return this.#disposed ? analysisFailure('disposed','Analysis session is disposed.') : this.#notifying || this.#working ? analysisFailure('busy','Analysis session is notifying or cancelling.') : undefined;
  }
  getState():AnalysisState {this.#assertLive();return this.#state!;}
  /** Borrowed source; disposing this session never disposes the record. */
  get controller():RecordController {this.#assertLive();return this.#controller!;}
  subscribe(listener:(state:AnalysisState) => void):() => void {
    this.#assertLive();this.#listeners.add(listener);this.#working++;
    try {listener(this.#state!);} catch (error) {this.#listeners.delete(listener);throw error;} finally {this.#working--;}
    return () => {this.#listeners.delete(listener);};
  }
  #publish(state:AnalysisState):void {
    if (this.#disposed) return;this.#state=state;this.#queue.push(state);if (this.#notifying) return;
    this.#notifying=true;
    try {while (this.#queue.length) {const state=this.#queue.shift()!;for (const listener of [...this.#listeners]) {
      if (!this.#listeners.has(listener)) continue;try {listener(state);} catch {console.error('Banora analysis state listener failed');}
    }}} finally {this.#notifying=false;}
  }
  #abort(reason:'cancelled'|'stale'|'disposed'):void {
    const pending=this.#pending;if (!pending) return;
    this.#pending=undefined;pending.owner=undefined;pending.request=undefined;this.#working++;
    try {pending.token.cancel();} finally {this.#working--;pending.resolve(analysisFailure(reason,`Analysis request ${reason}.`));}
  }
  #sync():void {
    if (this.#disposed) return;const captured=this.#capture(),before=this.#state!;
    if (captured.ok ? sameAnalysisContext(before.context,captured.value) : !before.context && before.error?.reason===captured.reason && before.error.message===captured.message) return;
    const version=++this.#version;this.#abort('stale');if (this.#disposed || version!==this.#version) return;this.#publish(this.#contextState(captured));
  }
  setSettings(settings:AnalysisSettings):AnalysisActionResult {
    const guard=this.#guard();if (guard) return guard;
    let proposed:AnalysisSettings,captured:AnalysisContextResult;
    try {proposed=settingsSnapshot(settings);captured=createAnalysisContext(this.#controller!.getState(),proposed);} catch {return analysisFailure('invalid-context','Invalid analysis settings or unavailable record.');}
    if (!captured.ok) return captured;this.#settings=proposed;
    if (sameAnalysisContext(this.#state!.context,captured.value)) return {ok:true};
    const version=++this.#version;this.#abort('stale');if (!this.#disposed && version===this.#version) this.#publish(this.#contextState(captured));return {ok:true};
  }
  setProvider(provider:AnalysisProvider):AnalysisActionResult {
    const guard=this.#guard();if (guard) return guard;
    let proposed:AnalysisProvider;try {proposed=providerSnapshot(provider);} catch {return analysisFailure('invalid-request','Invalid analysis provider.');}
    this.#provider=proposed;const version=++this.#version;this.#abort('stale');if (!this.#disposed && version===this.#version) this.#publish(this.#contextState(this.#capture()));return {ok:true};
  }
  cancel():AnalysisActionResult {
    const guard=this.#guard();if (guard) return guard;this.#sync();const version=++this.#version;this.#abort('cancelled');
    if (!this.#disposed && version===this.#version) this.#publish(Object.freeze({...this.#state!,status:'cancelled',requestId:null,result:null,error:null}));return {ok:true};
  }
  request(options:AnalysisRequestOptions={}):Promise<AnalysisCompletion> {
    const guard=this.#guard();if (guard) return Promise.resolve(guard);
    this.#sync();if (this.#disposed) return Promise.resolve(analysisFailure('disposed','Analysis session is disposed.'));
    let limits:AnalysisRequest['limits'];try {limits=analysisRequestLimits(options);} catch (error) {return Promise.resolve(error instanceof AnalysisError ? analysisFailure(error.reason,error.message) : analysisFailure('invalid-request','Invalid request options.'));}
    if (!this.#state!.context) return Promise.resolve(this.#state!.error!);
    if (this.#sequence>=Number.MAX_SAFE_INTEGER) return Promise.resolve(analysisFailure('limit','Analysis request identity limit reached.'));
    this.#abort('stale');this.#sync();if (this.#disposed) return Promise.resolve(analysisFailure('disposed','Analysis session is disposed.'));
    if (!this.#state!.context) return Promise.resolve(this.#state!.error!);
    const request:AnalysisRequest=Object.freeze({id:`analysis-${this.#sessionId}-${++this.#sequence}`,providerId:this.#provider!.id,context:this.#state!.context,limits});
    let settle!:(value:AnalysisCompletion) => void;const completion=new Promise<AnalysisCompletion>(resolve => {settle=resolve;});
    const pending:PendingAnalysis={owner:this,request,token:new AnalysisToken(),resolve:settle};this.#pending=pending;
    this.#publish(Object.freeze({...this.#state!,status:'loading',requestId:request.id,result:null,error:null}));
    if (this.#pending!==pending || this.#disposed) return completion;
    this.#working++;
    try {
      const work=this.#provider!.analyze(request,pending.token);
      // Capture only the detachable pending lease, not this session/record.
      Promise.resolve(work).then(value => {const owner=pending.owner;if (owner) owner.#receive(pending,value);},
        error => {const owner=pending.owner;if (owner) owner.#failed(pending,error);});
    } catch (error) {this.#failed(pending,error);} finally {this.#working--;}
    return completion;
  }
  #receive(pending:PendingAnalysis,value:unknown):void {
    if (this.#disposed || this.#pending!==pending) return;this.#sync();if (this.#pending!==pending) return;
    this.#finish(pending,normalizeAnalysisResult(pending.request!,value));
  }
  #failed(pending:PendingAnalysis,error:unknown):void {
    if (this.#disposed || this.#pending!==pending) return;this.#sync();if (this.#pending!==pending) return;
    this.#finish(pending,error instanceof AnalysisError ? analysisFailure(error.reason,error.message) : analysisFailure('provider','Analysis provider failed.'));
  }
  #finish(pending:PendingAnalysis,result:AnalysisCompletion):void {
    if (this.#pending!==pending) return;this.#pending=undefined;pending.owner=undefined;pending.request=undefined;pending.token.finish();
    this.#publish(Object.freeze({...this.#state!,status:result.ok ? 'ready' : 'error',result:result.ok ? result.result : null,error:result.ok ? null : result}));pending.resolve(result);
  }
  dispose():void {
    if (this.#disposed) return;this.#disposed=true;this.#version++;this.#unsubscribeSource?.();this.#unsubscribeSource=undefined;
    this.#listeners.clear();this.#queue=[];this.#abort('disposed');this.#controller=undefined;this.#provider=undefined;this.#settings={};this.#state=undefined;
  }
}

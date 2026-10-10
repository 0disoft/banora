import type {Color,MoveFailure,Point,Position,RulePolicy} from './core.js';
import type {RecordLocator} from './sgf.js';

export interface PuzzleHint {readonly text:string;readonly point?:Point}
export interface PuzzleNode {
  readonly id:string;
  /** Root omits move; all descendants supply a point or null for pass. */
  readonly move?:Point|null;
  readonly result?:'correct'|'incorrect';
  readonly feedback?:string;
  readonly hints?:readonly PuzzleHint[];
  readonly children?:readonly PuzzleNode[];
  /** Explicit child ID to play when the opponent is on turn at this node. */
  readonly response?:string;
}
export interface PuzzleDefinition {
  readonly schemaVersion:'banora.puzzle/v1';
  readonly id:string;
  readonly title:string;
  readonly prompt:string;
  readonly sgf:string;
  readonly initial?:RecordLocator;
  readonly rules?:Partial<RulePolicy>;
  readonly player?:Color;
  readonly tree:PuzzleNode;
}
export type PuzzleOutcome='continue'|'correct'|'incorrect'|'unlisted';
export interface PuzzleLineMove {
  readonly nodeId:string;
  readonly move:Point|null;
  readonly color:Color;
  readonly role:'solver'|'response';
}
export interface PuzzleAnswer {
  readonly move:Point|null;
  readonly color:Color;
  readonly outcome:PuzzleOutcome;
  readonly responses:readonly PuzzleLineMove[];
}
export interface PuzzleState {
  readonly id:string;
  readonly title:string;
  readonly prompt:string;
  readonly player:Color;
  readonly nodeId:string;
  readonly position:Position;
  readonly status:'active'|'correct'|'incorrect';
  readonly attempts:number;
  readonly feedback:string;
  readonly path:readonly string[];
  readonly line:readonly PuzzleLineMove[];
  readonly hints:readonly PuzzleHint[];
  readonly lastAnswer:PuzzleAnswer|null;
}
export type PuzzleEvent=
  | {readonly type:'answer';readonly answer:PuzzleAnswer;readonly state:PuzzleState}
  | {readonly type:'hint';readonly hint:PuzzleHint;readonly state:PuzzleState}
  | {readonly type:'restart';readonly state:PuzzleState};
export type PuzzleFailure=MoveFailure|'invalid-move'|'finished'|'no-hint'|'busy'|'disposed'|'limit';
export type PuzzleResult={readonly ok:true;readonly state:PuzzleState} | {readonly ok:false;readonly reason:PuzzleFailure};

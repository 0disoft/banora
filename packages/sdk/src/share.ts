import type { ControllerState } from './controller.js';
import { createSgfNode, parseSgf, pointToSgf, recordNodeAt, serializeSgf } from './sgf.js';
import type { RecordLocator, SgfRecord } from './sgf.js';

export type ShareKind = 'record' | 'node' | 'position';
export interface ShareOptions {
  readonly kind?: ShareKind;
  /** Position links omit comments unless explicitly included. */
  readonly includeComment?: boolean;
  readonly maxLength?: number;
}
export interface SharedRecord {
  readonly kind: ShareKind;
  readonly sgf: string;
  readonly record: SgfRecord;
  readonly locator: RecordLocator;
}
export type ShareFailure = 'invalid-url' | 'invalid-payload' | 'unsupported-version' | 'too-large' | 'invalid-record' | 'invalid-target';
export type ShareResult<T> = {readonly ok:true;readonly value:T} | {readonly ok:false;readonly reason:ShareFailure;readonly message:string};
export const MAX_SHARE_URL_LENGTH = 16_384;
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const reject=(reason:ShareFailure,message:string): ShareResult<never> => Object.freeze({ok:false,reason,message});

function maximum(input=MAX_SHARE_URL_LENGTH): number {
  if (!Number.isSafeInteger(input) || input<1 || input>MAX_SHARE_URL_LENGTH) throw new RangeError('Share length must be 1 through 16384 characters');
  return input;
}
function encode(bytes: Uint8Array): string {
  let result='';
  for (let offset=0;offset<bytes.length;offset+=3) {
    const a=bytes[offset]!,b=bytes[offset+1] ?? 0,c=bytes[offset+2] ?? 0;
    result+=alphabet[a>>2]+alphabet[((a&3)<<4)|(b>>4)]!;
    if (offset+1<bytes.length) result+=alphabet[((b&15)<<2)|(c>>6)];
    if (offset+2<bytes.length) result+=alphabet[c&63];
  }
  return result;
}
function decode(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(text) || text.length%4===1) throw new Error('Invalid base64url');
  const bytes=new Uint8Array(Math.floor(text.length*6/8));let bits=0,value=0,index=0;
  for (const letter of text) {value=(value<<6)|alphabet.indexOf(letter);bits+=6;if (bits>=8) {bits-=8;bytes[index++]=(value>>bits)&255;}}
  if (encode(bytes)!==text) throw new Error('Noncanonical base64url');
  return bytes;
}
function urlFor(text: string): URL {
  const url=new URL(text);
  if (!['https:','http:'].includes(url.protocol) || url.username || url.password) throw new Error('Use an HTTP or HTTPS page without URL credentials');
  return url;
}
function locatorFor(state: ControllerState): RecordLocator | null {
  let node=state.record.games[state.gameIndex];
  if (!node || state.path[0]!==node.id || state.path.at(-1)!==state.node.id) return null;
  const path:number[]=[];
  for (const id of state.path.slice(1)) {
    const index:number=node.children.findIndex(child => child.id===id);if (index<0) return null;
    path.push(index);node=node.children[index]!;
  }
  return Object.freeze({gameIndex:state.gameIndex,path:Object.freeze(path)});
}
function positionRecord(state: ControllerState, comment: boolean): SgfRecord {
  const {width,height,board,toPlay,moveNumber}=state.position;
  const properties:Record<string,readonly string[]>={FF:['4'],GM:['1'],CA:['UTF-8'],SZ:[width===height ? String(width) : `${width}:${height}`],PL:[toPlay==='white' ? 'W' : 'B'],MN:[String(moveNumber)]};
  for (const [color,key] of [['black','AB'],['white','AW']] as const) {
    const values=board.flatMap((stone,index) => stone===color ? [pointToSgf({x:index%width,y:Math.floor(index/width)})] : []);
    if (values.length) properties[key]=values;
  }
  for (const key of ['TR','SQ','CR','MA','LB','LN','AR','BPN']) if (state.node.properties[key]) properties[key]=state.node.properties[key]!;
  if (comment && state.node.properties.C) properties.C=state.node.properties.C;
  return Object.freeze({games:Object.freeze([createSgfNode('position',properties)])});
}

/** No uploads, clipboard access, navigation or export acknowledgment. */
export function createShareLink(state: ControllerState, baseUrl: string, options: ShareOptions = {}): ShareResult<string> {
  const max=maximum(options.maxLength),kind=options.kind ?? 'node';
  if (!['record','node','position'].includes(kind) || (options.includeComment!==undefined && typeof options.includeComment!=='boolean')) return reject('invalid-payload','Invalid share options');
  let url:URL;
  try {url=urlFor(baseUrl);url.search='';url.hash='';} catch {return reject('invalid-url','Share links require an absolute HTTP or HTTPS page without URL credentials');}
  const selected=locatorFor(state);if (!selected) return reject('invalid-target','Selected node is not in this record path');
  const locator=kind==='position' ? {gameIndex:0,path:[]} : kind==='record' ? {gameIndex:state.gameIndex,path:[]} : selected;
  let sgf:string;
  try {sgf=serializeSgf(kind==='position' ? positionRecord(state,options.includeComment===true) : state.record);}
  catch {return reject('invalid-record','Record cannot be serialized');}
  // Check before encoding; a UTF-8 JSON payload cannot be shorter than its SGF.
  if (sgf.length>max) return reject('too-large','Record is too large for a share URL; export SGF instead');
  const validated=parseSgf(sgf);if (!validated.ok) return reject('invalid-record','Record does not satisfy the supported SGF limits');
  url.hash=`banora=v1.${encode(new TextEncoder().encode(JSON.stringify({kind,sgf,game:locator.gameIndex,path:locator.path})))}`;
  const value=url.href;
  return value.length>max ? reject('too-large','Share URL exceeds the length limit; export SGF instead') : Object.freeze({ok:true,value});
}

/** Accept a complete URL or its fragment; never fetch a referenced page/record. */
export function decodeShareLink(input: string, options: {readonly maxLength?:number} = {}): ShareResult<SharedRecord> {
  const max=maximum(options.maxLength);
  if (typeof input!=='string') return reject('invalid-url','Expected a share URL or fragment');
  if (input.length>max) return reject('too-large','Share URL exceeds the length limit');
  let hash:string;
  try {hash=input.startsWith('#') ? input : urlFor(input).hash;} catch {return reject('invalid-url','Invalid share URL');}
  const match=/^#banora=(v\d+)\.(.*)$/.exec(hash);
  if (!match) return reject('invalid-payload','This URL does not contain a Banora share');
  if (match[1]!=='v1') return reject('unsupported-version','Unsupported Banora share version');
  let wire:Record<string,unknown>;
  try {
    const value:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decode(match[2]!)));
    if (!value || typeof value!=='object' || Array.isArray(value)) throw new Error('Invalid schema');
    wire=value as Record<string,unknown>;
    if (Object.keys(wire).sort().join(',')!=='game,kind,path,sgf' || !['record','node','position'].includes(wire.kind as string) || typeof wire.sgf!=='string' ||
      !Number.isSafeInteger(wire.game) || (wire.game as number)<0 || !Array.isArray(wire.path) || wire.path.length>50_000 ||
      wire.path.some(index => !Number.isSafeInteger(index) || index<0)) throw new Error('Invalid schema');
  } catch {return reject('invalid-payload','Share payload is malformed, noncanonical or not valid UTF-8');}
  const parsed=parseSgf(wire.sgf as string);if (!parsed.ok) return reject('invalid-record','Shared SGF is malformed or unsupported');
  const kind=wire.kind as ShareKind,locator=Object.freeze({gameIndex:wire.game as number,path:Object.freeze([...(wire.path as number[])])});
  if (!recordNodeAt(parsed.record,locator) || (kind==='record' && locator.path.length) ||
    (kind==='position' && (locator.gameIndex!==0 || locator.path.length || parsed.record.games.length!==1 || parsed.record.games[0]!.children.length || parsed.record.games[0]!.properties.B || parsed.record.games[0]!.properties.W))) {
    return reject('invalid-target','Share target does not match its record and kind');
  }
  return Object.freeze({ok:true,value:Object.freeze({kind,sgf:wire.sgf as string,record:parsed.record,locator})});
}

export interface StoneTexture {
  readonly dataUrl:string;
  readonly width:number;
  readonly height:number;
}
export interface StoneTextures {
  readonly black?:StoneTexture|null;
  readonly white?:StoneTexture|null;
}
export const STONE_TEXTURE_LIMITS=Object.freeze({bytes:2_097_152,dimension:512,sourceDimension:4096});
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const known=new WeakSet<object>();

function pngBytes(dataUrl:string): Uint8Array {
  const prefix='data:image/png;base64,';
  if (typeof dataUrl!=='string' || !dataUrl.startsWith(prefix) || dataUrl.length>prefix.length+Math.ceil(STONE_TEXTURE_LIMITS.bytes/3)*4) throw new RangeError('Texture must be an embedded PNG of at most 2 MiB');
  const text=dataUrl.slice(prefix.length);
  if (!text || text.length%4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text)) throw new RangeError('Invalid PNG base64');
  const body=text.replace(/=+$/,''),bytes=new Uint8Array(Math.floor(body.length*6/8));
  if (bytes.length>STONE_TEXTURE_LIMITS.bytes) throw new RangeError('PNG exceeds 2 MiB');
  let bits=0,value=0,index=0;
  for (const letter of body) {value=(value<<6)|alphabet.indexOf(letter);bits+=6;if (bits>=8) {bits-=8;bytes[index++]=(value>>bits)&255;}}
  if ((value&((1<<bits)-1))!==0) throw new RangeError('Noncanonical PNG base64');
  return bytes;
}

/** Checks the PNG container and dimensions, not its compressed pixel/CRC validity. */
export function pngDimensions(bytes:Uint8Array, maximum:number): {width:number;height:number} {
  const signature=[137,80,78,71,13,10,26,10];
  if (bytes.length<45 || signature.some((value,index) => bytes[index]!==value)) throw new RangeError('Invalid PNG signature');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let offset=8,width=0,height=0,image=false,finished=false;
  while (offset+12<=bytes.length) {
    const length=view.getUint32(offset),end=offset+12+length;
    if (end>bytes.length) throw new RangeError('Truncated PNG chunk');
    const key=String.fromCharCode(...bytes.subarray(offset+4,offset+8));
    if (offset===8 && (key!=='IHDR' || length!==13)) throw new RangeError('PNG must start with IHDR');
    if (key==='IHDR') {
      if (offset!==8) throw new RangeError('Duplicate PNG header');
      width=view.getUint32(offset+8);height=view.getUint32(offset+12);
      if (!width || !height || width>maximum || height>maximum) throw new RangeError(`PNG dimensions must be 1 through ${maximum}`);
    }
    if (key==='acTL' || key==='fcTL' || key==='fdAT') throw new RangeError('Use a static PNG texture');
    if (key==='IDAT') image=true;
    if (key==='IEND') {if (length!==0 || end!==bytes.length || !image) throw new RangeError('Invalid PNG end');finished=true;break;}
    offset=end;
  }
  if (!finished) throw new RangeError('PNG is incomplete');
  return {width,height};
}

/** Headless factory for a ready static PNG tile; prepareStoneTexture decodes user files. */
export function createStoneTexture(dataUrl:string): StoneTexture {
  const dimensions=pngDimensions(pngBytes(dataUrl),STONE_TEXTURE_LIMITS.dimension);
  const texture=Object.freeze({dataUrl,...dimensions});known.add(texture);return texture;
}
function textureFor(value:StoneTexture|null|undefined): StoneTexture|null {
  if (value==null) return null;
  if (typeof value!=='object' || Array.isArray(value)) throw new TypeError('Expected a StoneTexture or null');
  if (known.has(value)) return value;
  const texture=createStoneTexture(value.dataUrl);
  if (texture.width!==value.width || texture.height!==value.height) throw new RangeError('Texture dimensions do not match the PNG');
  return texture;
}
export function normalizeStoneTextures(input?:StoneTextures|null): Readonly<Required<StoneTextures>> {
  if (input!=null && (typeof input!=='object' || Array.isArray(input) || Object.keys(input).some(key => !['black','white'].includes(key)))) throw new TypeError('Stone textures must contain only black/white tiles');
  return Object.freeze({black:textureFor(input?.black),white:textureFor(input?.white)});
}

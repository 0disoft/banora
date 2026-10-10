import {prepareStoneTexture} from '@banora/sdk';
import type {Color,StoneTexture,StoneTextures} from '@banora/sdk';
import './texture-controls.css';

function demoBlob(color:Color): Promise<Blob> {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
  const context=canvas.getContext('2d')!;
  const fill=context.createRadialGradient(30,24,2,50,50,65);
  fill.addColorStop(0,color==='black' ? '#515b58' : '#fffdf4');
  fill.addColorStop(1,color==='black' ? '#0c1515' : '#d4c3a5');
  context.fillStyle=fill;context.fillRect(0,0,96,96);
  context.strokeStyle=color==='black' ? '#d7c18d35' : '#98784835';context.lineWidth=0.8;
  for (let y=8;y<96;y+=8) {context.beginPath();context.moveTo(0,y);context.bezierCurveTo(24,y-8,60,y+8,96,y-2);context.stroke();}
  return new Promise((resolve,reject) => canvas.toBlob(blob => {canvas.width=canvas.height=0;if (blob) resolve(blob);else reject(new Error('Could not create the demo tile'));},'image/png'));
}

/** Example file UI; native hosts forward the prepared values as adapter props. */
export function mountTextureControls(host:HTMLElement, options:{
  readonly initial?:StoneTextures|null;
  readonly onChange:(color:Color, texture:StoneTexture|null) => void;
}): () => void {
  const abort=new AbortController(),pending:Partial<Record<Color,AbortController>>={};
  const current={black:options.initial?.black ?? null,white:options.initial?.white ?? null};
  const panel=document.createElement('section');panel.className='texture-controls';
  const title=document.createElement('h2');title.textContent='Stone textures';panel.append(title);
  const note=document.createElement('p');note.textContent='Choose a PNG, JPEG or WebP up to 2 MiB. Images are center-cropped. Textures stay local and are not included in SGF or share links.';panel.append(note);
  for (const color of ['black','white'] as const) {
    const row=document.createElement('fieldset');row.dataset.textureControl=color;
    const legend=document.createElement('legend');legend.textContent=`${color==='black' ? 'Black' : 'White'} stones`;
    const label=document.createElement('label');label.textContent='Choose an image ';
    const input=document.createElement('input');input.type='file';input.accept='image/png,image/jpeg,image/webp';input.dataset.textureFile=color;label.append(input);
    const demo=document.createElement('button');demo.type='button';demo.textContent='Use demo tile';demo.dataset.textureDemo=color;
    const reset=document.createElement('button');reset.type='button';reset.textContent='Use default';reset.dataset.textureReset=color;reset.disabled=!current[color];
    const status=document.createElement('p');status.dataset.textureStatus=color;status.setAttribute('role','status');status.textContent=current[color] ? 'Custom texture active.' : 'Default stone color.';
    async function load(source:Blob|Promise<Blob>): Promise<void> {
      pending[color]?.abort();const operation=new AbortController();pending[color]=operation;
      status.textContent='Preparing texture…';
      try {
        const blob=await source;if (operation.signal.aborted || abort.signal.aborted) return;
        const texture=await prepareStoneTexture(blob,{signal:operation.signal});
        if (operation.signal.aborted || abort.signal.aborted || pending[color]!==operation) return;
        options.onChange(color,texture);current[color]=texture;reset.disabled=false;status.textContent='Custom texture active. SGF edits are unchanged.';
      } catch (error) {if (!operation.signal.aborted && !abort.signal.aborted) status.textContent=`Texture unchanged: ${String(error)}`;}
      finally {if (pending[color]===operation) delete pending[color];}
    }
    input.addEventListener('change',() => {const file=input.files?.[0];input.value='';if (file) void load(file);},{signal:abort.signal});
    demo.addEventListener('click',() => {void load(demoBlob(color));},{signal:abort.signal});
    reset.addEventListener('click',() => {
      pending[color]?.abort();delete pending[color];options.onChange(color,null);current[color]=null;reset.disabled=true;status.textContent='Default stone color.';
    },{signal:abort.signal});
    row.append(legend,label,demo,reset,status);panel.append(row);
  }
  host.append(panel);
  const dispose=() => {abort.abort();pending.black?.abort();pending.white?.abort();panel.remove();};
  window.addEventListener('pagehide',event => {if (!event.persisted) dispose();},{signal:abort.signal});
  return dispose;
}

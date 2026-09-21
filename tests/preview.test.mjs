import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Worker} from 'node:worker_threads';
import {packPreview} from '../dist/preview-data.mjs';
import {makeMap,toTmx} from '../dist/map.mjs';
import {defaults} from '../dist/core.mjs';
const base=JSON.parse(fs.readFileSync('dist/assets/farm.json'));

test('compact preview preserves visible tiles, layer order and first animation frames',()=>{
 const config=defaults(160,130);config.Positions.Shrine={X:20,Y:7};
 const map=makeMap(base,config),packed=packPreview(map),layers=map.layers.filter(l=>l.id!=='Paths');
 assert.deepEqual(packed.layers.map(l=>l.id),layers.map(l=>l.id));
 for(let l=0;l<layers.length;l++)for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){
  const tile=layers[l].tiles[y][x],frame=tile?.frames?.[0]||tile;
  assert.deepEqual(packed.palette[packed.layers[l].cells[y*map.width+x]],frame?{sheet:frame.sheet,index:frame.index}:null);
 }
 assert.ok(packed.palette.length<1000,'tile references deduplicate');
});

test('worker transfers previews, recovers from invalid moves and exports the current full map',async()=>{
 const moduleURL=new URL('../dist/map-worker.mjs',import.meta.url).href;
 const code=`import {parentPort} from 'node:worker_threads';globalThis.self={postMessage:(...args)=>parentPort.postMessage(...args)};await import(${JSON.stringify(moduleURL)});parentPort.on('message',data=>self.onmessage({data}));`;
 const worker=new Worker(new URL('data:text/javascript,'+encodeURIComponent(code)));let serial=0;
 const call=(kind,args={})=>new Promise((resolve,reject)=>{const id=++serial;worker.once('message',data=>data.error?reject(Error(data.error)):resolve(data.result));worker.postMessage({id,kind,...args});});
 try{
  await call('init',{base});const config=defaults(160,130);
  const preview=await call('generate',{config});assert.equal(preview.width,160);assert.ok(preview.layers[0].cells instanceof Uint16Array);
  const bad=structuredClone(config);bad.Positions.Cave={X:0,Y:0};await assert.rejects(call('generate',{config:bad}));
  config.Positions.Shrine={X:20,Y:7};await call('generate',{config});
  const blob=await call('export',{config});assert.equal(await blob.text(),toTmx(makeMap(base,config)));
  const restored=await call('generate',{config:defaults(80,65)});assert.equal(restored.layers[0].cells.length,80*65);
 }finally{await worker.terminate();}
});

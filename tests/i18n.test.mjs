import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Worker} from 'node:worker_threads';
import {LOCALES,DEFAULT_LOCALE,messageKeys,setLocale,getLocale,detectLocale,t} from '../dist/i18n.mjs';
import {FEATURES,defaults,validate} from '../dist/core.mjs';
import {makeMap,toTmx} from '../dist/map.mjs';
const base=JSON.parse(fs.readFileSync(new URL('../dist/assets/farm.json',import.meta.url)));
const placeholders=text=>[...text.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();

test('every locale has the same keys, no blanks and matching placeholders',()=>{
 const ids=LOCALES.map(l=>l.id),keys=messageKeys(ids[0]).sort();
 assert.ok(keys.length>80);
 for(const id of ids)assert.deepEqual(messageKeys(id).sort(),keys,id);
 try{
  for(const id of ids){setLocale(id);for(const key of keys){assert.ok(t(key).trim(),`${id} ${key}`);assert.notEqual(t(key),key,`${id} ${key}`);}}
  setLocale('en');const english=Object.fromEntries(keys.map(k=>[k,placeholders(t(k))]));
  setLocale('zh-CN');for(const k of keys)assert.deepEqual(placeholders(t(k)),english[k],k);
  for(const f of FEATURES)for(const suffix of ['name','note'])assert.ok(keys.includes(`feature.${f.id}.${suffix}`),f.id);
  assert.equal(t('missing.key'),'missing.key');
  assert.equal(t('validate.overlap',{a:'A'}),'A与{b}的设施组重叠。');
 }finally{setLocale(DEFAULT_LOCALE);}
});

test('locale detection prefers Chinese, then English, and falls back to English',()=>{
 assert.equal(detectLocale(['zh-TW','en-US']),'zh-CN');
 assert.equal(detectLocale(['en-GB']),'en');
 assert.equal(detectLocale(['ja','de']),'en');
 assert.equal(detectLocale([]),'en');
 assert.equal(setLocale('fr'),DEFAULT_LOCALE);
 assert.equal(getLocale(),DEFAULT_LOCALE);
});

test('landmark names, validation and map errors follow the active locale',()=>{
 try{
  setLocale('en');
  assert.equal(FEATURES.find(f=>f.id==='Shrine').name,'Grandpa’s shrine');
  assert.match(validate(defaults(4096,4097))[0],/Total map area/);
  const blocked=defaults();blocked.Positions.Cave={X:126,Y:5};
  assert.throws(()=>makeMap(base,blocked),/Farm cave covers water, trees or impassable terrain at \(\d+, \d+\)\./);
  const pond=defaults();pond.Positions.Bus.Y=30;
  assert.throws(()=>makeMap(base,pond),/Bus stop exit cannot cover water/);
  setLocale('zh-CN');
  assert.equal(FEATURES.find(f=>f.id==='Shrine').name,'爷爷的神龛');
  assert.throws(()=>makeMap(base,pond),/巴士站出口不能覆盖水面/);
 }finally{setLocale(DEFAULT_LOCALE);}
});

test('the worker reports errors in the locale sent with each request',async()=>{
 const moduleURL=new URL('../dist/map-worker.mjs',import.meta.url).href;
 const code=`import {parentPort} from 'node:worker_threads';globalThis.self={postMessage:(...args)=>parentPort.postMessage(...args)};await import(${JSON.stringify(moduleURL)});parentPort.on('message',data=>self.onmessage({data}));`;
 const worker=new Worker(new URL('data:text/javascript,'+encodeURIComponent(code)));let serial=0;
 const call=(kind,args={})=>new Promise((resolve,reject)=>{const id=++serial;worker.once('message',data=>data.error?reject(Error(data.error)):resolve(data.result));worker.postMessage({id,kind,...args});});
 try{
  await assert.rejects(call('generate',{config:defaults(),locale:'en'}),/not loaded yet/);
  await call('init',{base});
  const bad=defaults();bad.Positions.Cave={X:0,Y:0};
  await assert.rejects(call('generate',{config:bad,locale:'en'}),/Farm cave extends beyond the map/);
  await assert.rejects(call('generate',{config:bad,locale:'zh-CN'}),/农场洞穴的设施组超出地图边界/);
 }finally{await worker.terminate();}
});

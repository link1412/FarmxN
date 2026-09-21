import {makeMap,connectivity,toTmx} from './map.mjs';
import {packPreview} from './preview-data.mjs';
import {setLocale,t} from './i18n.mjs';
let base,lastMap,lastKey;
self.onmessage=({data:{id,kind,config,base:source,locale}})=>{
 try {
  // Errors are built inside the worker, so it follows the page's language.
  if(locale)setLocale(locale);
  if(kind==='init'){base=source;lastMap=null;lastKey=null;self.postMessage({id,result:true});return;}
  if(!base)throw Error(t('worker.noBase'));
  const key=JSON.stringify(config);
  if(key!==lastKey){const next=makeMap(base,config),errors=connectivity(next,config);if(errors.length)throw Error(errors[0]);lastMap=next;lastKey=key;}
  if(kind==='export'){const blob=new Blob([toTmx(lastMap)],{type:'application/xml'});self.postMessage({id,result:blob});return;}
  const result=packPreview(lastMap);
  self.postMessage({id,result},result.layers.map(l=>l.cells.buffer));
 }catch(error){self.postMessage({id,error:error.message});}
};

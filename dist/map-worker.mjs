import {makeMap,connectivity,tmxChunks} from './map.mjs';
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
  if(kind==='export'){
   // Batch row strings into Blobs as they are produced, so the whole text never sits in memory at once.
   const blobs=[];let batch=[],size=0;
   for(const chunk of tmxChunks(lastMap)){batch.push(chunk);size+=chunk.length;if(size>=(8<<20)){blobs.push(new Blob(batch));batch=[];size=0;}}
   if(batch.length)blobs.push(new Blob(batch));
   self.postMessage({id,result:new Blob(blobs,{type:'application/xml'})});return;
  }
  const result=packPreview(lastMap);
  self.postMessage({id,result},result.layers.map(l=>l.cells.buffer));
 }catch(error){self.postMessage({id,error:error.message});}
};

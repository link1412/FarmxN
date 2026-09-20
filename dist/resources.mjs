const inline=document.getElementById('farm-assets');
let assets;
function embedded(){return assets??=(inline?JSON.parse(inline.textContent):null);}
export async function loadBase(){
 const source=embedded();
 if(source?.farmGzip){
  const bytes=Uint8Array.from(atob(source.farmGzip),c=>c.charCodeAt(0));
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
 }
 if(source?.farm)return source.farm;
 const response=await fetch('assets/farm.json');if(!response.ok)throw Error('地图资源下载失败');return response.json();
}
// Do not initialise a hidden editor until it is visible. The same path is used
// from file:// and HTTP; no additional resources are needed by the built HTML.
export function whenVisible(element){
 if(typeof IntersectionObserver==='undefined')return Promise.resolve();
 return new Promise(resolve=>{const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();resolve();}});observer.observe(element);});
}
const pendingImages=new Map();
export function loadImage(name){
 if(!pendingImages.has(name))pendingImages.set(name,(async()=>{
  const img=new Image();img.src=embedded()?.images[name]||`assets/${encodeURIComponent(name)}.png`;await img.decode();return img;
 })().catch(error=>{pendingImages.delete(name);throw error;}));
 return pendingImages.get(name);
}
export function createMapWorker(){
 const script=document.getElementById('farm-worker');
 const url=script?URL.createObjectURL(new Blob([script.textContent],{type:'text/javascript'})):new URL('./map-worker.mjs',import.meta.url);
 const worker=new Worker(url,{type:'module'});if(script)URL.revokeObjectURL(url);
 let serial=0,failed=false;const pending=new Map();
 worker.onmessage=({data})=>{const request=pending.get(data.id);if(!request)return;pending.delete(data.id);data.error?request.reject(Error(data.error)):request.resolve(data.result);};
 worker.onerror=()=>{failed=true;for(const r of pending.values())r.reject(Error('后台地图计算失败，请刷新后重试或降低性能档位。'));pending.clear();};
 return {call(kind,args={}){if(failed)return Promise.reject(Error('后台地图计算不可用，请刷新重试。'));return new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});worker.postMessage({id,kind,...args});});}};
}

// Raster chunks are built only for the visible viewport, with a per-frame time
// budget and an LRU memory cap. Panning/zooming reuses these surfaces.
import {loadImage} from './resources.mjs';
export const CHUNK_TILES=32, CACHE_BYTES=32*1024*1024;
export function visibleTiles(width,height,zoom,offset,w,h){return {left:Math.max(0,Math.floor(-offset.x/zoom/16)),top:Math.max(0,Math.floor(-offset.y/zoom/16)),right:Math.min(width,Math.ceil((w-offset.x)/zoom/16)),bottom:Math.min(height,Math.ceil((h-offset.y)/zoom/16))};}
export function detailPixels(zoom){return Math.min(16,Math.max(1,2**Math.ceil(Math.log2(zoom*16))));}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
export class MapRenderer {
 constructor(redraw){this.redraw=redraw;this.cache=new Map();this.bytes=0;this.atlases=new Map();this.stats={chunksBuilt:0,cacheHits:0};}
 async setMap(map){
  this.map=map;this.cache.clear();this.bytes=0;this.atlases.clear();
  const names=[...new Set(map.palette.slice(1).map(t=>map.sheets.find(s=>s.id===t.sheet).image.split('/').pop()))];
  const images=Object.fromEntries(await Promise.all(names.map(async name=>[name,await loadImage(name)])));
  this.sources=map.palette.map(t=>{if(!t)return null;const s=map.sheets.find(s=>s.id===t.sheet);return {img:images[s.image.split('/').pop()],sx:t.index%s.width*16,sy:Math.floor(t.index/s.width)*16};});
  await this.makeOverview();
 }
 atlas(pixels){
  if(this.atlases.has(pixels))return this.atlases.get(pixels);
  const canvas=document.createElement('canvas');canvas.width=32*pixels;canvas.height=Math.ceil(this.sources.length/32)*pixels;
  const ctx=canvas.getContext('2d',{willReadFrequently:pixels===1});ctx.imageSmoothingEnabled=pixels<16;
  this.sources.forEach((s,i)=>{if(s)ctx.drawImage(s.img,s.sx,s.sy,16,16,i%32*pixels,Math.floor(i/32)*pixels,pixels,pixels);});
  const result={canvas,colors:pixels===1?ctx.getImageData(0,0,canvas.width,canvas.height).data:null};this.atlases.set(pixels,result);return result;
 }
 async makeOverview(){
  const m=this.map,canvas=document.createElement('canvas');
  const scale=Math.min(1,2048/(m.width*16),2048/(m.height*16),Math.sqrt(4194304/(m.width*m.height*256)));
  canvas.width=Math.max(1,Math.ceil(m.width*16*scale));canvas.height=Math.max(1,Math.ceil(m.height*16*scale));canvas.mapScale=scale;
  const ctx=canvas.getContext('2d');
  if(scale<=1/16){
   const colors=this.atlas(1).colors,out=ctx.createImageData(canvas.width,canvas.height),data=out.data;
   for(let y=0;y<canvas.height;y++){
    const sy=Math.min(m.height-1,Math.floor((y+.5)*m.height/canvas.height));
    for(let x=0;x<canvas.width;x++){
     const sx=Math.min(m.width-1,Math.floor((x+.5)*m.width/canvas.width)),index=sy*m.width+sx,d=(y*canvas.width+x)*4;
     for(const layer of m.layers){const id=layer.cells[index];if(!id)continue;const s=id*4,a=colors[s+3]/255,old=data[d+3]/255,alpha=a+old*(1-a);if(!alpha)continue;for(let c=0;c<3;c++)data[d+c]=(colors[s+c]*a+data[d+c]*old*(1-a))/alpha;data[d+3]=alpha*255;}
    }
    if(y%64===63)await tick();
   }
   ctx.putImageData(out,0,0);
  }else{
   ctx.scale(scale,scale);ctx.imageSmoothingEnabled=scale<1;
   for(let y=0;y<m.height;y++){
    for(const layer of m.layers)for(let x=0;x<m.width;x++){const s=this.sources[layer.cells[y*m.width+x]];if(s)ctx.drawImage(s.img,s.sx,s.sy,16,16,x*16,y*16,16,16);}
    if(y%32===31)await tick();
   }
  }
  this.overview=canvas;
 }
 capture(r){
  const canvas=document.createElement('canvas');canvas.width=r.w*16;canvas.height=r.h*16;const ctx=canvas.getContext('2d'),m=this.map;
  for(const layer of m.layers)for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++){const s=this.sources[layer.cells[(r.y+y)*m.width+r.x+x]];if(s)ctx.drawImage(s.img,s.sx,s.sy,16,16,x*16,y*16,16,16);}
  return canvas;
 }
 buildChunk(cx,cy,pixels){
  const m=this.map,atlas=this.atlas(pixels).canvas,canvas=document.createElement('canvas');canvas.width=canvas.height=CHUNK_TILES*pixels;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  for(const layer of m.layers)for(let y=0;y<CHUNK_TILES;y++){const my=cy*CHUNK_TILES+y;if(my>=m.height)break;for(let x=0;x<CHUNK_TILES;x++){const mx=cx*CHUNK_TILES+x;if(mx>=m.width)break;const id=layer.cells[my*m.width+mx];if(id)ctx.drawImage(atlas,id%32*pixels,Math.floor(id/32)*pixels,pixels,pixels,x*pixels,y*pixels,pixels,pixels);}}
  this.stats.chunksBuilt++;return canvas;
 }
 draw(ctx,zoom,offset,w,h){
  const m=this.map,overview=this.overview;if(!m||!overview)return;
  ctx.imageSmoothingEnabled=false;ctx.drawImage(overview,0,0,m.width*16,m.height*16);
  if(zoom<=overview.mapScale)return;
  const v=visibleTiles(m.width,m.height,zoom,offset,w,h),jobs=[];
  let pixels=detailPixels(zoom);
  const visibleChunks=Math.max(0,Math.ceil(v.right/CHUNK_TILES)-Math.floor(v.left/CHUNK_TILES))*Math.max(0,Math.ceil(v.bottom/CHUNK_TILES)-Math.floor(v.top/CHUNK_TILES));
  // Keep the entire visible set within the cache even on very large monitors.
  while(pixels>1&&visibleChunks*(CHUNK_TILES*pixels)**2*4>CACHE_BYTES*.75)pixels/=2;
  const paint=(chunk,cx,cy)=>{const x=cx*CHUNK_TILES*16,y=cy*CHUNK_TILES*16,size=CHUNK_TILES*16;ctx.clearRect(x,y,size,size);ctx.drawImage(chunk,x,y,size,size);};
  for(let cy=Math.floor(v.top/CHUNK_TILES);cy<Math.ceil(v.bottom/CHUNK_TILES);cy++)for(let cx=Math.floor(v.left/CHUNK_TILES);cx<Math.ceil(v.right/CHUNK_TILES);cx++){
   const key=`${pixels}/${cx}/${cy}`,cached=this.cache.get(key);if(cached){this.cache.delete(key);this.cache.set(key,cached);this.stats.cacheHits++;paint(cached,cx,cy);}else jobs.push({key,cx,cy});
  }
  const deadline=performance.now()+6;
  for(const job of jobs){if(performance.now()>deadline)break;const chunk=this.buildChunk(job.cx,job.cy,pixels);this.cache.set(job.key,chunk);this.bytes+=chunk.width*chunk.height*4;paint(chunk,job.cx,job.cy);}
  while(this.bytes>CACHE_BYTES&&this.cache.size){const key=this.cache.keys().next().value,c=this.cache.get(key);this.bytes-=c.width*c.height*4;this.cache.delete(key);}
  if(jobs.length)this.redraw();
 }
}

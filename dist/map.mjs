import {FEATURES,CUT,transform,rect,parts,spouseArea,validate,defaults} from './core.mjs';
import {t as msg} from './i18n.mjs';
import {expandPerimeter,relocateExits} from './perimeter.mjs';
import {restoreShrine,placeShrine,shrineOnNorthBank} from './shrine.mjs';
import {restoreCave,placeCave,isNorthCliff} from './cave.mjs';
const clone=t=>t?structuredClone(t):null;
export function props(map,t){return t?{...map.sheets.find(s=>s.id===t.sheet)?.tileProperties[t.index],...t.properties}:{};}
export function layer(map,id){return map.layers.find(l=>l.id===id);}
export function isPassable(map,x,y){if(x<0||y<0||x>=map.width||y>=map.height)return false;const b=layer(map,'Back').tiles[y][x],wall=layer(map,'Buildings').tiles[y][x];return !!b&&!props(map,b).Water&&(!wall||props(map,wall).Passable!=null);}
export function makeMap(base,c){
 const errors=validate(c);if(errors.length)throw Error(errors[0]);
 const dx=c.Width-80,dy=c.Height-65;
 const groundTiles=base.layers.find(a=>a.id==='Back').tiles;
 // Repeated terrain is immutable; share its templates instead of cloning millions of identical tiles.
 const terrainCache=new Map(),terrain=t=>{if(!terrainCache.has(t))terrainCache.set(t,clone(t));return terrainCache.get(t);};
 // Rows and columns outside the two inserts copy the base map; the inserts are meadow on Back and
 // empty on every other layer. Filling whole rows keeps a 4096 × 4096 map to a few seconds.
 const generated={...base,width:c.Width,height:c.Height,properties:{...base.properties},layers:base.layers.map(l=>{
  const isBack=l.id==='Back';
  return {...l,tiles:Array.from({length:c.Height},(_,y)=>{
   const row=new Array(c.Width).fill(null),vertical=y>=CUT.y&&y<CUT.y+dy,sy=y<CUT.y?y:y-dy;
   if(!vertical){for(let x=0;x<CUT.x;x++)row[x]=clone(l.tiles[sy][x]);for(let x=CUT.x+dx;x<c.Width;x++)row[x]=clone(l.tiles[sy][x-dx]);}
   if(isBack)for(let x=vertical?0:CUT.x,end=vertical?c.Width:CUT.x+dx;x<end;x++)row[x]=terrain(groundTiles[25+(x+y)%3][40+(x*3+y)%3]);
   return row;
  })};
 })};
 expandPerimeter(base,generated);
 const spouse=spouseArea(c),fixedPatio=generated.layers.map(l=>Array.from({length:spouse.h},(_,y)=>l.tiles[spouse.y+y].slice(spouse.x,spouse.x+spouse.w).map(clone)));
 const initial=defaults(c.Width,c.Height),stamps=[],exits=[];let cave=null,shrine=null;
 const ground=base.layers.find(l=>l.id==='Back').tiles[30][40];
 function capture(f,src,dst,kind=f.id){const cells=generated.layers.map(l=>Array.from({length:src.h},(_,y)=>Array.from({length:src.w},(_,x)=>clone(l.tiles[src.y+y][src.x+x]))));stamps.push({f,src,dst,cells,kind});}
 for(const f of FEATURES){const p=c.Positions[f.id],q=initial.Positions[f.id];if(p.X===q.X&&p.Y===q.Y)continue;
  if(f.edge){exits.push({id:f.id,src:rect(f,initial),dst:rect(f,c)});continue;}
  if(f.id==='Shrine'){shrine={src:rect(f,initial),dst:rect(f,c)};continue;}
  if(f.id==='Cave'){cave={src:rect(f,initial),dst:rect(f,c)};continue;}
  if(f.stamp||f.id==='Greenhouse')capture(f,rect(f,initial),rect(f,c));
 }
 // Capture every group before clearing sources so swapping groups never loses data.
 for(const {f,src,kind}of stamps)for(let y=0;y<src.h;y++)for(let x=0;x<src.w;x++)for(let i=0;i<generated.layers.length;i++){
  const l=generated.layers[i];let replacement=null;
  if(l.id==='Back')replacement=ground;
  l.tiles[src.y+y][src.x+x]=clone(replacement);
 }
 if(shrine)restoreShrine(base,generated);
 if(cave)restoreCave(base,generated,cave.src);
 relocateExits(base,generated,exits);
 // Validate destination terrain after source patches are removed, before placing them.
 for(const f of FEATURES){const p=c.Positions[f.id],q=initial.Positions[f.id];if(p.X===q.X&&p.Y===q.Y||f.edge)continue;
  if(f.id==='Shrine'&&shrineOnNorthBank(generated,rect(f,c)))continue;
  if(f.id==='Cave'){if(!isNorthCliff(generated,p.X))throw Error(msg('map.caveCliff',{name:f.name}));continue;}
  for(const r of parts(f,c))for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++){
   if(!isPassable(generated,x,y))throw Error(msg('map.blockedTerrain',{name:f.name,x,y}));
  }
 }
 for(const {dst,cells}of stamps)for(let i=0;i<generated.layers.length;i++)for(let y=0;y<dst.h;y++)for(let x=0;x<dst.w;x++)generated.layers[i].tiles[dst.y+y][dst.x+x]=cells[i][y][x];
 if(shrine)placeShrine(base,generated,shrine.dst);
 if(cave)placeCave(base,generated,cave.dst);
 const p=c.Positions,fmt=(q,ox=0,oy=0)=>`${q.X+ox} ${q.Y+oy}`;
 Object.assign(generated.properties,{
  GreenhouseLocation:fmt(p.Greenhouse),FarmHouseEntry:fmt(p.Farmhouse,5,3),MailboxLocation:fmt(p.Farmhouse,9,4),SpouseAreaLocation:`${spouse.x} ${spouse.y}`,
  ShippingBinLocation:fmt(p['Shipping Bin']),PetBowlLocation:fmt(p['Pet Bowl']),FarmCaveEntry:fmt(p.Cave,0,1),GrandpaShrineLocation:fmt(p.Shrine),
  BusStopEntry:fmt(p.Bus),ForestEntry:fmt(p.Forest),BackwoodsEntry:fmt(p.Backwoods),
  'FarmN/Schema':'2','FarmN/Width':String(c.Width),'FarmN/Height':String(c.Height)
 });
 const warps=base.properties.Warp.split(/\s+/),out=[];
 for(let i=0;i<warps.length;i+=5){let [x,y,dest,tx,ty]=warps.slice(i,i+5);x=Number(x);y=Number(y);const id={FarmCave:'Cave',BusStop:'Bus',Forest:'Forest',Backwoods:'Backwoods'}[dest];if(id){const f=FEATURES.find(f=>f.id===id),q=p[id];x=q.X+x-f.x;y=q.Y+y-f.y;}else{const q=transform(x,y,c);x=q.X;y=q.Y;}out.push(x,y,dest,tx,ty);}
 generated.properties.Warp=out.join(' ');
 for(const f of FEATURES.filter(f=>f.building)){const q=p[f.id];for(const r of parts(f,c))for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++){const origin=initial.Positions[f.id];if(q.X!==origin.X||q.Y!==origin.Y)layer(generated,'Paths').tiles[y][x]=null;}}
 // Keep a walkable door apron for all buildings. Runtime objects are never silently removed.
 for(const f of FEATURES.filter(f=>f.building)){const q=p[f.id],span=f.id==='Greenhouse'?{x:2,y:6,w:3,h:2}:f.id==='Farmhouse'?{x:5,y:3,w:1,h:3}:{x:0,y:f.id==='Pet Bowl'?2:1,w:2,h:1};
  for(let yy=0;yy<span.h;yy++)for(let xx=0;xx<span.w;xx++){const x=q.X+span.x+xx,y=q.Y+span.y+yy;if(!isPassable(generated,x,y))throw Error(msg('map.entranceBlocked',{name:f.name}));}
 }
 for(let i=0;i<generated.layers.length;i++)for(let y=0;y<spouse.h;y++)for(let x=0;x<spouse.w;x++)if(JSON.stringify(generated.layers[i].tiles[spouse.y+y][spouse.x+x])!==JSON.stringify(fixedPatio[i][y][x]))throw Error(msg('map.spouseArea'));
 return generated;
}
export function connectivity(map,c){
 const w=map.width,h=map.height,back=layer(map,'Back').tiles,walls=layer(map,'Buildings').tiles;
 const tileFlags=new WeakMap();
 const flags=t=>{if(!t)return 0;if(!tileFlags.has(t)){const p=props(map,t);tileFlags.set(t,(p.Water?1:0)|(p.Passable!=null?2:0));}return tileFlags.get(t);};
 const buildings=FEATURES.filter(f=>f.building).map(f=>{const q=c.Positions[f.id],size={'Farmhouse':[9,5],'Greenhouse':[7,6],'Shipping Bin':[2,1],'Pet Bowl':[2,2]}[f.id];return {x:q.X,y:q.Y,w:size[0],h:size[1]};});
 const p=c.Positions,start={x:p.Farmhouse.X+5,y:p.Farmhouse.Y+5},queue=new Uint32Array(w*h),seen=new Uint8Array(w*h);
 if(!isPassable(map,start.x,start.y))return [msg('connectivity.doorBlocked')];
 let tail=1;queue[0]=start.y*w+start.x;seen[queue[0]]=1;
 const visit=(x,y)=>{if(x<0||y<0||x>=w||y>=h)return;const index=y*w+x;if(seen[index])return;seen[index]=2;
  const b=back[y][x],wall=walls[y][x];if(!b||(flags(b)&1)||(wall&&!(flags(wall)&2))||buildings.some(r=>x>=r.x&&y>=r.y&&x<r.x+r.w&&y<r.y+r.h))return;
  seen[index]=1;queue[tail++]=index;
 };
 for(let head=0;head<tail;head++){const index=queue[head],x=index%w,y=Math.floor(index/w);visit(x+1,y);visit(x-1,y);visit(x,y+1);visit(x,y-1);}
 const targets=[['target.Cave',p.Cave.X,p.Cave.Y+1],['target.Greenhouse',p.Greenhouse.X+3,p.Greenhouse.Y+6],['target.Bus',p.Bus.X,p.Bus.Y],['target.Forest',p.Forest.X,p.Forest.Y],['target.Backwoods',p.Backwoods.X,p.Backwoods.Y],['target.Shrine',p.Shrine.X,p.Shrine.Y+1]];
 if(c.Width>80)targets.push(['target.horizontal',50+Math.floor((c.Width-80)/2),25]);if(c.Height>65)targets.push(['target.vertical',45,35+Math.floor((c.Height-65)/2)]);
 return targets.filter(([n,x,y])=>seen[y*map.width+x]!==1).map(([n])=>msg('connectivity.unreachable',{name:msg(n)}));
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const xmlProps=p=>Object.keys(p||{}).length?`<properties>${Object.entries(p).map(([k,v])=>`<property name="${esc(k)}" type="string" value="${esc(v)}"/>`).join('')}</properties>`:'';
// The TMX is produced as a sequence of strings (one per CSV row) so a 4096 × 4096 map never has
// to exist as one 240 MB string. toTmx joins them for tools and tests.
export function* tmxChunks(map){
 let gid=1,objectId=1;const starts={},animations={};for(const s of map.sheets){starts[s.id]=gid;gid+=s.width*s.height;}
 for(const l of map.layers)for(const row of l.tiles)for(const t of row)if(t?.frames){const key=t.sheet+':'+t.index;const frames=JSON.stringify(t.frames);if(animations[key]&&animations[key].frames!==frames)throw Error(msg('tmx.animationConflict'));animations[key]={frames,interval:t.interval};}
 const sheets=map.sheets.map(s=>{const ids=new Set(Object.keys(s.tileProperties));for(const k of Object.keys(animations))if(k.startsWith(s.id+':'))ids.add(k.slice(s.id.length+1));return `<tileset firstgid="${starts[s.id]}" name="${esc(s.id)}" tilewidth="16" tileheight="16" tilecount="${s.width*s.height}" columns="${s.width}">${xmlProps(Object.fromEntries(Object.entries(s.properties||{}).filter(([k])=>!k.startsWith('@TileIndex@'))))}<image source="${esc(s.image)}" width="${s.width*16}" height="${s.height*16}"/>${[...ids].map(id=>{const anim=animations[s.id+':'+id];return `<tile id="${id}">${xmlProps(s.tileProperties[id]||{})}${anim?`<animation>${JSON.parse(anim.frames).map(f=>{if(f.sheet!==s.id)throw Error(msg('tmx.crossSheetAnimation'));return `<frame tileid="${f.index}" duration="${anim.interval}"/>`;}).join('')}</animation>`:''}</tile>`;}).join('')}</tileset>`;}).join('\n');
 let id=1;const layerIds=map.layers.map(()=>id++);
 const objects=map.layers.map(l=>{const rows=[];for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){const t=l.tiles[y][x];if(t&&Object.keys(t.properties||{}).length)rows.push(`<object id="${objectId++}" name="TileData" x="${x*16}" y="${y*16}" width="16" height="16">${xmlProps(t.properties)}</object>`);}return rows.length?`<objectgroup id="${id++}" name="${esc(l.id)}">${rows.join('')}</objectgroup>`:'';}).join('\n');
 yield `<?xml version="1.0" encoding="utf-8"?>\n<map version="1.10" tiledversion="1.11.0" orientation="orthogonal" renderorder="right-down" width="${map.width}" height="${map.height}" tilewidth="16" tileheight="16" infinite="0" nextlayerid="${id}" nextobjectid="${objectId}">${xmlProps(map.properties)}\n${sheets}\n`;
 for(let i=0;i<map.layers.length;i++){
  const l=map.layers[i],rows=l.tiles,last=rows.length-1;
  yield `<layer id="${layerIds[i]}" name="${esc(l.id)}" width="${map.width}" height="${map.height}">${xmlProps(l.properties)}<data encoding="csv">\n`;
  for(let y=0;y<rows.length;y++){const row=rows[y],out=new Array(row.length);for(let x=0;x<row.length;x++){const t=row[x];out[x]=t?starts[t.sheet]+t.index:0;}yield out.join(',')+(y<last?',\n':'\n');}
  yield '</data></layer>\n';
 }
 yield `${objects}\n</map>`;
}
export function toTmx(map){return [...tmxChunks(map)].join('');}

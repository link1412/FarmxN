import {FEATURES,CUT,transform,rect,parts,spouseArea,validate,defaults} from './core.mjs';
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
 const inHorizontalInsert=x=>x>=CUT.x&&x<CUT.x+dx;
 const inVerticalInsert=y=>y>=CUT.y&&y<CUT.y+dy;
 const source=(x,y)=>({x:x<CUT.x?x:x<CUT.x+dx?CUT.x:x-dx,y:y<CUT.y?y:y<CUT.y+dy?CUT.y:y-dy});
 const sample=(x,y)=>{
  const horizontal=inHorizontalInsert(x),vertical=inVerticalInsert(y);
  if(!horizontal&&!vertical)return source(x,y);
  return null;
 };
 const groundTiles=base.layers.find(a=>a.id==='Back').tiles;
 const generated={...base,width:c.Width,height:c.Height,properties:{...base.properties},layers:base.layers.map(l=>({...l,tiles:Array.from({length:c.Height},(_,y)=>Array.from({length:c.Width},(_,x)=>{
  const p=sample(x,y);
  if(p)return clone(l.tiles[p.y][p.x]);
  if(l.id==='Back')return clone(groundTiles[25+(x+y)%3][40+(x*3+y)%3]);
  return null;
 }))}))};
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
  if(f.id==='Cave'&&p.Y===5&&isNorthCliff(generated,p.X))continue;
  for(const r of parts(f,c))for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++){
   if(!isPassable(generated,x,y))throw Error(`${f.name}的设施组覆盖水面、树木或不可通行的地形（${x}, ${y}）。`);
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
  'FarmN/Schema':'2', 'FarmN/Width':String(c.Width),'FarmN/Height':String(c.Height)
 });
 const warps=base.properties.Warp.split(/\s+/),out=[];
 for(let i=0;i<warps.length;i+=5){let [x,y,dest,tx,ty]=warps.slice(i,i+5);x=Number(x);y=Number(y);const id={FarmCave:'Cave',BusStop:'Bus',Forest:'Forest',Backwoods:'Backwoods'}[dest];if(id){const f=FEATURES.find(f=>f.id===id),q=p[id];x=q.X+x-f.x;y=q.Y+y-f.y;}else{const q=transform(x,y,c);x=q.X;y=q.Y;}out.push(x,y,dest,tx,ty);}
 generated.properties.Warp=out.join(' ');
 for(const f of FEATURES.filter(f=>f.building)){const q=p[f.id];for(const r of parts(f,c))for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++){const origin=initial.Positions[f.id];if(q.X!==origin.X||q.Y!==origin.Y)layer(generated,'Paths').tiles[y][x]=null;}}
 // Keep a walkable door apron for all buildings. Runtime objects are never silently removed.
 for(const f of FEATURES.filter(f=>f.building)){const q=p[f.id],span=f.id==='Greenhouse'?{x:2,y:6,w:3,h:2}:f.id==='Farmhouse'?{x:5,y:3,w:1,h:3}:{x:0,y:f.id==='Pet Bowl'?2:1,w:2,h:1};
  for(let yy=0;yy<span.h;yy++)for(let xx=0;xx<span.w;xx++){const x=q.X+span.x+xx,y=q.Y+span.y+yy;if(!isPassable(generated,x,y))throw Error(`${f.name}入口不通行。`);}
 }
 for(let i=0;i<generated.layers.length;i++)for(let y=0;y<spouse.h;y++)for(let x=0;x<spouse.w;x++)if(JSON.stringify(generated.layers[i].tiles[spouse.y+y][spouse.x+x])!==JSON.stringify(fixedPatio[i][y][x]))throw Error('此位置会破坏固定的配偶活动区，请避开该区域及相连的树木。');
 return generated;
}
export function connectivity(map,c){
 const blocked=(x,y)=>FEATURES.filter(f=>f.building).some(f=>{const q=c.Positions[f.id],size={'Farmhouse':[9,5],'Greenhouse':[7,6],'Shipping Bin':[2,1],'Pet Bowl':[2,2]}[f.id];return x>=q.X&&y>=q.Y&&x<q.X+size[0]&&y<q.Y+size[1];});
 const p=c.Positions,start={x:p.Farmhouse.X+5,y:p.Farmhouse.Y+5},queue=[start],seen=new Uint8Array(map.width*map.height);if(!isPassable(map,start.x,start.y))return ['农舍门前无法通行。'];seen[start.y*map.width+start.x]=1;
 for(let i=0;i<queue.length;i++){const a=queue[i];for(const [ox,oy]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=a.x+ox,y=a.y+oy;if(x<0||y<0||x>=map.width||y>=map.height||seen[y*map.width+x]||!isPassable(map,x,y)||blocked(x,y))continue;seen[y*map.width+x]=1;queue.push({x,y});}}
 const targets=[['洞穴',p.Cave.X,p.Cave.Y+1],['温室',p.Greenhouse.X+3,p.Greenhouse.Y+6],['巴士站',p.Bus.X,p.Bus.Y],['森林',p.Forest.X,p.Forest.Y],['后山',p.Backwoods.X,p.Backwoods.Y],['神龛',p.Shrine.X,p.Shrine.Y+1]];
 if(c.Width>80)targets.push(['横向扩展区',50+Math.floor((c.Width-80)/2),25]);if(c.Height>65)targets.push(['纵向扩展区',45,35+Math.floor((c.Height-65)/2)]);
 return targets.filter(([n,x,y])=>!seen[y*map.width+x]).map(([n])=>`${n}与农舍之间没有可通行路径。`);
}
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const xmlProps=p=>Object.keys(p||{}).length?`<properties>${Object.entries(p).map(([k,v])=>`<property name="${esc(k)}" type="string" value="${esc(v)}"/>`).join('')}</properties>`:'';
export function toTmx(map){
 let gid=1,objectId=1;const starts={},animations={};for(const s of map.sheets){starts[s.id]=gid;gid+=s.width*s.height;}
 for(const l of map.layers)for(const row of l.tiles)for(const t of row)if(t?.frames){const key=t.sheet+':'+t.index;const frames=JSON.stringify(t.frames);if(animations[key]&&animations[key].frames!==frames)throw Error('同一图块包含不同动画，无法无损导出。');animations[key]={frames,interval:t.interval};}
 const sheets=map.sheets.map(s=>{const ids=new Set(Object.keys(s.tileProperties));for(const k of Object.keys(animations))if(k.startsWith(s.id+':'))ids.add(k.slice(s.id.length+1));return `<tileset firstgid="${starts[s.id]}" name="${esc(s.id)}" tilewidth="16" tileheight="16" tilecount="${s.width*s.height}" columns="${s.width}">${xmlProps(Object.fromEntries(Object.entries(s.properties||{}).filter(([k])=>!k.startsWith('@TileIndex@'))))}<image source="${esc(s.image)}" width="${s.width*16}" height="${s.height*16}"/>${[...ids].map(id=>{const anim=animations[s.id+':'+id];return `<tile id="${id}">${xmlProps(s.tileProperties[id]||{})}${anim?`<animation>${JSON.parse(anim.frames).map(f=>{if(f.sheet!==s.id)throw Error('跨图集动画无法导出。');return `<frame tileid="${f.index}" duration="${anim.interval}"/>`;}).join('')}</animation>`:''}</tile>`;}).join('')}</tileset>`;}).join('\n');
 let id=1;const layers=map.layers.map(l=>`<layer id="${id++}" name="${esc(l.id)}" width="${map.width}" height="${map.height}">${xmlProps(l.properties)}<data encoding="csv">\n${l.tiles.map(row=>row.map(t=>t?starts[t.sheet]+t.index:0).join(',')).join(',\n')}\n</data></layer>`).join('\n');
 const objects=map.layers.map(l=>{const rows=[];for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++){const t=l.tiles[y][x];if(t&&Object.keys(t.properties||{}).length)rows.push(`<object id="${objectId++}" name="TileData" x="${x*16}" y="${y*16}" width="16" height="16">${xmlProps(t.properties)}</object>`);}return rows.length?`<objectgroup id="${id++}" name="${esc(l.id)}">${rows.join('')}</objectgroup>`:'';}).join('\n');
 return `<?xml version="1.0" encoding="utf-8"?>\n<map version="1.10" tiledversion="1.11.0" orientation="orthogonal" renderorder="right-down" width="${map.width}" height="${map.height}" tilewidth="16" tileheight="16" infinite="0" nextlayerid="${id}" nextobjectid="${objectId}">${xmlProps(map.properties)}\n${sheets}\n${layers}\n${objects}\n</map>`;
}

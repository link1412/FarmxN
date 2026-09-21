import {BASE,LIMITS,FEATURES,defaults,validate,rect,normalized,resized,transform,spouseArea,formatMultiplier} from './core.mjs';
import {createMapWorker,loadBase,loadImage,whenVisible} from './resources.mjs';
import {MapRenderer,visibleTiles} from './renderer.mjs';
import {download} from './export.mjs';
import {t,getLocale,setLocale,detectLocale} from './i18n.mjs';
const $=id=>document.getElementById(id),canvas=$('map'),ctx=canvas.getContext('2d');
// localStorage only remembers conveniences (language, last layout). It can be missing or throw
// in private windows and some file:// setups, so every access is guarded and nothing depends on it.
const STORAGE={locale:'farmxn.locale',layout:'farmxn.layout'};
const store={get(key){try{return localStorage.getItem(key);}catch{return null;}},set(key,value){try{localStorage.setItem(key,value);}catch{}}};
let busy=false,ready=false;
// Open the 2048 × 2048 default farm unless the browser reports a small memory budget.
const lowMemory=Number.isFinite(navigator.deviceMemory)&&navigator.deviceMemory<8;
const initialConfig=()=>lowMemory?defaults():defaults(2048,2048);
const HEAVY_AREA=2048*2048;
let config=initialConfig(),selected=FEATURES[0],history=[],future=[],worker,renderer,images={},zoom=1,offset={x:0,y:0},drag=null,toastTimer,framePending=false;
setLocale(store.get(STORAGE.locale)||detectLocale(navigator.languages||[navigator.language]));
function applyLocale(){
 document.documentElement.lang=getLocale();
 document.querySelector('meta[name="description"]')?.setAttribute('content',t('meta.description'));
 for(const el of document.querySelectorAll('[data-i18n]'))el.textContent=t(el.dataset.i18n);
 for(const el of document.querySelectorAll('[data-i18n-html]'))el.innerHTML=t(el.dataset.i18nHtml);
 for(const el of document.querySelectorAll('[data-i18n-title]'))el.title=t(el.dataset.i18nTitle);
 for(const el of document.querySelectorAll('[data-i18n-aria]'))el.setAttribute('aria-label',t(el.dataset.i18nAria));
 $('language').textContent=t('ui.switchLanguage');$('language').title=t('ui.switchLanguageTitle');$('language').lang=getLocale()==='en'?'zh-CN':'en';
 $('coordinates').textContent=t('status.hint');
 updateLimits();if(ready)sync();
}
$('language').onclick=()=>{setLocale(getLocale()==='en'?'zh-CN':'en');store.set(STORAGE.locale,getLocale());applyLocale();};
function persist(){store.set(STORAGE.layout,JSON.stringify({config:normalized(config)}));}
function savedLayout(){try{const saved=JSON.parse(store.get(STORAGE.layout));if(saved?.config&&!validate(saved.config).length)return {config:normalized(saved.config)};}catch{}return null;}
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4500);}
function check(next){const errors=validate(next);if(errors.length)throw Error(errors[0]);}
async function prepare(next){check(next);const display=await worker.call('generate',{config:normalized(next)}),result=new MapRenderer(draw);await result.setMap(display);return result;}
async function commit(next,message,{remember=true,fitView=false}={}){
 if(!ready){toast(t('toast.notReady'));return false;}
 if(busy)return false;
 if(JSON.stringify(normalized(next))===JSON.stringify(config)){if(fitView)fit();return true;}
 return runBusy(t('busy.generating'),async()=>{const result=await prepare(next);if(remember){history.push(structuredClone(config));if(history.length>60)history.shift();future.length=0;}config=normalized(next);renderer=result;persist();sync();if(fitView)fit();if(message)toast(message);return true;});
}
function sync(){
 $('width').value=config.Width;$('height').value=config.Height;updateSizeNote();$('dimensions').textContent=`${config.Width} × ${config.Height}`;$('area').textContent=(config.Width*config.Height).toLocaleString();$('ratio').textContent=`Farm x ${formatMultiplier(config.Width,config.Height)}`;$('undo').disabled=!history.length;$('redo').disabled=!future.length;
 document.querySelectorAll('[data-size]').forEach(b=>b.classList.toggle('active',b.dataset.size===`${config.Width},${config.Height}`));
 $('feature-list').replaceChildren(...FEATURES.map(f=>{const b=document.createElement('button'),active=f.id===selected.id;b.className='feature'+(active?' active':'');b.setAttribute('aria-pressed',String(active));b.innerHTML=`<span class="feature-icon">${f.icon}</span><span><strong>${f.name}</strong><span class="coord">${config.Positions[f.id].X}, ${config.Positions[f.id].Y} · ${f.w} × ${f.h}</span></span>`;b.onclick=()=>{selected=f;sync();};return b;}));
 const p=config.Positions[selected.id];$('selected-name').textContent=selected.name;$('selected-note').textContent=selected.note;$('pos-x').value=p.X;$('pos-y').value=p.Y;
 for(const id of ['pos-x','pos-y','move','restore'])$(id).disabled=false;$('pos-x').disabled=selected.edge==='east';$('pos-y').disabled=selected.edge==='south'||selected.edge==='north';
 draw();
}
const loadingBuildings=new Set();
function requestBuilding(name){if(images[name]||loadingBuildings.has(name))return;loadingBuildings.add(name);loadImage(name).then(img=>{images[name]=img;draw();}).catch(()=>toast(t('toast.imageFailed')));}
function renderBuilding(f,r){if(!f.building)return;const name={Greenhouse:'Greenhouse',Farmhouse:'houses','Shipping Bin':'Shipping Bin','Pet Bowl':'Pet Bowl'}[f.id];if((r.x+12)*16*zoom+offset.x<0||r.x*16*zoom+offset.x>canvas.clientWidth||(r.y+12)*16*zoom+offset.y<0||(r.y-5)*16*zoom+offset.y>canvas.clientHeight)return;requestBuilding(name);let img,sx=0,sy=0,sw,sh,dx=r.x*16,dy=r.y*16;if(f.id==='Greenhouse'){img=images.Greenhouse;sw=112;sh=160;sy=160;dy-=64;}else if(f.id==='Farmhouse'){img=images.houses;sw=160;sh=144;dx-=16;dy-=64;}else if(f.id==='Shipping Bin'){img=images['Shipping Bin'];sw=32;sh=32;dy-=16;}else if(f.id==='Pet Bowl'){img=images['Pet Bowl'];sx=32;sw=32;sh=32;}if(img)ctx.drawImage(img,sx,sy,sw,sh,dx,dy,sw,sh);}
function draw(){if(framePending)return;framePending=true;requestAnimationFrame(()=>{framePending=false;renderFrame();});}
function renderFrame(){
 const started=performance.now();
 const dpr=window.devicePixelRatio||1,w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);if(!renderer)return;ctx.imageSmoothingEnabled=false;ctx.translate(offset.x,offset.y);ctx.scale(zoom,zoom);
 renderer.draw(ctx,zoom,offset,w,h);
 if($('grid').checked&&zoom>=.3){const v=visibleTiles(config.Width,config.Height,zoom,offset,w,h);ctx.strokeStyle='#283b242c';ctx.lineWidth=.65/zoom;ctx.beginPath();for(let x=v.left*16;x<=v.right*16;x+=16){ctx.moveTo(x,v.top*16);ctx.lineTo(x,v.bottom*16);}for(let y=v.top*16;y<=v.bottom*16;y+=16){ctx.moveTo(v.left*16,y);ctx.lineTo(v.right*16,y);}ctx.stroke();}
 const placedLabels=[]; const fs=[...FEATURES].sort((a,b)=>rect(a,config).y-rect(b,config).y);for(const f of fs){let r=rect(f,config);if(drag?.feature?.id===f.id&&drag.preview)r={...r,...drag.preview};if(drag?.feature?.id===f.id&&drag.ghost){ctx.globalAlpha=.65;ctx.drawImage(drag.ghost,r.x*16,r.y*16);ctx.globalAlpha=1;}renderBuilding(f,r);if(f===selected){ctx.fillStyle='#b6d68233';ctx.fillRect(r.x*16,r.y*16,r.w*16,r.h*16);ctx.strokeStyle=drag?.invalid?'#e78669':'#f1f4b8';ctx.lineWidth=2/zoom;ctx.strokeRect(r.x*16,r.y*16,r.w*16,r.h*16);if(f.id==='Farmhouse'){const a=spouseArea(config);ctx.setLineDash([4/zoom,4/zoom]);ctx.strokeStyle='#eebf72';ctx.strokeRect(a.x*16,a.y*16,a.w*16,a.h*16);ctx.setLineDash([]);}}if($('labels').checked){const x=(r.x+r.w/2)*16,y=(r.y+r.h)*16;ctx.save();ctx.translate(x,y);ctx.scale(1/zoom,1/zoom);ctx.font='12px system-ui';const tw=ctx.measureText(f.name).width;ctx.fillStyle=f===selected?'#f4f3d7':'#1c392eea';let ly=5;const lx=x*zoom-tw/2-9,lw=tw+18;while(placedLabels.some(b=>lx<b.x+b.w&&lx+lw>b.x&&y*zoom+ly<b.y+27&&y*zoom+ly+27>b.y))ly+=28;placedLabels.push({x:lx,y:y*zoom+ly,w:lw});if(ly>5){ctx.strokeStyle='#e4e8cf99';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,ly);ctx.stroke();}ctx.beginPath();ctx.roundRect(-tw/2-9,ly,tw+18,25,4);ctx.fill();ctx.fillStyle=f===selected?'#29492d':'#eaf0d7';ctx.textAlign='center';ctx.fillText(f.name,0,ly+17);ctx.restore();}}
 canvas.dataset.renderMs=(performance.now()-started).toFixed(2);canvas.dataset.cacheBytes=renderer.bytes;canvas.dataset.chunksBuilt=renderer.stats.chunksBuilt;
 $('zoom-value').textContent=(zoom<.1?(zoom*100).toFixed(1):Math.round(zoom*100))+'%';
}
function fitZoom(){return Math.min((canvas.clientWidth-48)/(config.Width*16),(canvas.clientHeight-48)/(config.Height*16));}
function fit(){zoom=fitZoom();offset={x:(canvas.clientWidth-config.Width*16*zoom)/2,y:(canvas.clientHeight-config.Height*16*zoom)/2-10};draw();}
function scale(factor,x=canvas.clientWidth/2,y=canvas.clientHeight/2){const n=Math.max(Math.min(.08,fitZoom()/2),Math.min(3,zoom*factor));offset={x:x-(x-offset.x)*n/zoom,y:y-(y-offset.y)*n/zoom};zoom=n;draw();}
function point(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left-offset.x)/zoom/16,y:(e.clientY-r.top-offset.y)/zoom/16};}
canvas.addEventListener('pointerdown',e=>{if(!ready||busy)return;$('map-viewport').focus({preventScroll:true});const p=point(e),f=[...FEATURES].reverse().find(f=>{const r=rect(f,config);return p.x>=r.x&&p.x<r.x+r.w&&p.y>=r.y-2&&p.y<r.y+r.h;});if(f){selected=f;sync();if(f.movable){const r=rect(f,config);drag={feature:f,delta:{x:p.x-r.x,y:p.y-r.y},preview:{x:r.x,y:r.y},ghost:f.stamp?renderer.capture(r):null};}else toast(t('toast.protected',{name:f.name}));}else drag={start:{x:e.clientX,y:e.clientY},offset:{...offset}};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{const p=point(e);$('coordinates').textContent=t('status.coords',{x:Math.floor(p.x),y:Math.floor(p.y)});if(drag?.feature){drag.preview={x:Math.round(p.x-drag.delta.x),y:Math.round(p.y-drag.delta.y)};if(drag.feature.edge==='east')drag.preview.x=config.Width-1+drag.feature.ox;if(drag.feature.edge==='south')drag.preview.y=config.Height-1+drag.feature.oy;if(drag.feature.edge==='north')drag.preview.y=0;const c=structuredClone(config);c.Positions[drag.feature.id]={X:drag.preview.x-(drag.feature.ox||0),Y:drag.preview.y-(drag.feature.oy||0)};drag.invalid=validate(c).length>0;draw();}else if(drag){offset={x:drag.offset.x+e.clientX-drag.start.x,y:drag.offset.y+e.clientY-drag.start.y};draw();}});
canvas.addEventListener('pointerleave',()=>{if(!drag)$('coordinates').textContent=t('status.hint');});
canvas.addEventListener('pointerup',()=>{if(drag?.feature){const c=structuredClone(config);c.Positions[drag.feature.id]={X:drag.preview.x-(drag.feature.ox||0),Y:drag.preview.y-(drag.feature.oy||0)};commit(c);}drag=null;draw();});canvas.addEventListener('pointercancel',()=>{drag=null;draw();});canvas.addEventListener('wheel',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();scale(e.deltaY<0?1.12:1/1.12,e.clientX-r.left,e.clientY-r.top);},{passive:false});
function move(x,y){const c=structuredClone(config);c.Positions[selected.id]={X:x,Y:y};return commit(c,t('toast.moved'));}
$('move').onclick=()=>move(Number($('pos-x').value),Number($('pos-y').value));$('restore').onclick=()=>{const p=transform(selected.x,selected.y,config);move(p.X,p.Y);};$('resize').onclick=()=>{const c=resized(config,Number($('width').value),Number($('height').value));commit(c,t('toast.resized'),{fitView:true});};
document.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{const [Width,Height]=b.dataset.size.split(',').map(Number);commit(resized(config,Width,Height),null,{fitView:true});});
// Undo and redo are two stacks of layouts; a fresh edit clears the redo stack.
async function travel(from,to){if(busy||!from.length)return;const target=from.at(-1),current=structuredClone(config);if(await commit(target,null,{remember:false,fitView:true})){from.pop();to.push(current);sync();}}
$('undo').onclick=()=>travel(history,future);$('redo').onclick=()=>travel(future,history);$('fit').onclick=fit;$('zoom-in').onclick=()=>scale(1.3);$('zoom-out').onclick=()=>scale(1/1.3);$('grid').onchange=draw;$('labels').onchange=draw;
$('export-tmx').onclick=()=>runBusy(t('busy.exporting'),async()=>{if(!ready)throw Error(t('error.notLoaded'));const blob=await worker.call('export',{config:normalized(config)});download('Farm.tmx',blob,'application/xml');toast(t('toast.exported'));});
$('help').onclick=()=>$('help-dialog').showModal();$('close-help').onclick=()=>$('help-dialog').close();$('help-dialog').onclick=e=>{if(e.target===$('help-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}};
// Arrow keys nudge the selected landmark while the map has focus; exits stay on their edge.
function nudge(key,step){if(!ready||busy)return;let dx=key==='ArrowLeft'?-step:key==='ArrowRight'?step:0,dy=key==='ArrowUp'?-step:key==='ArrowDown'?step:0;if(selected.edge==='east')dx=0;if(selected.edge==='north'||selected.edge==='south')dy=0;if(!dx&&!dy)return;const p=config.Positions[selected.id];move(p.X+dx,p.Y+dy);}
window.addEventListener('keydown',e=>{
 const typing=['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName);
 if(e.key==='Escape'){drag=null;draw();}
 if((e.ctrlKey||e.metaKey)&&!typing){const key=e.key.toLowerCase();if(key==='z'||key==='y'){e.preventDefault();(key==='y'||e.shiftKey?$('redo'):$('undo')).click();}}
 if(e.key.startsWith('Arrow')&&document.activeElement===$('map-viewport')&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();nudge(e.key,e.shiftKey?10:1);}
});
function updateLimits(){$('width').max=LIMITS.width;$('height').max=LIMITS.height;$('size-limit').textContent=t('dims.limit',{w:BASE.width,h:BASE.height,area:LIMITS.area.toLocaleString()});updateSizeNote();}
function updateSizeNote(){const heavy=Number($('width').value)*Number($('height').value)>HEAVY_AREA;$('size-note').textContent=heavy?t('dims.heavy'):'';$('size-note').hidden=!heavy;}
$('width').oninput=$('height').oninput=updateSizeNote;
async function runBusy(message,fn){if(busy)return;busy=true;const overlay=document.createElement('div');overlay.className='busy-overlay';overlay.textContent=message;overlay.setAttribute('role','status');document.body.append(overlay);try{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));return await fn();}catch(e){toast(e.message);return false;}finally{overlay.remove();busy=false;}}
applyLocale();
new ResizeObserver(()=>fit()).observe($('map-viewport'));
try{
 await whenVisible($('map-viewport'));worker=createMapWorker();await worker.call('init',{base:await loadBase()});
 // Reopen the last layout saved in this browser; fall back to the default if it no longer generates.
 const saved=savedLayout();let restored=false;
 if(saved){
  try{renderer=await prepare(saved.config);config=saved.config;restored=true;}
  catch(e){console.warn('Saved layout could not be restored:',e);config=initialConfig();}
 }
 if(!restored)renderer=await prepare(config);
 ready=true;$('loading').remove();sync();fit();persist();
 if(restored&&JSON.stringify(config)!==JSON.stringify(initialConfig()))toast(t('layout.restored'));
}catch(e){const loading=$('loading');if(loading){loading.removeAttribute('data-i18n');loading.textContent=t('load.failed');}console.error(e);}

if(document.modelContext?.registerTool){for(const tool of [{name:'read_farm_plan',description:t('mcp.read'),inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>normalized(config)},{name:'configure_farm_plan',description:t('mcp.configure'),inputSchema:{type:'object',properties:{Width:{type:'integer'},Height:{type:'integer'},Positions:{type:'object'}},required:['Width','Height','Positions'],additionalProperties:false},execute:async input=>{if(!ready||busy)throw Error(t('mcp.busy'));const c={...input,SchemaVersion:2};check(c);if(!await commit(c,null,{fitView:true}))throw Error(t('mcp.rejected'));return normalized(config);}}])try{Promise.resolve(document.modelContext.registerTool(tool)).catch(console.error);}catch(e){console.error(e);}}

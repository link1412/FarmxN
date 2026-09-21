import {t} from './i18n.mjs';
export const BASE={width:80,height:65}, LIMITS={width:16384,height:16384,area:4096*4096}, CUT={x:50,y:35};
// Names and notes are resolved through the message catalog on every access, so
// switching the page language re-labels landmarks and every error message.
const localized=f=>Object.defineProperties({...f,movable:true},{name:{enumerable:true,get(){return t(`feature.${f.id}.name`);}},note:{enumerable:true,get(){return t(`feature.${f.id}.note`);}}});
export const FEATURES=[
 {id:'Greenhouse',x:25,y:10,w:9,h:8,icon:'▧',building:true},
 {id:'Farmhouse',x:59,y:12,w:11,h:7,icon:'⌂',building:true},
 {id:'Cave',x:34,y:5,w:7,h:9,ox:-3,oy:-4,icon:'◠',stamp:true,cliff:'north'},
 {id:'Shrine',x:8,y:7,w:5,h:7,ox:-2,oy:-4,icon:'♧',stamp:true},
 {id:'Shipping Bin',x:71,y:14,w:2,h:2,icon:'▤',building:true},
 {id:'Pet Bowl',x:53,y:7,w:2,h:3,icon:'◒',building:true},
 {id:'Bus',x:79,y:17,w:6,h:9,ox:-5,oy:-5,edge:'east',icon:'⇥',stamp:true},
 {id:'Forest',x:41,y:64,w:8,h:6,ox:-4,oy:-5,edge:'south',icon:'⇣',stamp:true},
 {id:'Backwoods',x:40,y:0,w:6,h:9,ox:-2,oy:0,edge:'north',icon:'⇡',stamp:true},
].map(localized);
export function transform(x,y,c){return {X:x+(x>=CUT.x?c.Width-80:0),Y:y+(y>=CUT.y?c.Height-65:0)};}
export function defaults(Width=160,Height=130){const c={SchemaVersion:2,Width,Height,Positions:{}};for(const f of FEATURES)c.Positions[f.id]=transform(f.x,f.y,c);return c;}
export function rect(f,c){const p=c.Positions[f.id];return {x:p.X+(f.ox||0),y:p.Y+(f.oy||0),w:f.w,h:f.h};}
export function spouseArea(c){const p=transform(69,6,c);return {x:p.X,y:p.Y,w:4,h:4};}
export function parts(f,c){return [rect(f,c)];}
export function overlaps(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
export function resized(c,Width,Height){const n=structuredClone(c);n.Width=Width;n.Height=Height;for(const f of FEATURES){const p=n.Positions[f.id],old=transform(f.x,f.y,c),neu=transform(f.x,f.y,n);if(p.X===old.X&&p.Y===old.Y)n.Positions[f.id]=neu;else{if(f.edge==='east')p.X=Width-1;if(f.edge==='south')p.Y=Height-1;}}return n;}
export function validate(c){
 const errors=[];if(!c||c.SchemaVersion!==2||!c.Positions)return [t('validate.schema')];
 for(const [k,min,max]of [['Width',BASE.width,LIMITS.width],['Height',BASE.height,LIMITS.height]])if(!Number.isInteger(c[k])||c[k]<min||c[k]>max)errors.push(t(k==='Width'?'validate.width':'validate.height',{min,max}));
 if(Number.isInteger(c.Width)&&Number.isInteger(c.Height)&&c.Width*c.Height>LIMITS.area)errors.push(t('validate.area',{area:LIMITS.area.toLocaleString()}));
 for(const f of FEATURES){const p=c.Positions[f.id];if(!p||!Number.isInteger(p.X)||!Number.isInteger(p.Y)){errors.push(t('validate.integer',{name:f.name}));continue;}
 if(f.edge==='east'&&p.X!==c.Width-1||f.edge==='south'&&p.Y!==c.Height-1||f.edge==='north'&&p.Y!==0)errors.push(t('validate.edge',{name:f.name}));
 if(f.cliff&&p.Y!==f.y)errors.push(t('validate.cliff',{name:f.name}));
 for(const r of parts(f,c))if(r.x<0||r.y<0||r.x+r.w>c.Width||r.y+r.h>c.Height)errors.push(t('validate.bounds',{name:f.name}));
 if(parts(f,c).some(r=>overlaps(r,spouseArea(c))))errors.push(t('validate.spouseArea',{name:f.name}));
 for(const o of FEATURES){if(o.id===f.id||!c.Positions[o.id])continue;if(parts(f,c).some(a=>parts(o,c).some(b=>overlaps(a,b))))errors.push(t('validate.overlap',{a:f.name,b:o.name}));}}
 return [...new Set(errors)];
}
export function normalized(c){return {SchemaVersion:2,Width:c.Width,Height:c.Height,Positions:Object.fromEntries(FEATURES.map(f=>[f.id,{...c.Positions[f.id]}]))};}

export function areaMultiplier(width,height){return width*height/(BASE.width*BASE.height);}
export function formatMultiplier(width,height){return Number(areaMultiplier(width,height).toFixed(2)).toLocaleString('en-US',{maximumFractionDigits:2});}

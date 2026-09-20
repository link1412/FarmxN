export const BASE={width:80,height:65}, LIMITS={width:4032,height:3276,area:262144}, CUT={x:50,y:35};
export const FEATURES=[
 {id:'Greenhouse',name:'温室',x:25,y:10,w:9,h:8,icon:'▧',building:true,note:'移动建筑初始位置、地基与门前通道。'},
 {id:'Farmhouse',name:'农舍',x:59,y:12,w:11,h:7,icon:'⌂',building:true,note:'联动农舍入口与信箱；配偶活动区固定在原位。'},
 {id:'Cave',name:'农场洞穴',x:34,y:5,w:7,h:9,ox:-3,oy:-4,icon:'◠',stamp:true,note:'洞口图块、碰撞、进入传送和返回落点一起移动。'},
 {id:'Shrine',name:'爷爷的神龛',x:8,y:7,w:5,h:7,ox:-2,oy:-4,icon:'♧',stamp:true,note:'可沿北侧平直山壁或移至空地；联动神龛、石板与互动位置。'},
 {id:'Shipping Bin',name:'出货箱',x:71,y:14,w:2,h:2,icon:'▤',building:true,note:'设置出货箱的初始位置与操作空间。'},
 {id:'Pet Bowl',name:'宠物水碗',x:53,y:7,w:2,h:3,icon:'◒',building:true,note:'设置水碗初始位置，保留宠物功能。'},
 {id:'Bus',name:'巴士站出口',x:79,y:17,w:6,h:9,ox:-5,oy:-5,edge:'east',icon:'⇥',stamp:true,note:'沿东侧边界移动；出口与巴士站返回位置联动。'},
 {id:'Forest',name:'森林出口',x:41,y:64,w:8,h:6,ox:-4,oy:-5,edge:'south',icon:'⇣',stamp:true,note:'沿南侧边界移动；出口与森林返回位置联动。'},
 {id:'Backwoods',name:'后山出口',x:40,y:0,w:6,h:9,ox:-2,oy:0,edge:'north',icon:'⇡',stamp:true,note:'沿北侧边界移动；出口与后山返回位置联动。'},
].map(f=>({...f,movable:true}));
export function transform(x,y,c){return {X:x+(x>=CUT.x?c.Width-80:0),Y:y+(y>=CUT.y?c.Height-65:0)};}
export function defaults(Width=160,Height=130){const c={SchemaVersion:2,Width,Height,Positions:{}};for(const f of FEATURES)c.Positions[f.id]=transform(f.x,f.y,c);return c;}
export function rect(f,c){const p=c.Positions[f.id];return {x:p.X+(f.ox||0),y:p.Y+(f.oy||0),w:f.w,h:f.h};}
export function spouseArea(c){const p=transform(69,6,c);return {x:p.X,y:p.Y,w:4,h:4};}
export function parts(f,c){return [rect(f,c)];}
export function overlaps(a,b){return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;}
export function resized(c,Width,Height){const n=structuredClone(c);n.Width=Width;n.Height=Height;for(const f of FEATURES){const p=n.Positions[f.id],old=transform(f.x,f.y,c),neu=transform(f.x,f.y,n);if(p.X===old.X&&p.Y===old.Y)n.Positions[f.id]=neu;else{if(f.edge==='east')p.X=Width-1;if(f.edge==='south')p.Y=Height-1;}}return n;}
export function validate(c){
 const errors=[];if(!c||c.SchemaVersion!==2||!c.Positions)return ['请导入新版（SchemaVersion 2）的地图规划。'];
 for(const [k,min,max]of [['Width',BASE.width,LIMITS.width],['Height',BASE.height,LIMITS.height]])if(!Number.isInteger(c[k])||c[k]<min||c[k]>max)errors.push(`${k==='Width'?'宽':'高'}度须为 ${min}–${max} 的整数。`);
 if(Number.isInteger(c.Width)&&Number.isInteger(c.Height)&&c.Width*c.Height>LIMITS.area)errors.push(`地图总面积不能超过 ${LIMITS.area.toLocaleString()} 格，请减小宽度或高度。`);
 for(const f of FEATURES){const p=c.Positions[f.id];if(!p||!Number.isInteger(p.X)||!Number.isInteger(p.Y)){errors.push(`${f.name}坐标必须为整数。`);continue;}
 if(f.edge==='east'&&p.X!==c.Width-1||f.edge==='south'&&p.Y!==c.Height-1||f.edge==='north'&&p.Y!==0)errors.push(`${f.name}必须位于对应的地图外边界。`);
 for(const r of parts(f,c))if(r.x<0||r.y<0||r.x+r.w>c.Width||r.y+r.h>c.Height)errors.push(`${f.name}的设施组超出地图边界。`);
 if(parts(f,c).some(r=>overlaps(r,spouseArea(c))))errors.push(`${f.name}不能覆盖固定的配偶活动区。`);
 for(const o of FEATURES){if(o.id===f.id||!c.Positions[o.id])continue;if(parts(f,c).some(a=>parts(o,c).some(b=>overlaps(a,b))))errors.push(`${f.name}与${o.name}的设施组重叠。`);}}
 return [...new Set(errors)];
}
export function normalized(c){return {SchemaVersion:2,Width:c.Width,Height:c.Height,Positions:Object.fromEntries(FEATURES.map(f=>[f.id,{...c.Positions[f.id]}]))};}

import {makeMap,connectivity,toTmx} from './map.mjs';
import {normalized} from './core.mjs';
const encoder=new TextEncoder();
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let n=0xffffffff;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return(n^0xffffffff)>>>0;}
export function zip(files,compress){let offset=0;const chunks=[],directory=[];for(const[name,value]of Object.entries(files)){const key=encoder.encode(name),data=typeof value==='string'?encoder.encode(value):value;const packed=compress?compress(data):data,method=compress?8:0;const crc=crc32(data),head=new Uint8Array(30+key.length),v=new DataView(head.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(8,method,true);v.setUint32(14,crc,true);v.setUint32(18,packed.length,true);v.setUint32(22,data.length,true);v.setUint16(26,key.length,true);head.set(key,30);chunks.push(head,packed);const central=new Uint8Array(46+key.length),d=new DataView(central.buffer);d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint16(10,method,true);d.setUint32(16,crc,true);d.setUint32(20,packed.length,true);d.setUint32(24,data.length,true);d.setUint16(28,key.length,true);d.setUint32(42,offset,true);central.set(key,46);directory.push(central);offset+=head.length+packed.length;}const length=directory.reduce((n,a)=>n+a.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,directory.length,true);v.setUint16(10,directory.length,true);v.setUint32(12,length,true);v.setUint32(16,offset,true);const result=new Uint8Array(offset+length+22);let pos=0;for(const c of [...chunks,...directory,end]){result.set(c,pos);pos+=c.length;}return result;}
// A ready-to-install content pack matching templates/[CP] FarmxN.
export function packageFiles(base,config){const map=makeMap(base,config),errors=connectivity(map,config);if(errors.length)throw Error(errors.join('\n'));const root='[CP] FarmxN/';return {
 [root+'manifest.json']:JSON.stringify({Name:'Farm x N — Custom Standard Farm',Author:'link1412',Version:'2.1.0',Description:'Loads the Farm.tmx you exported from Farm x N as the standard farm.',UniqueID:'link1412.FarmxN',MinimumApiVersion:'4.0.0',ContentPackFor:{UniqueID:'Pathoschild.ContentPatcher'},UpdateKeys:[]},null,2),
 [root+'content.json']:JSON.stringify({Format:'2.0.0',Changes:[{Action:'Load',Target:'Maps/Farm',FromFile:'assets/Farm.tmx',When:{FarmType:'Standard'}}]},null,2),
 [root+'assets/Farm.tmx']:toTmx(map),
 [root+'layout.json']:JSON.stringify(normalized(config),null,2),
 [root+'README.txt']:`Farm x N — ${config.Width} × ${config.Height} Standard Farm

Requires Stardew Valley 1.6, SMAPI 4 and Content Patcher.
Copy [CP] FarmxN into the game Mods directory, launch via SMAPI and start a NEW standard farm.
Back up your saves first. Install only one Farm x N map pack and no other mod that replaces Maps/Farm.
layout.json (or Farm.tmx itself) can be imported back into the editor to keep editing.

${config.Width} × ${config.Height} 标准农场。安装 SMAPI 和 Content Patcher 后，将 [CP] FarmxN 放入 Mods，使用 SMAPI 启动并新建标准农场。
请先备份存档。只安装一个 Farm x N 地图包，请勿同时启用其他替换标准农场的地图模组。
layout.json 或 Farm.tmx 都可以导入编辑器继续修改。
`,
 };}
export function download(name,data,type='application/octet-stream'){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

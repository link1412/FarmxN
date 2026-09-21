// Only the compact display layers cross the worker boundary. The full map stays
// in the worker for collision checks and lossless TMX export.
export function packPreview(map) {
 const palette=[null], signatures=new Map(), objects=new WeakMap();
 const idFor=tile=>{
  if(!tile)return 0;
  let id=objects.get(tile);if(id!==undefined)return id;
  const frame=tile.frames?.[0]||tile,key=frame.sheet+':'+frame.index;
  id=signatures.get(key);
  if(id===undefined){id=palette.length;signatures.set(key,id);palette.push({sheet:frame.sheet,index:frame.index});}
  objects.set(tile,id);return id;
 };
 const layers=map.layers.filter(l=>l.id!=='Paths').map(l=>{
  // The palette never approaches 65,536 entries (it is bounded by the tiles in four sheets).
  const cells=new Uint16Array(map.width*map.height);let i=0;
  for(const row of l.tiles)for(const tile of row)cells[i++]=idFor(tile);
  return {id:l.id,cells};
 });
 return {width:map.width,height:map.height,palette,layers,sheets:map.sheets.map(s=>({id:s.id,image:s.image,width:s.width}))};
}

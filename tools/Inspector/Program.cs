using Microsoft.Xna.Framework.Content;
using System.Reflection;
using System.Text.Json;
using xTile;
if(args.Length==3 && args[0]=="--tmx")
{
 System.Runtime.Loader.AssemblyLoadContext.Default.Resolving+=(_,name)=>name.Name=="xTile"?typeof(Map).Assembly:null;
 ValidateTmx(args);return;
}
var root = Environment.GetEnvironmentVariable("STARDEW_CONTENT") ?? throw new InvalidOperationException("Set STARDEW_CONTENT or run npm run prepare-assets.");
using var content = new ContentManager(new EmptyServices(), root);
var map = content.Load<Map>("Maps/Farm");
var data = new {width=map.Layers[0].LayerWidth,height=map.Layers[0].LayerHeight, properties=Props(map.Properties),
 sheets=map.TileSheets.Select(s=>new{id=s.Id,image=s.ImageSource,width=s.SheetWidth,height=s.SheetHeight,properties=Props(s.Properties),tileProperties=Enumerable.Range(0,s.TileCount).Where(i=>s.TileIndexProperties[i].Count>0).ToDictionary(i=>i.ToString(),i=>Props(s.TileIndexProperties[i]))}),
 layers=map.Layers.Select(l=>new{id=l.Id,properties=Props(l.Properties),tiles=Enumerable.Range(0,l.LayerHeight).Select(y=>Enumerable.Range(0,l.LayerWidth).Select(x=>TileData(l.Tiles[x,y])))})};
Directory.CreateDirectory("dist/assets");
File.WriteAllText("dist/assets/farm.json",JsonSerializer.Serialize(data));
Console.WriteLine("Exported full tile data, tilesheet properties and animation frames.");
var buildings=content.Load<Dictionary<string,StardewValley.GameData.Buildings.BuildingData>>("Data/Buildings");
File.WriteAllText("dist/assets/buildings.json",JsonSerializer.Serialize(buildings.Where(p=>new[]{"Farmhouse","Greenhouse","Shipping Bin","Pet Bowl"}.Contains(p.Key)).ToDictionary(p=>p.Key,p=>p.Value),new JsonSerializerOptions{IncludeFields=true}));
var masks=Enumerable.Range(0,65).Select(y=>Enumerable.Range(0,80).Select(x=>{
var b=map.GetLayer("Back").Tiles[x,y];var wall=map.GetLayer("Buildings").Tiles[x,y];
return b!=null && wall==null && (b.Properties.ContainsKey("Diggable") || b.TileIndexProperties.ContainsKey("Diggable"));}));
File.WriteAllText("dist/assets/buildable.json",JsonSerializer.Serialize(masks));
[System.Runtime.CompilerServices.MethodImpl(System.Runtime.CompilerServices.MethodImplOptions.NoInlining)]
static void ValidateTmx(string[] args)
{
 using var stream=File.OpenRead(args[1]);
 var loaded=new TMXTile.TMXFormat(16,16,4,4).Load(stream);
 var expected=JsonDocument.Parse(File.ReadAllText(args[2])).RootElement;
 if(loaded.Layers[0].LayerWidth!=expected.GetProperty("width").GetInt32()||loaded.Layers[0].LayerHeight!=expected.GetProperty("height").GetInt32())throw new Exception("TMX size mismatch");
 foreach(var p in expected.GetProperty("properties").EnumerateObject())if(loaded.Properties[p.Name].ToString()!=p.Value.GetString())throw new Exception("Map property mismatch: "+p.Name);
 int checkedTiles=0,animations=0;
 foreach(var el in expected.GetProperty("layers").EnumerateArray())
 {
  var l=loaded.GetLayer(el.GetProperty("id").GetString());int y=0;
  foreach(var row in el.GetProperty("tiles").EnumerateArray()){int x=0;foreach(var t in row.EnumerateArray()){
   var actual=l.Tiles[x,y];
   if(t.ValueKind==JsonValueKind.Null){if(actual!=null)throw new Exception($"Extra tile {l.Id}/{x}/{y}");}
   else{
    if(actual==null||actual.TileSheet.Id!=t.GetProperty("sheet").GetString()||actual.TileIndex!=t.GetProperty("index").GetInt32())throw new Exception($"Tile mismatch {l.Id}/{x}/{y}");
    foreach(var p in t.GetProperty("properties").EnumerateObject())if(actual.Properties[p.Name].ToString()!=p.Value.GetString())throw new Exception($"Tile property mismatch {l.Id}/{x}/{y}/{p.Name}");
    var frames=t.GetProperty("frames");
    if(frames.ValueKind==JsonValueKind.Array){animations++;if(actual is not xTile.Tiles.AnimatedTile a||a.FrameInterval!=t.GetProperty("interval").GetInt64()||a.TileFrames.Length!=frames.GetArrayLength())throw new Exception("Animation mismatch");int k=0;foreach(var frame in frames.EnumerateArray()){if(a.TileFrames[k].TileIndex!=frame.GetProperty("index").GetInt32())throw new Exception("Animation frame mismatch");k++;}}
    else if(actual is xTile.Tiles.AnimatedTile)throw new Exception($"Static tile unexpectedly animated {l.Id}/{x}/{y}");
   }
   checkedTiles++;x++;
  }y++;}
 }
 foreach(var sheet in expected.GetProperty("sheets").EnumerateArray())foreach(var t in sheet.GetProperty("tileProperties").EnumerateObject())foreach(var p in t.Value.EnumerateObject())if(loaded.GetTileSheet(sheet.GetProperty("id").GetString()).TileIndexProperties[int.Parse(t.Name)][p.Name].ToString()!=p.Value.GetString())throw new Exception("Tileset property mismatch");
 Console.WriteLine($"PASS SMAPI TMX reader: {checkedTiles} cells, {animations} animated cells, all map/tile/tileset properties.");return;
}
static Dictionary<string,string> Props(xTile.ObjectModel.IPropertyCollection p)=>p.ToDictionary(p=>p.Key,p=>p.Value.ToString());
static object TileData(xTile.Tiles.Tile t){if(t==null)return null;return new {sheet=t.TileSheet.Id,index=t.TileIndex,properties=Props(t.Properties),frames=t is xTile.Tiles.AnimatedTile a?a.TileFrames.Select(f=>new{sheet=f.TileSheet.Id,index=f.TileIndex}).ToArray():null,interval=t is xTile.Tiles.AnimatedTile b?b.FrameInterval:0};}
sealed class EmptyServices : IServiceProvider {public object GetService(Type t)=>null;}

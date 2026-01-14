/**
 * 将 GeoJSON 转换为矢量瓦片 (.pbf)
 * 
 * 使用方法：
 * 1. npm install geojson-vt vt-pbf
 * 2. node scripts/generate-vector-tiles.cjs
 */

const fs = require('fs');
const path = require('path');
const geojsonvt = require('geojson-vt').default || require('geojson-vt');
const vtpbf = require('vt-pbf');

// 配置
const INPUT_FILE = 'public/data/countries.geojson';
const OUTPUT_DIR = 'public/map-data/vector-tiles';
const MIN_ZOOM = 0;
const MAX_ZOOM = 6;

// 读取 GeoJSON
console.log('读取 GeoJSON 文件...');
const geojson = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

// 过滤无效数据
geojson.features = geojson.features.filter(f => {
  const isoCode = f.properties?.["ISO3166-1-Alpha-3"];
  return isoCode && isoCode !== "-99";
});

console.log(`共 ${geojson.features.length} 个国家`);

// 创建瓦片索引
console.log('创建瓦片索引...');
const tileIndex = geojsonvt(geojson, {
  maxZoom: MAX_ZOOM,
  tolerance: 3,
  extent: 4096,
  buffer: 64,
  lineMetrics: false,
  promoteId: 'ISO3166-1-Alpha-3'
});

// 生成瓦片
console.log('生成矢量瓦片...');
let tileCount = 0;

for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
  const numTiles = Math.pow(2, z);
  
  for (let x = 0; x < numTiles; x++) {
    for (let y = 0; y < numTiles; y++) {
      const tile = tileIndex.getTile(z, x, y);
      
      if (tile && tile.features && tile.features.length > 0) {
        // 转换为 PBF 格式
        const pbf = vtpbf.fromGeojsonVt({ countries: tile }, { version: 2 });
        
        // 创建目录
        const dir = path.join(OUTPUT_DIR, String(z), String(x));
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // 写入文件
        const filePath = path.join(dir, `${y}.pbf`);
        fs.writeFileSync(filePath, Buffer.from(pbf));
        tileCount++;
      }
    }
  }
  
  console.log(`  层级 ${z} 完成`);
}

console.log(`\n完成！共生成 ${tileCount} 个瓦片`);
console.log(`输出目录: ${OUTPUT_DIR}`);

<template>
  <div class="map-wrapper">
    <!-- 顶部标题栏 -->
    <div class="top-header">
      <div class="header-left">
        <span class="system-title">复杂事件预测系统</span>
        <span class="breadcrumb-divider">|</span>
        <span class="breadcrumb">主界面</span>
        <span class="breadcrumb-arrow">></span>
        <span class="breadcrumb active">态势分析</span>
      </div>
    </div>

    <!-- 图层切换按钮 -->
    <div class="layer-switch-bar">
      <button 
        :class="['layer-switch-btn', { active: currentLayer === 'event' }]"
        @click="switchLayer('event')"
      >
        事件发生频次
      </button>
      <button 
        :class="['layer-switch-btn', { active: currentLayer === 'security' }]"
        @click="switchLayer('security')"
      >
        国家安全等级
      </button>
    </div>

    <!-- 左侧抽屉菜单 -->
    <LeftDrawer 
      @toggle="onDrawerToggle"
      @select="onDrawerSelect"
    />

    <!-- 右侧抽屉菜单 -->
    <RightDrawer 
      @toggle="onRightDrawerToggle"
      @select="onRightDrawerSelect"
    />

    <!-- 概览图 -->
    <div 
      class="overview-map" 
      v-show="showOverview"
      :style="{ left: overviewPos.x + 'px', top: overviewPos.y + 'px' }"
    >
      <div class="overview-header" @mousedown="startDragOverview">
        <span>全球概览</span>
        <span class="overview-close" @click.stop="closeOverview">×</span>
      </div>
      <div id="overviewMap" class="overview-container"></div>
    </div>

    <!-- 国家详情面板 -->
    <CountryDetailPanel 
      :visible="showCountryDetail"
      :country="focusedCountry"
      @close="closeCountryDetail"
    />

    <!-- 事件时间轴 -->
    <EventTimeline 
      :countryCode="focusedCountry?.code || ''"
      :countryName="focusedCountry?.name || '全球'"
      @event-click="onTimelineEventClick"
      @filter-apply="onTimelineFilter"
    />

    <!-- 底部坐标栏 -->
    <div class="coord-bar">
      <span class="coord-item">
        <span class="coord-label">经度:</span>
        <span class="coord-value">{{ mouseCoord.lng }}</span>
      </span>
      <span class="coord-item">
        <span class="coord-label">纬度:</span>
        <span class="coord-value">{{ mouseCoord.lat }}</span>
      </span>
      <span class="coord-item">
        <span class="coord-label">缩放:</span>
        <span class="coord-value">{{ mouseCoord.zoom }}</span>
      </span>
    </div>

    <!-- 图例 -->
    <SecurityLegend v-if="currentLayer === 'security'" />
    <EventFrequencyLegend v-if="currentLayer === 'event'" />
    
    <div id="mapContainer" class="map-container"></div>
  </div>
</template>

<script>
import { getChineseName } from "@/data/countryNames";
import { getCountrySecurityColor, getSecurityLevel } from "@/data/securityLevels";
import { getCountryFrequencyColor } from "@/data/eventFrequency";
import CountryDetailPanel from "./CountryDetailPanel.vue";
import EventTimeline from "./EventTimeline.vue";
import LeftDrawer from "./LeftDrawer.vue";
import RightDrawer from "./RightDrawer.vue";
import SecurityLegend from "./SecurityLegend.vue";
import EventFrequencyLegend from "./EventFrequencyLegend.vue";

export default {
  name: "AMapComponent",
  components: {
    CountryDetailPanel,
    EventTimeline,
    LeftDrawer,
    RightDrawer,
    SecurityLegend,
    EventFrequencyLegend
  },
  data() {
    return {
      map: null,
      overviewMap: null,
      geojsonData: null,
      countryPolygons: {},  // code -> [polygons]
      labelMarkers: [],
      lastHoveredCode: null,
      showOverview: false,
      showCountryDetail: false,
      focusedCountry: null,
      currentLayer: 'security',
      overviewPos: { x: 10, y: 160 },
      isDraggingOverview: false,
      dragOffset: { x: 0, y: 0 },
      viewRectangle: null,
      mouseCoord: { lng: '---', lat: '---', zoom: '---' }
    };
  },
  mounted() {
    this.loadAMapScript();
    document.addEventListener('mousemove', this.onDragOverview);
    document.addEventListener('mouseup', this.stopDragOverview);
  },
  methods: {
    loadAMapScript() {
      window._AMapSecurityConfig = {
        securityJsCode: ''
      };
      
      if (window.AMap) {
        this.initMap();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://webapi.amap.com/maps?v=2.0&key=8c3c47a47331944914ddaf253158536b';
      script.onload = () => this.waitForAMap();
      script.onerror = () => console.error('高德地图加载失败');
      document.head.appendChild(script);
    },

    waitForAMap() {
      if (window.AMap) {
        this.initMap();
      } else {
        setTimeout(() => this.waitForAMap(), 30);
      }
    },

    initMap() {
      this.map = new AMap.Map('mapContainer', {
        zoom: 4,  // 提高初始缩放级别
        center: [105, 35],  // 以中国为中心
        mapStyle: 'amap://styles/normal',
        viewMode: '2D',
        zooms: [3.5, 18],  // 提高最小缩放级别，防止地图重复
        dragEnable: true,
        zoomEnable: true,
        doubleClickZoom: true,
        scrollWheel: true,
        limitBounds: new AMap.Bounds([-180, -85], [180, 85]),
        showIndoorMap: false,
        resizeEnable: true
      });

      // 监听缩放和拖动，强制限制边界
      this.map.on('mapmove', () => this.constrainMapBounds());
      this.map.on('zoomchange', () => this.constrainMapBounds());

      this.map.on('complete', () => {
        console.log('高德地图加载完成');
        this.loadCountryLayer();
        this.bindMapEvents();
      });
    },

    bindMapEvents() {
      this.map.on('mousemove', (e) => {
        this.mouseCoord = {
          lng: e.lnglat.getLng().toFixed(4) + '°',
          lat: e.lnglat.getLat().toFixed(4) + '°',
          zoom: this.map.getZoom().toFixed(1)
        };
      });

      this.map.on('moveend', () => {
        this.updateOverviewRect();
      });
    },

    constrainMapBounds() {
      const bounds = this.map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const center = this.map.getCenter();
      
      let newLng = center.getLng();
      let newLat = center.getLat();
      let needUpdate = false;
      
      // 计算当前视野宽度
      const viewWidth = ne.getLng() - sw.getLng();
      
      // 如果视野宽度超过360度，说明会出现重复，需要放大地图
      if (viewWidth >= 360) {
        this.map.setZoom(this.map.getZoom() + 0.5);
        return;
      }
      
      // 限制经度范围，防止看到重复的地图
      const maxLng = 180 - viewWidth / 2;
      const minLng = -180 + viewWidth / 2;
      
      if (newLng > maxLng) {
        newLng = maxLng;
        needUpdate = true;
      } else if (newLng < minLng) {
        newLng = minLng;
        needUpdate = true;
      }
      
      // 限制纬度范围
      if (sw.getLat() < -85) {
        newLat = center.getLat() + (-85 - sw.getLat());
        needUpdate = true;
      } else if (ne.getLat() > 85) {
        newLat = center.getLat() - (ne.getLat() - 85);
        needUpdate = true;
      }
      
      if (needUpdate) {
        this.map.setCenter([newLng, newLat]);
      }
    },

    loadCountryLayer() {
      fetch('/data/countries.geojson')
        .then(res => res.json())
        .then(data => {
          const features = data.features.filter(f => {
            const code = f.properties?.["ISO3166-1-Alpha-3"];
            return code && code !== "-99";
          });

          this.geojsonData = { ...data, features };
          this.renderCountries();
          this.applyCurrentLayer();
          console.log('国家边界加载完成');
        })
        .catch(err => console.error('加载GeoJSON失败:', err));
    },

    renderCountries() {
      this.geojsonData.features.forEach(feature => {
        let code = feature.properties["ISO3166-1-Alpha-3"];
        const name = feature.properties.name;
        
        // 台湾属于中国，统一使用CHN代码
        if (code === 'TWN') {
          code = 'CHN';
        }
        
        const chineseName = code === 'CHN' ? '中国' : getChineseName(name);
        
        const paths = this.convertToAMapPaths(feature.geometry);
        if (!paths.length) return;

        // 过滤跨越日期变更线的路径
        const validPaths = paths.filter(path => !this.isCrossingDateline(path));
        if (!validPaths.length) return;

        // 初始化或追加到已有的多边形数组
        if (!this.countryPolygons[code]) {
          this.countryPolygons[code] = [];
        }

        validPaths.forEach(path => {
          const polygon = new AMap.Polygon({
            path: path,
            fillColor: '#ffffff',
            fillOpacity: 0.1,
            strokeColor: code === 'CHN' ? '#ff0000' : '#ffffff',  // 中国边界用红色
            strokeWeight: code === 'CHN' ? 2 : 1,
            strokeOpacity: 0.8
          });

          polygon.setExtData({ code, name, chineseName });
          polygon.on('click', () => this.onCountryClick(code, chineseName));
          polygon.on('mouseover', () => this.onCountryHover(code));
          polygon.on('mouseout', () => this.onCountryOut(code));

          this.map.add(polygon);
          this.countryPolygons[code].push(polygon);
        });

        // 添加标签（台湾不单独添加标签，中国只添加一次）
        if (feature.properties["ISO3166-1-Alpha-3"] !== 'TWN' && validPaths.length > 0) {
          // 中国标签只在主体大陆添加
          if (code === 'CHN' && feature.properties["ISO3166-1-Alpha-3"] === 'CHN') {
            this.addCountryLabel(code, chineseName, validPaths);
          } else if (code !== 'CHN') {
            this.addCountryLabel(code, chineseName, validPaths);
          }
        }
      });
    },

    convertToAMapPaths(geometry) {
      const paths = [];
      
      if (geometry.type === 'Polygon') {
        paths.push(geometry.coordinates[0].map(c => [c[0], c[1]]));
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach(polygon => {
          paths.push(polygon[0].map(c => [c[0], c[1]]));
        });
      }
      
      return paths;
    },

    isCrossingDateline(path) {
      let hasEast = false, hasWest = false;
      for (const coord of path) {
        if (coord[0] > 170) hasEast = true;
        if (coord[0] < -170) hasWest = true;
        if (hasEast && hasWest) return true;
      }
      return false;
    },

    addCountryLabel(code, name, paths) {
      // 找最大的多边形
      let maxArea = 0, mainPath = paths[0];
      paths.forEach(path => {
        const area = this.calculateArea(path);
        if (area > maxArea) {
          maxArea = area;
          mainPath = path;
        }
      });

      const center = this.calculateCenter(mainPath);
      if (!center) return;

      const marker = new AMap.Text({
        text: name,
        position: center,
        style: {
          'background-color': 'transparent',
          'border': 'none',
          'color': '#ffffff',
          'font-size': this.getFontSize(maxArea) + 'px',
          'text-shadow': '1px 1px 2px #000, -1px -1px 2px #000, 1px -1px 2px #000, -1px 1px 2px #000'
        }
      });

      this.map.add(marker);
      this.labelMarkers.push(marker);
    },

    calculateArea(path) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      path.forEach(c => {
        minX = Math.min(minX, c[0]);
        maxX = Math.max(maxX, c[0]);
        minY = Math.min(minY, c[1]);
        maxY = Math.max(maxY, c[1]);
      });
      return (maxX - minX) * (maxY - minY);
    },

    calculateCenter(path) {
      let sumX = 0, sumY = 0;
      path.forEach(c => { sumX += c[0]; sumY += c[1]; });
      return [sumX / path.length, sumY / path.length];
    },

    getFontSize(area) {
      if (area > 2000) return 16;
      if (area > 500) return 14;
      if (area > 100) return 12;
      return 10;
    },

    onCountryClick(code, name) {
      // 台湾属于中国
      if (code === 'TWN') {
        code = 'CHN';
        name = '中国';
      }
      this.focusOnCountry(code, name);
    },

    onCountryHover(code) {
      // 台湾属于中国
      if (code === 'TWN') code = 'CHN';
      if (this.lastHoveredCode === code) return;

      // 恢复上一个
      if (this.lastHoveredCode) {
        this.restoreCountryStyle(this.lastHoveredCode);
      }

      this.lastHoveredCode = code;

      if (this.focusedCountry?.code !== code) {
        const polygons = this.countryPolygons[code] || [];
        const style = this.getCountryStyle(code);
        polygons.forEach(p => {
          p.setOptions({ 
            fillColor: style.color,
            fillOpacity: 0.9,  // 提高透明度突出显示
            strokeColor: '#333333',  // 深色边框
            strokeWeight: 2,
            strokeOpacity: 1
          });
        });
      }
    },

    onCountryOut(code) {
      // 由 onCountryHover 处理恢复
    },

    restoreCountryStyle(code) {
      const polygons = this.countryPolygons[code] || [];
      const style = this.getCountryStyle(code);
      const isChinaCode = code === 'CHN';
      polygons.forEach(p => {
        p.setOptions({ 
          fillColor: style.color, 
          fillOpacity: style.opacity,
          strokeColor: isChinaCode ? '#ff0000' : '#ffffff',
          strokeWeight: isChinaCode ? 2 : 1,
          strokeOpacity: 0.8
        });
      });
    },

    getCountryStyle(code) {
      if (this.currentLayer === 'security') {
        const color = getCountrySecurityColor(code);
        const level = getSecurityLevel(code);
        return { color, opacity: level === 0 ? 0.5 : 0.6 };
      } else {
        const color = getCountryFrequencyColor(code);
        return { color, opacity: 0.7 };
      }
    },

    focusOnCountry(code, name) {
      // 恢复之前聚焦的国家
      if (this.focusedCountry) {
        this.restoreCountryStyle(this.focusedCountry.code);
      }

      this.focusedCountry = { code, name };

      // 高亮当前国家
      const polygons = this.countryPolygons[code] || [];
      polygons.forEach(p => {
        p.setOptions({
          fillColor: '#2196F3',
          fillOpacity: 0.4,
          strokeColor: '#1565C0',
          strokeWeight: 3
        });
      });

      // 飞到该国家
      if (polygons.length > 0) {
        this.map.setFitView(polygons, false, [50, 50, 50, 50]);
      }

      this.showOverview = true;
      this.showCountryDetail = true;
      this.$nextTick(() => this.initOverviewMap());
    },

    switchLayer(layer) {
      this.currentLayer = layer;
      this.applyCurrentLayer();
    },

    applyCurrentLayer() {
      Object.keys(this.countryPolygons).forEach(code => {
        if (this.focusedCountry?.code === code) return;
        
        const style = this.getCountryStyle(code);
        const polygons = this.countryPolygons[code] || [];
        polygons.forEach(p => {
          p.setOptions({
            fillColor: style.color,
            fillOpacity: style.opacity,
            strokeColor: '#ffffff',
            strokeWeight: 1
          });
        });
      });
    },

    initOverviewMap() {
      if (this.overviewMap) {
        this.updateOverviewRect();
        return;
      }

      this.overviewMap = new AMap.Map('overviewMap', {
        zoom: 0,  // 最小缩放，显示全球
        center: [0, 0],  // 初始中心
        mapStyle: 'amap://styles/normal',
        dragEnable: false,
        zoomEnable: false,
        doubleClickZoom: false,
        scrollWheel: false
      });

      this.overviewMap.on('complete', () => {
        this.updateOverviewRect();
      });
    },

    updateOverviewRect() {
      if (!this.overviewMap) return;

      // 移除旧的矩形
      if (this.viewRectangle) {
        this.overviewMap.remove(this.viewRectangle);
      }

      // 获取主地图当前视野范围
      const bounds = this.map.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();

      // 创建红色矩形框表示当前视野
      this.viewRectangle = new AMap.Rectangle({
        bounds: new AMap.Bounds(sw, ne),
        fillColor: '#ff0000',
        fillOpacity: 0.2,
        strokeColor: '#ff0000',
        strokeWeight: 2,
        strokeStyle: 'solid'
      });
      this.overviewMap.add(this.viewRectangle);

      // 将概览图中心设置为当前视野的中心
      const centerLng = (sw.getLng() + ne.getLng()) / 2;
      const centerLat = (sw.getLat() + ne.getLat()) / 2;
      this.overviewMap.setCenter([centerLng, centerLat]);
    },

    closeOverview() {
      this.showOverview = false;
      this.showCountryDetail = false;
      
      if (this.focusedCountry) {
        this.restoreCountryStyle(this.focusedCountry.code);
      }
      this.focusedCountry = null;
      this.map.setZoomAndCenter(3, [105, 35]);
    },

    closeCountryDetail() {
      this.showCountryDetail = false;
    },

    startDragOverview(e) {
      this.isDraggingOverview = true;
      this.dragOffset = {
        x: e.clientX - this.overviewPos.x,
        y: e.clientY - this.overviewPos.y
      };
    },

    onDragOverview(e) {
      if (!this.isDraggingOverview) return;
      this.overviewPos = {
        x: Math.max(0, e.clientX - this.dragOffset.x),
        y: Math.max(0, e.clientY - this.dragOffset.y)
      };
    },

    stopDragOverview() {
      this.isDraggingOverview = false;
    },

    onDrawerToggle(v) { console.log('左侧抽屉:', v); },
    onDrawerSelect(id) { console.log('左侧选择:', id); },
    onRightDrawerToggle(v) { console.log('右侧抽屉:', v); },
    onRightDrawerSelect(id) { console.log('右侧选择:', id); },
    onTimelineEventClick(e) { console.log('时间轴事件:', e); },
    onTimelineFilter(f) { console.log('时间轴筛选:', f); }
  },
  beforeUnmount() {
    document.removeEventListener('mousemove', this.onDragOverview);
    document.removeEventListener('mouseup', this.stopDragOverview);
    if (this.map) this.map.destroy();
    if (this.overviewMap) this.overviewMap.destroy();
  }
};
</script>


<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
}

.map-container {
  width: 100%;
  height: 100%;
}

.top-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 70px;
  background: rgba(255, 255, 255, 0.98);
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  padding: 0 40px;
  z-index: 1001;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.system-title {
  font-size: 26px;
  font-weight: 600;
  color: #1f2937;
}

.breadcrumb-divider {
  color: #d1d5db;
  font-size: 24px;
}

.breadcrumb {
  font-size: 18px;
  color: #6b7280;
}

.breadcrumb-arrow {
  color: #9ca3af;
  font-size: 16px;
}

.breadcrumb.active {
  color: #374151;
}

.layer-switch-bar {
  position: absolute;
  top: 70px;
  left: 0;
  right: 0;
  display: flex;
  gap: 12px;
  z-index: 1000;
  background: #f3f4f6;
  padding: 6px 40px;
  border-bottom: 1px solid #e5e7eb;
}

.layer-switch-btn {
  padding: 14px 40px;
  font-size: 18px;
  border: 1px solid #d1d5db;
  background: #ffffff;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 8px;
}

.layer-switch-btn:hover {
  background: #e5e7eb;
}

.layer-switch-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: #ffffff;
}

.overview-map {
  position: absolute;
  z-index: 1500;
  width: 500px;
  height: 380px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85));
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  user-select: none;
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.5);
  color: #1f2937;
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid rgba(200, 200, 200, 0.4);
  cursor: move;
}

.overview-close {
  cursor: pointer;
  font-size: 18px;
  color: #6b7280;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.2s;
}

.overview-close:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.overview-container {
  width: 100%;
  height: calc(100% - 45px);
  border-radius: 0 0 16px 16px;
  overflow: hidden;
}

.coord-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 28px;
  background: rgba(15, 23, 42, 0.9);
  border-top: 1px solid rgba(100, 150, 255, 0.2);
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 30px;
  z-index: 998;
}

.coord-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.coord-label {
  font-size: 12px;
  color: #64748b;
}

.coord-value {
  font-size: 12px;
  color: #4fc3f7;
  font-family: 'Consolas', monospace;
  min-width: 80px;
}
</style>

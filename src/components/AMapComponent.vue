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
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
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
      countryLayers: {},  // code -> layer
      geoJsonLayer: null,
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
    this.initMap();
    document.addEventListener('mousemove', this.onDragOverview);
    document.addEventListener('mouseup', this.stopDragOverview);
  },
  methods: {
    initMap() {
      // 创建地图，以中国为中心
      this.map = L.map('mapContainer', {
        center: [30, 105],
        zoom: 4,
        minZoom: 4,
        maxZoom: 7,
        zoomControl: true,
        attributionControl: false,
        maxBounds: [[-90, -180], [90, 180]],
        maxBoundsViscosity: 1.0,
        worldCopyJump: false
      });

      // 设置背景色与海洋颜色一致
      document.getElementById('mapContainer').style.backgroundColor = '#b5d6f1';

      // 添加离线天地图矢量底图
      L.tileLayer('/tiles/vec_w/{z}/{y}/{x}.png', {
        maxZoom: 7,
        minZoom: 4,
        noWrap: true
      }).addTo(this.map);

      // 添加离线天地图注记图层
      L.tileLayer('/tiles/cva_w/{z}/{y}/{x}.png', {
        maxZoom: 7,
        minZoom: 4,
        noWrap: true
      }).addTo(this.map);

      // 绑定事件
      this.map.on('mousemove', (e) => {
        this.mouseCoord = {
          lng: e.latlng.lng.toFixed(4) + '°',
          lat: e.latlng.lat.toFixed(4) + '°',
          zoom: this.map.getZoom()
        };
      });

      this.map.on('moveend', () => {
        this.updateOverviewRect();
      });

      // 加载国家边界
      this.loadCountryLayer();
    },

    loadCountryLayer() {
      fetch('/data/countries.geojson')
        .then(res => res.json())
        .then(data => {
          const features = data.features.filter(f => {
            const code = f.properties?.["ISO3166-1-Alpha-3"];
            return code && code !== "-99";
          });

          // 处理台湾属于中国
          features.forEach(f => {
            if (f.properties["ISO3166-1-Alpha-3"] === 'TWN') {
              f.properties["ISO3166-1-Alpha-3"] = 'CHN';
            }
          });

          this.geojsonData = { ...data, features };
          this.renderCountries();
          console.log('国家边界加载完成');
        })
        .catch(err => console.error('加载GeoJSON失败:', err));
    },

    renderCountries() {
      this.geoJsonLayer = L.geoJSON(this.geojsonData, {
        style: (feature) => this.getFeatureStyle(feature),
        onEachFeature: (feature, layer) => {
          const code = feature.properties["ISO3166-1-Alpha-3"];
          const name = feature.properties.name;
          const chineseName = code === 'CHN' ? '中国' : getChineseName(name);

          // 存储图层引用
          if (!this.countryLayers[code]) {
            this.countryLayers[code] = [];
          }
          this.countryLayers[code].push(layer);

          // 绑定事件
          layer.on('click', () => this.onCountryClick(code, chineseName));
          layer.on('mouseover', () => this.onCountryHover(code, layer));
          layer.on('mouseout', () => this.onCountryOut(code));
        }
      }).addTo(this.map);
    },

    getFeatureStyle(feature) {
      const code = feature.properties["ISO3166-1-Alpha-3"];
      const style = this.getCountryStyle(code);
      const isChina = code === 'CHN';
      
      return {
        fillColor: style.color,
        fillOpacity: style.opacity,
        color: isChina ? '#ff0000' : '#ffffff',
        weight: isChina ? 2 : 1,
        opacity: 0.8
      };
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

    onCountryClick(code, name) {
      if (code === 'TWN') {
        code = 'CHN';
        name = '中国';
      }
      this.focusOnCountry(code, name);
    },

    onCountryHover(code) {
      if (code === 'TWN') code = 'CHN';
      if (this.lastHoveredCode === code) return;

      if (this.lastHoveredCode) {
        this.restoreCountryStyle(this.lastHoveredCode);
      }

      this.lastHoveredCode = code;

      if (this.focusedCountry?.code !== code) {
        const layers = this.countryLayers[code] || [];
        const style = this.getCountryStyle(code);
        layers.forEach(layer => {
          layer.setStyle({
            fillColor: style.color,
            fillOpacity: 0.9,
            color: '#333333',
            weight: 2,
            opacity: 1
          });
        });
      }
    },

    onCountryOut(code) {
      // 由 onCountryHover 处理恢复
    },

    restoreCountryStyle(code) {
      const layers = this.countryLayers[code] || [];
      const style = this.getCountryStyle(code);
      const isChina = code === 'CHN';
      layers.forEach(layer => {
        layer.setStyle({
          fillColor: style.color,
          fillOpacity: style.opacity,
          color: isChina ? '#ff0000' : '#ffffff',
          weight: isChina ? 2 : 1,
          opacity: 0.8
        });
      });
    },

    focusOnCountry(code, name) {
      if (this.focusedCountry) {
        this.restoreCountryStyle(this.focusedCountry.code);
      }

      this.focusedCountry = { code, name };

      const layers = this.countryLayers[code] || [];
      layers.forEach(layer => {
        layer.setStyle({
          fillColor: '#2196F3',
          fillOpacity: 0.4,
          color: '#1565C0',
          weight: 3
        });
      });

      // 飞到该国家
      if (layers.length > 0) {
        const bounds = L.featureGroup(layers).getBounds();
        this.map.fitBounds(bounds, { padding: [50, 50] });
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
      Object.keys(this.countryLayers).forEach(code => {
        if (this.focusedCountry?.code === code) return;
        
        const style = this.getCountryStyle(code);
        const isChina = code === 'CHN';
        const layers = this.countryLayers[code] || [];
        layers.forEach(layer => {
          layer.setStyle({
            fillColor: style.color,
            fillOpacity: style.opacity,
            color: isChina ? '#ff0000' : '#ffffff',
            weight: isChina ? 2 : 1
          });
        });
      });
    },

    initOverviewMap() {
      if (this.overviewMap) {
        this.updateOverviewRect();
        return;
      }

      this.overviewMap = L.map('overviewMap', {
        center: [0, 0],
        zoom: 1,
        minZoom: 1,
        maxZoom: 3,
        dragging: false,
        zoomControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false
      });

      L.tileLayer('/tiles/vec_w/{z}/{y}/{x}.png', {
        maxZoom: 7,
        minZoom: 1
      }).addTo(this.overviewMap);

      this.updateOverviewRect();
    },

    updateOverviewRect() {
      if (!this.overviewMap) return;

      if (this.viewRectangle) {
        this.overviewMap.removeLayer(this.viewRectangle);
      }

      const bounds = this.map.getBounds();
      this.viewRectangle = L.rectangle(bounds, {
        color: '#ff0000',
        weight: 2,
        fillColor: '#ff0000',
        fillOpacity: 0.2
      }).addTo(this.overviewMap);

      this.overviewMap.setView(bounds.getCenter(), 1);
    },

    closeOverview() {
      this.showOverview = false;
      this.showCountryDetail = false;
      
      if (this.focusedCountry) {
        this.restoreCountryStyle(this.focusedCountry.code);
      }
      this.focusedCountry = null;
      this.map.setView([35, 105], 4);
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
    if (this.map) this.map.remove();
    if (this.overviewMap) this.overviewMap.remove();
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

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

    <!-- 左上角概览图 -->
    <div 
      class="overview-map" 
      v-show="showOverview"
      :style="{ left: overviewPos.x + 'px', top: overviewPos.y + 'px' }"
    >
      <div 
        class="overview-header"
        @mousedown="startDragOverview"
      >
        <span>全球概览</span>
        <span class="overview-close" @click.stop="closeOverview">×</span>
      </div>
      <div id="overviewMap" class="overview-container"></div>
    </div>

    <!-- 右侧国家详情面板 -->
    <CountryDetailPanel 
      :visible="showCountryDetail"
      :country="focusedCountry"
      @close="closeCountryDetail"
    />

    <!-- 事件时间轴分布 -->
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
    
    <!-- 主地图容器 -->
    <div id="mainMap" class="map-container"></div>
  </div>
</template>

<script>
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getChineseName } from "@/data/countryNames";
import { getCountrySecurityColor, getSecurityLevel } from "@/data/securityLevels";
import LeftDrawer from "./LeftDrawer.vue";
import RightDrawer from "./RightDrawer.vue";
import CountryDetailPanel from "./CountryDetailPanel.vue";
import EventTimeline from "./EventTimeline.vue";

export default {
  name: "LeafletMap",
  components: {
    LeftDrawer,
    RightDrawer,
    CountryDetailPanel,
    EventTimeline
  },
  data() {
    return {
      map: null,
      overviewMap: null,
      canvasRenderer: null,
      countryLayer: null,
      labelLayer: null,
      geojsonData: null,
      countryLayers: {},
      lastHoveredCode: null,
      showOverview: false,
      showCountryDetail: false,
      focusedCountry: null,
      currentLayer: 'security',
      // 概览图
      overviewPos: { x: 10, y: 160 },
      isDraggingOverview: false,
      dragOffset: { x: 0, y: 0 },
      viewRectangle: null,
      // 鼠标坐标
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
      // 创建Canvas渲染器（全局复用，减少重绘）
      this.canvasRenderer = L.canvas({ 
        padding: 0.5,
        tolerance: 5  // 增加点击容差
      });

      // 创建主地图
      this.map = L.map('mainMap', {
        center: [35, 105],
        zoom: 3,
        minZoom: 2,
        maxZoom: 6,
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true,
        renderer: this.canvasRenderer,
        fadeAnimation: false,  // 禁用淡入淡出动画
        zoomAnimation: true,
        markerZoomAnimation: false
      });

      // 添加离线瓦片图层
      L.tileLayer('/map-data/tiles/{z}/{x}/{y}.png', {
        minZoom: 2,
        maxZoom: 6,
        noWrap: true,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 2  // 减少缓冲区
      }).addTo(this.map);

      // 加载国家边界
      this.loadCountryLayer();

      // 绑定鼠标移动事件（节流100ms）
      let moveTimer = null;
      this.map.on('mousemove', (e) => {
        if (moveTimer) return;
        moveTimer = setTimeout(() => {
          moveTimer = null;
          this.mouseCoord = {
            lng: e.latlng.lng.toFixed(4) + '°',
            lat: e.latlng.lat.toFixed(4) + '°',
            zoom: this.map.getZoom()
          };
        }, 100);
      });

      // 缩放变化时更新概览图
      this.map.on('moveend', () => {
        this.updateOverviewRect();
      });

      // 鼠标离开地图时清理hover状态
      this.map.on('mouseout', () => {
        if (this.lastHoveredCode && this.countryLayers[this.lastHoveredCode]) {
          const layer = this.countryLayers[this.lastHoveredCode];
          const isFocused = this.focusedCountry?.code === this.lastHoveredCode;
          if (!isFocused) {
            this.restoreLayerStyle(this.lastHoveredCode, layer);
          }
          this.lastHoveredCode = null;
        }
      });
    },

    loadCountryLayer() {
      fetch('/data/countries.geojson')
        .then(res => res.json())
        .then(data => {
          // 过滤无效数据
          this.geojsonData = {
            ...data,
            features: data.features.filter(f => {
              const code = f.properties?.["ISO3166-1-Alpha-3"];
              return code && code !== "-99";
            })
          };

          // 使用全局Canvas渲染器创建GeoJSON图层
          this.countryLayer = L.geoJSON(this.geojsonData, {
            renderer: this.canvasRenderer,
            style: (feature) => this.getCountryStyle(feature),
            onEachFeature: (feature, layer) => {
              const code = feature.properties["ISO3166-1-Alpha-3"];
              this.countryLayers[code] = layer;
              
              // 绑定事件（使用节流）
              layer.on('click', () => this.onCountryClick(feature, layer));
              layer.on('mouseover', this.throttle(() => this.onCountryHover(feature, layer), 50));
              layer.on('mouseout', this.throttle(() => this.onCountryOut(feature, layer), 50));
            }
          }).addTo(this.map);
          
          // 应用默认图层样式
          this.applySecurityLayer();
          
          console.log("国家边界加载完成");
        })
        .catch(err => console.error("加载 GeoJSON 失败:", err));
    },

    // 节流函数
    throttle(fn, delay) {
      let lastCall = 0;
      return function(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
          lastCall = now;
          fn.apply(this, args);
        }
      };
    },

    getCountryStyle(feature) {
      const code = feature.properties["ISO3166-1-Alpha-3"];
      const color = getCountrySecurityColor(code);
      const level = getSecurityLevel(code);
      return {
        fillColor: color,
        fillOpacity: level === 0 ? 0.2 : 0.5,
        color: '#ffffff',
        weight: 1
      };
    },

    onCountryClick(feature, layer) {
      let code = feature.properties["ISO3166-1-Alpha-3"];
      let name = feature.properties.name;
      
      if (code === "TWN") {
        code = "CHN";
        name = "China";
      }
      
      const chineseName = getChineseName(name);
      this.focusOnCountry(code, chineseName, layer);
    },

    onCountryHover(feature, layer) {
      let code = feature.properties["ISO3166-1-Alpha-3"];
      if (code === "TWN") code = "CHN";
      
      // 避免重复处理
      if (this.lastHoveredCode === code) return;
      
      // 恢复上一个hover的国家样式
      if (this.lastHoveredCode && this.countryLayers[this.lastHoveredCode]) {
        const prevLayer = this.countryLayers[this.lastHoveredCode];
        const isFocused = this.focusedCountry?.code === this.lastHoveredCode;
        if (!isFocused) {
          this.restoreLayerStyle(this.lastHoveredCode, prevLayer);
        }
      }
      
      this.lastHoveredCode = code;
      
      const isFocused = this.focusedCountry?.code === code;
      if (!isFocused) {
        layer.setStyle({
          fillColor: '#66bb6a',
          fillOpacity: 0.5
        });
      }
    },

    onCountryOut(feature, layer) {
      // mouseout时不立即恢复，让mouseover处理
      // 这样可以避免快速移动时的闪烁
    },

    // 恢复图层样式
    restoreLayerStyle(code, layer) {
      if (this.currentLayer === 'security') {
        const color = getCountrySecurityColor(code);
        const level = getSecurityLevel(code);
        layer.setStyle({
          fillColor: color,
          fillOpacity: level === 0 ? 0.2 : 0.5
        });
      } else {
        layer.setStyle({
          fillColor: '#ff9800',
          fillOpacity: 0.3
        });
      }
    },

    focusOnCountry(code, name, layer) {
      // 清除之前的聚焦样式
      if (this.focusedCountry && this.countryLayers[this.focusedCountry.code]) {
        const prevLayer = this.countryLayers[this.focusedCountry.code];
        const prevCode = this.focusedCountry.code;
        const color = getCountrySecurityColor(prevCode);
        const level = getSecurityLevel(prevCode);
        prevLayer.setStyle({
          fillColor: color,
          fillOpacity: level === 0 ? 0.2 : 0.5,
          weight: 1
        });
      }

      // 设置新的聚焦
      this.focusedCountry = { code, name, layer };
      layer.setStyle({
        fillColor: '#2196F3',
        fillOpacity: 0.4,
        color: '#1565C0',
        weight: 3
      });

      // 飞到该国家
      this.map.fitBounds(layer.getBounds(), { padding: [50, 50] });

      // 显示概览图和详情面板
      this.showOverview = true;
      this.showCountryDetail = true;
      this.$nextTick(() => this.initOverviewMap());
    },

    // 图层切换
    switchLayer(layer) {
      this.currentLayer = layer;
      if (layer === 'security') {
        this.applySecurityLayer();
      } else {
        this.applyEventLayer();
      }
    },

    applySecurityLayer() {
      if (!this.countryLayer) return;
      
      this.countryLayer.eachLayer(layer => {
        const code = layer.feature.properties["ISO3166-1-Alpha-3"];
        const color = getCountrySecurityColor(code);
        const level = getSecurityLevel(code);
        layer.setStyle({
          fillColor: color,
          fillOpacity: level === 0 ? 0.2 : 0.5,
          color: '#ffffff',
          weight: 1
        });
      });
    },

    applyEventLayer() {
      if (!this.countryLayer) return;
      
      this.countryLayer.eachLayer(layer => {
        const eventCount = Math.random();
        let color;
        if (eventCount > 0.7) color = "#e65100";
        else if (eventCount > 0.4) color = "#ff9800";
        else color = "#fff3e0";
        
        layer.setStyle({
          fillColor: color,
          fillOpacity: 0.5,
          color: '#ffffff',
          weight: 1
        });
      });
    },

    // 概览图
    initOverviewMap() {
      if (this.overviewMap) {
        this.updateOverviewRect();
        return;
      }

      this.overviewMap = L.map('overviewMap', {
        center: [20, 0],
        zoom: 1,
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false
      });

      L.tileLayer('/map-data/tiles/{z}/{x}/{y}.png', {
        minZoom: 1,
        maxZoom: 5,
        noWrap: true
      }).addTo(this.overviewMap);

      this.updateOverviewRect();
    },

    updateOverviewRect() {
      if (!this.overviewMap) return;

      // 移除旧的矩形
      if (this.viewRectangle) {
        this.overviewMap.removeLayer(this.viewRectangle);
      }

      // 获取主地图视野范围
      const bounds = this.map.getBounds();
      
      // 创建红色矩形
      this.viewRectangle = L.rectangle(bounds, {
        color: '#ff0000',
        weight: 2,
        fillColor: '#ff0000',
        fillOpacity: 0.2
      }).addTo(this.overviewMap);
    },

    closeOverview() {
      this.showOverview = false;
      this.showCountryDetail = false;
      
      // 恢复聚焦国家样式
      if (this.focusedCountry && this.countryLayers[this.focusedCountry.code]) {
        const layer = this.countryLayers[this.focusedCountry.code];
        const code = this.focusedCountry.code;
        const color = getCountrySecurityColor(code);
        const level = getSecurityLevel(code);
        layer.setStyle({
          fillColor: color,
          fillOpacity: level === 0 ? 0.2 : 0.5,
          color: '#ffffff',
          weight: 1
        });
      }
      this.focusedCountry = null;

      // 恢复全局视图
      this.map.setView([35, 105], 3);
    },

    closeCountryDetail() {
      this.showCountryDetail = false;
    },

    // 拖动概览图
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

    // 事件处理
    onDrawerToggle(isCollapsed) {
      console.log('左侧抽屉:', isCollapsed ? '收起' : '展开');
    },

    onDrawerSelect(itemId) {
      console.log('左侧选择:', itemId);
    },

    onRightDrawerToggle(isCollapsed) {
      console.log('右侧抽屉:', isCollapsed ? '收起' : '展开');
    },

    onRightDrawerSelect(itemId) {
      console.log('右侧选择:', itemId);
    },

    onTimelineEventClick(event) {
      console.log('时间轴事件:', event);
    },

    onTimelineFilter(filter) {
      console.log('时间轴筛选:', filter);
    }
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
  background: #0d0d1a;
}

/* 顶部标题栏 */
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

/* 图层切换按钮栏 */
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

/* 概览图 */
.overview-map {
  position: absolute;
  z-index: 999;
  width: 500px;
  height: 400px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(100, 150, 255, 0.3);
  border-radius: 4px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  overflow: hidden;
  user-select: none;
}

.overview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: rgba(30, 41, 59, 0.9);
  color: #94a3b8;
  font-size: 12px;
  border-bottom: 1px solid rgba(100, 150, 255, 0.2);
  cursor: move;
}

.overview-close {
  cursor: pointer;
  font-size: 14px;
  color: #64748b;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
}

.overview-close:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.overview-container {
  width: 100%;
  height: calc(100% - 30px);
  background: #0d0d1a;
}

/* 底部坐标栏 */
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

/* 国家标签样式 */
:deep(.country-label) {
  background: transparent;
  border: none;
  color: #ffffff;
  text-shadow: 
    -1px -1px 0 #000,
    1px -1px 0 #000,
    -1px 1px 0 #000,
    1px 1px 0 #000;
  font-family: "Microsoft YaHei", sans-serif;
  white-space: nowrap;
  text-align: center;
}
</style>

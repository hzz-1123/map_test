<template>
  <div class="map-wrapper">
    <!-- 加载遮罩 -->
    <div class="loading-mask" v-if="isLoading">
      <div class="loading-spinner"></div>
      <span>地图加载中...</span>
    </div>

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

    <!-- 左上角概览图（可拖动） -->
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
      <div id="overviewContainer" class="overview-container"></div>
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

    <!-- 底部经纬度显示 -->
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
        <span class="coord-label">高度:</span>
        <span class="coord-value">{{ mouseCoord.alt }}</span>
      </span>
    </div>

    <!-- 安全等级图例 -->
    <SecurityLegend v-if="currentLayer === 'security'" />

    <!-- 事件频次图例 -->
    <EventFrequencyLegend v-if="currentLayer === 'event'" />
    
    <div id="mars3dContainer" class="map-container"></div>
  </div>
</template>

<script>
import "mars3d-cesium/Build/Cesium/Widgets/widgets.css";
import "mars3d/mars3d.css";

import * as mars3d from "mars3d";
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
  name: "Mars3dMap",
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
      viewRectLayer: null,
      viewRectGraphic: null,
      countryLayer: null,
      labelLayer: null,
      geojsonData: null,
      lastHoveredCode: null,
      showOverview: false,
      showCountryDetail: false,
      focusedCountry: null,
      currentLayer: 'security',
      overviewPos: { x: 10, y: 160 },
      isDraggingOverview: false,
      dragOffset: { x: 0, y: 0 },
      mouseCoord: { lng: '---', lat: '---', alt: '---' },
      mouseMoveTimer: null,
      cameraChangeTimer: null,
      isLoading: true
    };
  },
  mounted() {
    this.initMap();
    document.addEventListener('mousemove', this.onDragOverview);
    document.addEventListener('mouseup', this.stopDragOverview);
  },
  methods: {
    initMap() {
      const Cesium = mars3d.Cesium;
      
      this.map = new mars3d.Map("mars3dContainer", {
        scene: {
          center: { lat: 35, lng: 105, alt: 10000000, heading: 0, pitch: -90 },
          sceneMode: Cesium.SceneMode.SCENE2D,
          requestRenderMode: false,
          fxaa: false,
          showSun: false,
          showMoon: false,
          showSkyBox: false,
          showSkyAtmosphere: false,
          backgroundColor: "#0d0d1a",
          cameraController: {
            minimumZoomDistance: 500000,
            maximumZoomDistance: 50000000
          }
        },
        basemaps: [
          {
            name: "高德电子",
            type: "gaode",
            layer: "vec",
            show: true
          }
        ],
        terrain: { show: false }
      });

      const scene = this.map.scene;
      if (scene.globe) {
        scene.globe.showGroundAtmosphere = false;
        scene.globe.baseColor = Cesium.Color.fromCssColorString("#0d0d1a");
      }
      scene.backgroundColor = Cesium.Color.fromCssColorString("#0d0d1a");

      // 限制地图范围，禁止左右循环滚动
      const camera = scene.camera;
      let lastValidPosition = null;
      
      scene.postUpdate.addEventListener(() => {
        const rect = this.map.getExtent();
        if (!rect) return;
        
        const viewWidth = rect.xmax - rect.xmin;
        
        // 如果视野宽度已经覆盖全球（>=360度），禁止左右拖动
        if (viewWidth >= 360) {
          // 强制居中
          if (Math.abs((rect.xmin + rect.xmax) / 2) > 1) {
            camera.setView({
              destination: Cesium.Rectangle.fromDegrees(-180, rect.ymin, 180, rect.ymax)
            });
          }
          return;
        }
        
        // 视野小于全球时，限制不能超出边界
        let needFix = false;
        let newXmin = rect.xmin;
        let newXmax = rect.xmax;
        
        if (rect.xmin < -180) {
          // 左边超出了，整体右移
          newXmin = -180;
          newXmax = -180 + viewWidth;
          needFix = true;
        } else if (rect.xmax > 180) {
          // 右边超出了，整体左移
          newXmax = 180;
          newXmin = 180 - viewWidth;
          needFix = true;
        }
        
        if (needFix) {
          camera.setView({
            destination: Cesium.Rectangle.fromDegrees(newXmin, rect.ymin, newXmax, rect.ymax)
          });
        }
      });

      this.map.on(mars3d.EventType.load, () => {
        console.log("mars3d 地图初始化成功！");
        this.isLoading = false;
        this.bindMouseMoveEvent();
        this.loadCountryLayer();
      });
    },

    loadCountryLayer() {
      fetch('/data/countries.geojson')
        .then(res => res.json())
        .then(data => {
          // 过滤无效数据
          const filteredFeatures = data.features.filter(f => {
            const code = f.properties?.["ISO3166-1-Alpha-3"];
            return code && code !== "-99";
          });

          // 处理跨越日期变更线的多边形，分割成东西两部分
          const processedFeatures = [];
          filteredFeatures.forEach(f => {
            const processed = this.processDatelineCrossing(f);
            processedFeatures.push(...processed);
          });

          this.geojsonData = {
            ...data,
            features: processedFeatures
          };

          this.countryLayer = new mars3d.layer.GeoJsonLayer({
            data: this.geojsonData,
            symbol: {
              type: "polygon",
              styleOptions: {
                fill: true,
                color: "#ffffff",
                opacity: 0.01,
                outline: true,
                outlineColor: "#ffffff",
                outlineWidth: 1
              }
            },
            flyTo: false
          });

          this.map.addLayer(this.countryLayer);
          this.addCountryLabels();
          this.bindCountryEvents();
          this.applySecurityLayer();
          console.log("国家边界加载完成");
        })
        .catch(err => console.error("加载 GeoJSON 失败:", err));
    },

    // 处理跨越日期变更线的多边形 - 移除跨越的部分
    processDatelineCrossing(feature) {
      const geometry = feature.geometry;
      if (!geometry) return [feature];

      // 检查单个环是否跨越日期变更线
      const isCrossing = (ring) => {
        let hasEast = false;
        let hasWest = false;
        
        for (const coord of ring) {
          if (coord[0] > 170) hasEast = true;
          if (coord[0] < -170) hasWest = true;
          if (hasEast && hasWest) return true;
        }
        return false;
      };

      if (geometry.type === "Polygon") {
        if (isCrossing(geometry.coordinates[0])) {
          return [];
        }
        return [feature];
      } else if (geometry.type === "MultiPolygon") {
        const validPolygons = geometry.coordinates.filter(polygon => {
          return !isCrossing(polygon[0]);
        });

        if (validPolygons.length === 0) {
          return [];
        }

        return [{
          ...feature,
          geometry: {
            type: validPolygons.length === 1 ? "Polygon" : "MultiPolygon",
            coordinates: validPolygons.length === 1 ? validPolygons[0] : validPolygons
          }
        }];
      }
      
      return [feature];
    },

    addCountryLabels() {
      this.labelLayer = new mars3d.layer.GraphicLayer();
      this.map.addLayer(this.labelLayer);

      this.geojsonData.features.forEach(feature => {
        const props = feature.properties;
        const name = props?.name;
        if (!name || !feature.geometry) return;

        const geoInfo = this.calculateGeometryInfo(feature.geometry);
        if (!geoInfo) return;

        const chineseName = getChineseName(name);
        const fontSize = this.getFontSizeByArea(geoInfo.area);

        const label = new mars3d.graphic.LabelEntity({
          position: [geoInfo.lng, geoInfo.lat, 0],
          style: {
            text: chineseName,
            font_size: fontSize,
            font_family: "Microsoft YaHei",
            font_weight: fontSize >= 18 ? "bold" : "normal",
            color: "#ffffff",
            outline: true,
            outlineColor: "#000000",
            outlineWidth: fontSize >= 18 ? 3 : 2,
            background: false,
            horizontalOrigin: mars3d.Cesium.HorizontalOrigin.CENTER,
            verticalOrigin: mars3d.Cesium.VerticalOrigin.CENTER,
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
            scaleByDistance: new mars3d.Cesium.NearFarScalar(1000000, 1.2, 20000000, 0.5)
          },
          attr: { code: props["ISO3166-1-Alpha-3"], name: chineseName }
        });

        this.labelLayer.addGraphic(label);
      });
    },

    calculateGeometryInfo(geometry) {
      let polygons = [];
      
      if (geometry.type === "Polygon") {
        if (geometry.coordinates[0]) polygons.push(geometry.coordinates[0]);
      } else if (geometry.type === "MultiPolygon") {
        geometry.coordinates.forEach(polygon => {
          if (polygon[0]) polygons.push(polygon[0]);
        });
      }
      
      if (polygons.length === 0) return null;
      
      let maxArea = 0;
      let mainPolygon = polygons[0];
      
      polygons.forEach(ring => {
        let area = 0;
        for (let i = 0; i < ring.length - 1; i++) {
          const [x1, y1] = ring[i];
          const [x2, y2] = ring[i + 1];
          area += (x2 - x1) * (y2 + y1);
        }
        area = Math.abs(area / 2);
        if (area > maxArea) {
          maxArea = area;
          mainPolygon = ring;
        }
      });
      
      let minLng = Infinity, maxLng = -Infinity;
      let minLat = Infinity, maxLat = -Infinity;
      
      mainPolygon.forEach(coord => {
        if (Array.isArray(coord) && coord.length >= 2) {
          minLng = Math.min(minLng, coord[0]);
          maxLng = Math.max(maxLng, coord[0]);
          minLat = Math.min(minLat, coord[1]);
          maxLat = Math.max(maxLat, coord[1]);
        }
      });
      
      return {
        lng: (minLng + maxLng) / 2,
        lat: (minLat + maxLat) / 2,
        area: (maxLng - minLng) * (maxLat - minLat)
      };
    },

    getFontSizeByArea(area) {
      if (area > 2000) return 22;
      if (area > 500) return 18;
      if (area > 100) return 15;
      if (area > 20) return 12;
      return 10;
    },

    bindCountryEvents() {
      this.countryLayer.on(mars3d.EventType.click, (event) => {
        if (!event.graphic) return;
        
        const attr = event.graphic.attr;
        let code = attr["ISO3166-1-Alpha-3"];
        let name = attr.name;
        
        if (code === "TWN") {
          code = "CHN";
          name = "China";
        }
        
        const chineseName = getChineseName(name);
        this.focusOnCountry(code, chineseName, event.graphic);
      });

      this.countryLayer.on(mars3d.EventType.mouseOver, (event) => {
        if (!event.graphic) return;
        let code = event.graphic.attr["ISO3166-1-Alpha-3"];
        if (code === "TWN") code = "CHN";
        
        if (this.lastHoveredCode === code) return;
        this.lastHoveredCode = code;
        
        const isFocused = this.focusedCountry?.code === code;
        if (!isFocused) {
          event.graphic.setStyle({ color: "#66bb6a", opacity: 0.5 });
        }
      });

      this.countryLayer.on(mars3d.EventType.mouseOut, (event) => {
        if (!event.graphic) return;
        let code = event.graphic.attr["ISO3166-1-Alpha-3"];
        if (code === "TWN") code = "CHN";
        
        if (this.lastHoveredCode === code) this.lastHoveredCode = null;
        
        const isFocused = this.focusedCountry?.code === code;
        if (!isFocused) {
          const style = this.getCountryStyle(code);
          event.graphic.setStyle(style);
        }
      });
    },

    getCountryStyle(countryCode) {
      if (this.currentLayer === 'security') {
        const color = getCountrySecurityColor(countryCode);
        const level = getSecurityLevel(countryCode);
        return { color: color, opacity: level === 0 ? 0.3 : 0.6 };
      } else {
        const color = getCountryFrequencyColor(countryCode);
        return { color: color, opacity: 0.7 };
      }
    },

    focusOnCountry(code, name, graphic) {
      if (this.focusedCountry && this.focusedCountry.graphic) {
        const style = this.getCountryStyle(this.focusedCountry.code);
        this.focusedCountry.graphic.setStyle({ ...style, outlineWidth: 1 });
      }

      this.focusedCountry = { code, name, graphic };
      graphic.setStyle({
        color: "#2196F3",
        opacity: 0.4,
        outlineColor: "#1565C0",
        outlineWidth: 3
      });

      graphic.flyTo({ duration: 1, scale: 1.5 });

      this.showOverview = true;
      this.showCountryDetail = true;
      this.$nextTick(() => this.initOverviewMap());
    },

    applySecurityLayer() {
      if (!this.countryLayer) return;
      
      const graphics = this.countryLayer.getGraphics();
      graphics.forEach(graphic => {
        const code = graphic.attr?.["ISO3166-1-Alpha-3"];
        if (code) {
          const color = getCountrySecurityColor(code);
          const level = getSecurityLevel(code);
          graphic.setStyle({
            color: color,
            opacity: level === 0 ? 0.3 : 0.6,
            outline: true,
            outlineColor: "#ffffff",
            outlineWidth: 1
          });
        }
      });
    },

    applyEventLayer() {
      if (!this.countryLayer) return;
      
      const graphics = this.countryLayer.getGraphics();
      graphics.forEach(graphic => {
        const code = graphic.attr?.["ISO3166-1-Alpha-3"];
        if (code) {
          const color = getCountryFrequencyColor(code);
          graphic.setStyle({
            color: color,
            opacity: 0.7,
            outline: true,
            outlineColor: "#ffffff",
            outlineWidth: 1
          });
        }
      });
    },

    bindMouseMoveEvent() {
      this.map.on(mars3d.EventType.mouseMove, (event) => {
        if (this.mouseMoveTimer) return;
        
        this.mouseMoveTimer = setTimeout(() => {
          this.mouseMoveTimer = null;
        }, 50);
        
        if (!event.cartesian) {
          this.mouseCoord = { lng: '---', lat: '---', alt: '---' };
          return;
        }
        
        const position = mars3d.LngLatPoint.fromCartesian(event.cartesian);
        this.mouseCoord = {
          lng: position.lng.toFixed(4) + '°',
          lat: position.lat.toFixed(4) + '°',
          alt: (position.alt / 1000).toFixed(0) + ' km'
        };
      });
    },

    switchLayer(layer) {
      this.currentLayer = layer;
      if (layer === 'security') {
        this.applySecurityLayer();
      } else {
        this.applyEventLayer();
      }
    },

    closeCountryDetail() {
      this.showCountryDetail = false;
    },

    initOverviewMap() {
      const Cesium = mars3d.Cesium;
      
      if (this.overviewMap) {
        this.updateOverviewIndicator();
        return;
      }
      
      this.overviewMap = new mars3d.Map("overviewContainer", {
        scene: {
          center: { lat: 0, lng: 0, alt: 50000000, heading: 0, pitch: -90 },
          sceneMode: Cesium.SceneMode.SCENE2D,
          showSun: false,
          showMoon: false,
          showSkyBox: false,
          showSkyAtmosphere: false,
          backgroundColor: "#0d0d1a"
        },
        basemaps: [
          {
            name: "高德电子",
            type: "gaode",
            layer: "vec",
            show: true
          }
        ],
        terrain: { show: false },
        control: {
          baseLayerPicker: false,
          homeButton: false,
          sceneModePicker: false,
          navigationHelpButton: false,
          geocoder: false,
          fullscreenButton: false,
          zoom: false
        }
      });

      const controller = this.overviewMap.scene.screenSpaceCameraController;
      controller.enableRotate = false;
      controller.enableZoom = false;
      controller.enablePan = false;
      controller.enableTilt = false;
      controller.enableLook = false;
      controller.enableTranslate = false;

      this.viewRectLayer = new mars3d.layer.GraphicLayer();
      this.overviewMap.addLayer(this.viewRectLayer);

      this.map.on(mars3d.EventType.cameraChanged, () => {
        if (this.cameraChangeTimer) return;
        this.cameraChangeTimer = setTimeout(() => {
          this.cameraChangeTimer = null;
          this.updateOverviewIndicator();
        }, 100);
      });

      this.updateOverviewIndicator();
    },

    updateOverviewIndicator() {
      if (!this.overviewMap || !this.viewRectLayer) return;

      const rect = this.map.getExtent();
      if (!rect) return;

      if (this.viewRectGraphic) {
        this.viewRectGraphic.positions = [
          [rect.xmin, rect.ymin],
          [rect.xmax, rect.ymax]
        ];
      } else {
        this.viewRectGraphic = new mars3d.graphic.RectangleEntity({
          positions: [
            [rect.xmin, rect.ymin],
            [rect.xmax, rect.ymax]
          ],
          style: {
            color: "rgba(255, 0, 0, 0.2)",
            outline: true,
            outlineColor: "#ff0000",
            outlineWidth: 2
          }
        });
        this.viewRectLayer.addGraphic(this.viewRectGraphic);
      }
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
      
      const newX = e.clientX - this.dragOffset.x;
      const newY = e.clientY - this.dragOffset.y;
      const maxX = window.innerWidth - 520;
      const maxY = window.innerHeight - 420;
      
      this.overviewPos = {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      };
    },

    stopDragOverview() {
      this.isDraggingOverview = false;
    },

    closeOverview() {
      this.showOverview = false;
      this.showCountryDetail = false;
      
      if (this.focusedCountry && this.focusedCountry.graphic) {
        const style = this.getCountryStyle(this.focusedCountry.code);
        this.focusedCountry.graphic.setStyle({ ...style, outlineWidth: 1 });
      }
      this.focusedCountry = null;
      this.map.flyHome();
    },

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
    
    if (this.mouseMoveTimer) clearTimeout(this.mouseMoveTimer);
    if (this.cameraChangeTimer) clearTimeout(this.cameraChangeTimer);
    
    if (this.countryLayer) {
      this.countryLayer.off(mars3d.EventType.click);
      this.countryLayer.off(mars3d.EventType.mouseOver);
      this.countryLayer.off(mars3d.EventType.mouseOut);
    }
    if (this.labelLayer) {
      this.map.removeLayer(this.labelLayer);
    }
    if (this.overviewMap) {
      this.overviewMap.destroy();
      this.overviewMap = null;
    }
    if (this.map) {
      this.map.destroy();
      this.map = null;
    }
  }
};
</script>


<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100vh;
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
}

.map-container {
  width: 100%;
  height: 100%;
}

.loading-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #0d0d1a;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  color: #94a3b8;
  font-size: 14px;
  gap: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(100, 150, 255, 0.2);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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

* {
  margin: 0;
  padding: 0;
}
</style>

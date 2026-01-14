<template>
  <div class="map-wrapper">
    <!-- 加载遮罩 -->
    <div class="loading-mask" v-if="isLoading">
      <div class="loading-spinner"></div>
      <div class="loading-progress">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: loadingProgress + '%' }"></div>
        </div>
        <span class="progress-text">{{ loadingProgress }}%</span>
      </div>
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

    <!-- 态势分析面板 -->
    <SituationPanel 
      v-if="showSituationPanel"
      @layer-change="onLayerChange"
      @point-type-select="onPointTypeSelect"
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
    
    <!-- 已选国家列表 -->
    <div class="selected-panel" v-if="selectedCountries.length > 0 && !showCountryDetail">
      <h4>已选国家 ({{ selectedCountries.length }})</h4>
      <ul>
        <li v-for="country in selectedCountries" :key="country.code">
          {{ country.name }}
          <span class="remove-btn" @click="removeCountry(country.code)">×</span>
        </li>
      </ul>
      <button class="clear-btn" @click="clearSelection">清空选择</button>
    </div>
    
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
    
    <div id="mars3dContainer" class="map-container"></div>
  </div>
</template>

<script>
import "mars3d-cesium/Build/Cesium/Widgets/widgets.css";
import "mars3d/mars3d.css";

import * as mars3d from "mars3d";
import { getChineseName } from "@/data/countryNames";
import { getCountrySecurityColor, getSecurityLevel } from "@/data/securityLevels";
import SituationPanel from "./SituationPanel.vue";
import CountryDetailPanel from "./CountryDetailPanel.vue";
import EventTimeline from "./EventTimeline.vue";
import LeftDrawer from "./LeftDrawer.vue";
import RightDrawer from "./RightDrawer.vue";

export default {
  name: "Mars3dMap",
  components: {
    SituationPanel,
    CountryDetailPanel,
    EventTimeline,
    LeftDrawer,
    RightDrawer
  },
  data() {
    return {
      map: null,
      overviewMap: null,
      viewRectLayer: null,
      viewRectGraphic: null, // 缓存视野框图形
      countryLayer: null,
      labelLayer: null,
      pointLayer: null,
      geojsonData: null,
      selectedCountries: [],
      graphicMap: {},
      lastHoveredCode: null,
      showOverview: false,
      showCountryDetail: false,
      focusedCountry: null,
      showSituationPanel: false,
      currentLayer: 'security',
      selectedPointType: null,
      addedPoints: [],
      // 概览图拖动
      overviewPos: { x: 10, y: 60 },
      isDraggingOverview: false,
      dragOffset: { x: 0, y: 0 },
      // 鼠标坐标
      mouseCoord: { lng: '---', lat: '---', alt: '---' },
      // 节流定时器
      mouseMoveTimer: null,
      cameraChangeTimer: null,
      // 加载状态
      isLoading: true,
      loadingProgress: 0
    };
  },
  mounted() {
    this.initMap();
    // 添加全局鼠标事件监听
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
          requestRenderMode: false,  // 关闭按需渲染，保持连续渲染
          fxaa: false,
          msaaSamples: 1,
          // 关闭天空盒和大气层，避免蓝屏
          showSun: false,
          showMoon: false,
          showSkyBox: false,
          showSkyAtmosphere: false,
          backgroundColor: "#0d0d1a"
        },
        basemaps: [
          {
            name: "离线底图",
            type: "xyz",
            url: "/map-data/tiles/{z}/{x}/{y}.png",
            minimumLevel: 5,
            maximumLevel: 5,
            show: true,
            // 瓦片加载优化
            tileWidth: 256,
            tileHeight: 256,
            maximumScreenSpaceError: 1  // 降低误差阈值，提前加载
          }
        ],
        terrain: { show: false }
      });

      // 关闭地球大气光晕，设置地球基础颜色
      const scene = this.map.scene;
      if (scene.globe) {
        scene.globe.showGroundAtmosphere = false;
        scene.globe.baseColor = Cesium.Color.fromCssColorString("#0d0d1a");
        scene.globe.depthTestAgainstTerrain = false;
        // 关键：保持旧瓦片直到新瓦片加载完成
        scene.globe.tileCacheSize = 1000;  // 增大瓦片缓存
        scene.globe.preloadSiblings = true;  // 预加载相邻瓦片
        scene.globe.preloadAncestors = true;  // 预加载父级瓦片
        scene.globe.loadingDescendantLimit = 20;  // 限制同时加载的子瓦片数
      }
      
      // 设置场景背景色（瓦片未加载时显示）
      scene.backgroundColor = Cesium.Color.fromCssColorString("#0d0d1a");

      this.map.on(mars3d.EventType.load, () => {
        console.log("mars3d 地图初始化成功！");
        this.loadCountryLayer();
        this.bindMouseMoveEvent();
        
        // 等待瓦片加载完成后隐藏遮罩
        this.waitForTilesLoaded();
      });
    },

    // 等待瓦片加载完成
    waitForTilesLoaded() {
      const scene = this.map.scene;
      const globe = scene.globe;
      
      // 监听瓦片加载进度
      let lastProgress = 0;
      
      const checkTilesLoaded = () => {
        // 获取加载进度
        const tilesLoading = globe._surface._tileLoadQueueHigh.length + 
                            globe._surface._tileLoadQueueMedium.length + 
                            globe._surface._tileLoadQueueLow.length;
        const tilesTotal = globe._surface._tilesToRender.length + tilesLoading;
        
        let progress;
        if (tilesTotal === 0) {
          progress = globe.tilesLoaded ? 100 : lastProgress;
        } else {
          progress = Math.min(99, Math.round((1 - tilesLoading / Math.max(tilesTotal, 1)) * 100));
        }
        
        // 平滑进度更新
        if (progress > lastProgress) {
          lastProgress = progress;
          this.loadingProgress = progress;
        }
        
        // 检查瓦片是否加载完成
        if (globe.tilesLoaded && tilesLoading === 0) {
          this.loadingProgress = 100;
          setTimeout(() => {
            this.isLoading = false;
          }, 200);
        } else {
          requestAnimationFrame(checkTilesLoaded);
        }
      };
      
      checkTilesLoaded();
    },

    // 绑定鼠标移动事件，显示经纬度（添加节流）
    bindMouseMoveEvent() {
      this.map.on(mars3d.EventType.mouseMove, (event) => {
        // 节流：50ms 内只处理一次
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

    loadCountryLayer() {
      // 使用矢量瓦片加载
      this.loadVectorTiles();
    },

    // 矢量瓦片加载方式
    // 注意：Mars3D 对矢量瓦片的支持可能需要额外配置
    // 如果矢量瓦片加载有问题，可以继续使用 GeoJSON 方式
    loadVectorTiles() {
      try {
        this.countryLayer = new mars3d.layer.PbfLayer({
          url: "/map-data/vector-tiles/{z}/{x}/{y}.pbf",
          minimumLevel: 0,
          maximumLevel: 6,
          layerName: "countries",
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
          }
        });

        this.map.addLayer(this.countryLayer);

        this.countryLayer.on(mars3d.EventType.load, () => {
          console.log("矢量瓦片加载完成");
          this.bindCountryEvents();
        });
      } catch (e) {
        console.error("矢量瓦片加载失败，回退到 GeoJSON:", e);
        this.loadGeoJsonLayer();
      }
    },

    // GeoJSON 加载方式（当前使用）
    loadGeoJsonLayer() {
      const geojsonUrl = "public/data/countries.geojson";
      
      // 先加载 GeoJSON 数据
      fetch(geojsonUrl)
        .then(res => res.json())
        .then(geojsonData => {
          // 过滤掉 ISO 代码为 -99 的特殊区域（如 Baykonur、争议地区等）
          const filteredData = {
            ...geojsonData,
            features: geojsonData.features.filter(f => {
              const isoCode = f.properties?.["ISO3166-1-Alpha-3"];
              return isoCode && isoCode !== "-99";
            })
          };
          this.geojsonData = filteredData;
          
          this.countryLayer = new mars3d.layer.GeoJsonLayer({
            data: filteredData,
            symbol: {
              type: "polygon",
              styleOptions: {
                fill: true,
                color: "#ffffff",
                opacity: 0.01,
                outline: true,
                outlineColor: "#ffffff",
                outlineWidth: 1,
                clampToGround: false
              }
            },
            popup: "{name}",
            flyTo: false
          });

          this.map.addLayer(this.countryLayer);
          
          // 直接添加标注，不等待 load 事件
          this.addCountryLabels();
          this.bindCountryEvents();
          
          console.log("国家边界图层加载完成");
        })
        .catch(err => {
          console.error("加载 GeoJSON 失败:", err);
        });
    },

    // 计算单个多边形的面积（简化算法）
    calculatePolygonArea(ring) {
      if (!ring || ring.length < 3) return 0;
      let area = 0;
      for (let i = 0; i < ring.length - 1; i++) {
        const [x1, y1] = ring[i];
        const [x2, y2] = ring[i + 1];
        area += (x2 - x1) * (y2 + y1);
      }
      return Math.abs(area / 2);
    },

    // 计算单个多边形的边界框中心
    calculatePolygonCenter(ring) {
      let minLng = Infinity, maxLng = -Infinity;
      let minLat = Infinity, maxLat = -Infinity;
      
      ring.forEach(coord => {
        if (Array.isArray(coord) && coord.length >= 2) {
          minLng = Math.min(minLng, coord[0]);
          maxLng = Math.max(maxLng, coord[0]);
          minLat = Math.min(minLat, coord[1]);
          maxLat = Math.max(maxLat, coord[1]);
        }
      });
      
      const width = maxLng - minLng;
      const height = maxLat - minLat;
      
      return {
        lng: (minLng + maxLng) / 2,
        lat: (minLat + maxLat) / 2,
        area: width * height
      };
    },

    // 计算 GeoJSON 几何体的中心点（取最大多边形的中心）
    calculateGeometryInfo(geometry) {
      let polygons = [];
      
      if (geometry.type === "Polygon") {
        // Polygon: [[ring], [hole], ...]，取外环
        if (geometry.coordinates[0]) {
          polygons.push(geometry.coordinates[0]);
        }
      } else if (geometry.type === "MultiPolygon") {
        // MultiPolygon: [[[ring], [hole]], [[ring], [hole]], ...]
        geometry.coordinates.forEach(polygon => {
          if (polygon[0]) {
            polygons.push(polygon[0]);
          }
        });
      }
      
      if (polygons.length === 0) return null;
      
      // 找到面积最大的多边形（大陆部分）
      let maxArea = 0;
      let mainPolygon = polygons[0];
      
      polygons.forEach(ring => {
        const area = this.calculatePolygonArea(ring);
        if (area > maxArea) {
          maxArea = area;
          mainPolygon = ring;
        }
      });
      
      // 计算最大多边形的中心
      return this.calculatePolygonCenter(mainPolygon);
    },

    // 根据面积计算字体大小
    getFontSizeByArea(area) {
      if (area > 2000) return 22;      // 超大国家：俄罗斯、加拿大、美国、中国
      if (area > 500) return 18;       // 大国：巴西、澳大利亚、印度
      if (area > 100) return 15;       // 中等国家
      if (area > 20) return 12;        // 小国家
      return 10;                        // 微型国家
    },

    // 添加国家名称标注
    addCountryLabels() {
      this.labelLayer = new mars3d.layer.GraphicLayer();
      this.map.addLayer(this.labelLayer);

      if (!this.geojsonData || !this.geojsonData.features) {
        console.warn("GeoJSON 数据未加载");
        return;
      }

      let addedCount = 0;
      
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
        addedCount++;
      });

      console.log("国家名称标注添加完成，数量:", addedCount);
    },

    bindCountryEvents() {
      // 点击事件 - 聚焦到国家
      this.countryLayer.on(mars3d.EventType.click, (event) => {
        if (!event.graphic) return;
        
        const attr = event.graphic.attr;
        let code = attr["ISO3166-1-Alpha-3"];
        let name = attr.name;
        
        // 台湾是中国的一部分，点击台湾视为点击中国
        if (code === "TWN") {
          code = "CHN";
          name = "China";
        }
        
        const chineseName = getChineseName(name);

        // 聚焦到该国家
        this.focusOnCountry(code, chineseName, event.graphic);
      });

      // 鼠标悬停高亮 - 添加防抖，避免重复触发
      this.countryLayer.on(mars3d.EventType.mouseOver, (event) => {
        if (!event.graphic) return;
        let code = event.graphic.attr["ISO3166-1-Alpha-3"];
        
        // 台湾属于中国，悬停台湾视为悬停中国
        const isTaiwan = code === "TWN";
        if (isTaiwan) code = "CHN";
        
        // 如果是同一个国家，跳过
        if (this.lastHoveredCode === code) return;
        this.lastHoveredCode = code;
        
        const isSelected = this.selectedCountries.some(c => c.code === code);
        const isFocused = this.focusedCountry?.code === code;
        
        if (!isSelected && !isFocused) {
          event.graphic.setStyle({
            color: "#66bb6a",
            opacity: 0.5
          });
          
          // 如果悬停的是中国或台湾，同时高亮另一个
          if (code === "CHN") {
            const otherGraphic = isTaiwan ? this.getChinaGraphic() : this.getTaiwanGraphic();
            if (otherGraphic) {
              otherGraphic.setStyle({
                color: "#66bb6a",
                opacity: 0.5
              });
            }
          }
        }
      });

      // 鼠标移出恢复
      this.countryLayer.on(mars3d.EventType.mouseOut, (event) => {
        if (!event.graphic) return;
        let code = event.graphic.attr["ISO3166-1-Alpha-3"];
        const isTaiwan = code === "TWN";
        if (isTaiwan) code = "CHN";
        
        // 清除悬停状态
        if (this.lastHoveredCode === code) {
          this.lastHoveredCode = null;
        }
        
        const isSelected = this.selectedCountries.some(c => c.code === code);
        const isFocused = this.focusedCountry?.code === code || 
          (this.focusedCountry?.code === "CHN" && code === "TWN"); // 台湾属于中国
        
        if (!isSelected && !isFocused) {
          event.graphic.setStyle({
            color: "#ffffff",
            opacity: 0.01
          });
          
          // 如果是中国或台湾，同时恢复另一个
          if (code === "CHN") {
            const otherGraphic = isTaiwan ? this.getChinaGraphic() : this.getTaiwanGraphic();
            if (otherGraphic) {
              otherGraphic.setStyle({
                color: "#ffffff",
                opacity: 0.01
              });
            }
          }
        }
      });
    },

    // 获取台湾的 graphic 对象
    getTaiwanGraphic() {
      if (!this.countryLayer) return null;
      const graphics = this.countryLayer.getGraphics();
      return graphics.find(g => g.attr?.["ISO3166-1-Alpha-3"] === "TWN");
    },

    // 获取中国大陆的 graphic 对象
    getChinaGraphic() {
      if (!this.countryLayer) return null;
      const graphics = this.countryLayer.getGraphics();
      return graphics.find(g => g.attr?.["ISO3166-1-Alpha-3"] === "CHN");
    },

    // 聚焦到国家
    focusOnCountry(code, name, graphic) {
      // 清除之前聚焦的国家样式
      if (this.focusedCountry && this.focusedCountry.graphic) {
        const isSelected = this.selectedCountries.some(c => c.code === this.focusedCountry.code);
        if (!isSelected) {
          this.focusedCountry.graphic.setStyle({
            color: "#ffffff",
            opacity: 0.01,
            outlineWidth: 1
          });
          // 如果之前聚焦的是中国，也要清除台湾的样式
          if (this.focusedCountry.code === "CHN") {
            const taiwanGraphic = this.getTaiwanGraphic();
            if (taiwanGraphic) {
              taiwanGraphic.setStyle({
                color: "#ffffff",
                opacity: 0.01,
                outlineWidth: 1
              });
            }
          }
        }
      }

      // 如果是中国，需要获取中国大陆的 graphic
      let mainGraphic = graphic;
      if (code === "CHN" && graphic.attr?.["ISO3166-1-Alpha-3"] === "TWN") {
        mainGraphic = this.getChinaGraphic() || graphic;
      }

      // 计算国家的边界范围
      const countryBounds = this.getCountryBounds(code);

      // 设置新的聚焦国家
      this.focusedCountry = { code, name, graphic: mainGraphic, bounds: countryBounds };
      mainGraphic.setStyle({
        color: "#2196F3",
        opacity: 0.4,
        outlineColor: "#1565C0",
        outlineWidth: 3
      });

      // 如果是中国，同时高亮台湾
      if (code === "CHN") {
        const taiwanGraphic = this.getTaiwanGraphic();
        if (taiwanGraphic) {
          taiwanGraphic.setStyle({
            color: "#2196F3",
            opacity: 0.4,
            outlineColor: "#1565C0",
            outlineWidth: 3
          });
        }
      }

      // 飞行到该国家
      mainGraphic.flyTo({
        duration: 1,
        scale: 1.5
      });

      // 显示概览图
      this.showOverview = true;
      this.$nextTick(() => {
        this.initOverviewMap(countryBounds);
      });

      // 显示右侧国家详情面板
      this.showCountryDetail = true;
    },

    // 获取国家边界范围
    getCountryBounds(code) {
      if (!this.geojsonData || !this.geojsonData.features) return null;
      
      let minLng = Infinity, maxLng = -Infinity;
      let minLat = Infinity, maxLat = -Infinity;
      
      // 查找该国家的所有 feature
      const features = this.geojsonData.features.filter(f => {
        const featureCode = f.properties?.["ISO3166-1-Alpha-3"];
        // 如果是中国，包含台湾
        if (code === "CHN") {
          return featureCode === "CHN" || featureCode === "TWN";
        }
        return featureCode === code;
      });
      
      features.forEach(feature => {
        const geometry = feature.geometry;
        if (!geometry) return;
        
        const processCoords = (coords) => {
          coords.forEach(coord => {
            if (Array.isArray(coord[0])) {
              processCoords(coord);
            } else {
              minLng = Math.min(minLng, coord[0]);
              maxLng = Math.max(maxLng, coord[0]);
              minLat = Math.min(minLat, coord[1]);
              maxLat = Math.max(maxLat, coord[1]);
            }
          });
        };
        
        processCoords(geometry.coordinates);
      });
      
      if (minLng === Infinity) return null;
      
      // 添加一点边距
      const lngPadding = (maxLng - minLng) * 0.1;
      const latPadding = (maxLat - minLat) * 0.1;
      
      return {
        west: minLng - lngPadding,
        east: maxLng + lngPadding,
        south: minLat - latPadding,
        north: maxLat + latPadding,
        centerLng: (minLng + maxLng) / 2,
        centerLat: (minLat + maxLat) / 2
      };
    },

    // 关闭国家详情面板
    closeCountryDetail() {
      this.showCountryDetail = false;
    },

    // 初始化概览图
    initOverviewMap(bounds) {
      const Cesium = mars3d.Cesium;
      
      if (this.overviewMap) {
        // 已存在则更新视野框
        this.updateOverviewIndicator();
        return;
      }
      
      // 概览图始终显示全球视图
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
            name: "离线底图",
            type: "xyz",
            url: "/map-data/tiles/{z}/{x}/{y}.png",
            minimumLevel: 5,
            maximumLevel: 5,
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

      // 禁用概览图的交互
      const controller = this.overviewMap.scene.screenSpaceCameraController;
      controller.enableRotate = false;
      controller.enableZoom = false;
      controller.enablePan = false;
      controller.enableTilt = false;
      controller.enableLook = false;
      controller.enableTranslate = false;

      // 创建视野框图层
      this.viewRectLayer = new mars3d.layer.GraphicLayer();
      this.overviewMap.addLayer(this.viewRectLayer);

      // 监听主地图视角变化，更新视野框（添加节流）
      this.map.on(mars3d.EventType.cameraChanged, () => {
        // 节流：100ms 内只处理一次
        if (this.cameraChangeTimer) return;
        
        this.cameraChangeTimer = setTimeout(() => {
          this.cameraChangeTimer = null;
          this.updateOverviewIndicator();
        }, 100);
      });

      this.updateOverviewIndicator();
    },

    // 更新概览图上的视野框
    updateOverviewIndicator() {
      if (!this.overviewMap || !this.viewRectLayer) return;

      // 获取主地图当前视野范围
      const rect = this.map.getExtent();
      if (!rect) return;

      // 如果已有视野框，更新位置；否则创建新的
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

    // 开始拖动概览图
    startDragOverview(e) {
      this.isDraggingOverview = true;
      this.dragOffset = {
        x: e.clientX - this.overviewPos.x,
        y: e.clientY - this.overviewPos.y
      };
    },

    // 拖动概览图
    onDragOverview(e) {
      if (!this.isDraggingOverview) return;
      
      const newX = e.clientX - this.dragOffset.x;
      const newY = e.clientY - this.dragOffset.y;
      
      // 限制在窗口范围内
      const maxX = window.innerWidth - 520;
      const maxY = window.innerHeight - 420;
      
      this.overviewPos = {
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      };
    },

    // 停止拖动概览图
    stopDragOverview() {
      this.isDraggingOverview = false;
    },

    // 关闭概览图
    closeOverview() {
      this.showOverview = false;
      this.showCountryDetail = false;
      
      // 移除相机变化监听
      this.map.off(mars3d.EventType.cameraChanged);
      
      // 清除视野框缓存
      this.viewRectGraphic = null;
      
      // 恢复聚焦国家的样式
      if (this.focusedCountry && this.focusedCountry.graphic) {
        const isSelected = this.selectedCountries.some(c => c.code === this.focusedCountry.code);
        if (!isSelected) {
          this.focusedCountry.graphic.setStyle({
            color: "#ffffff",
            opacity: 0.01,
            outlineColor: "#ffffff",
            outlineWidth: 1
          });
          // 如果是中国，也恢复台湾样式
          if (this.focusedCountry.code === "CHN") {
            const taiwanGraphic = this.getTaiwanGraphic();
            if (taiwanGraphic) {
              taiwanGraphic.setStyle({
                color: "#ffffff",
                opacity: 0.01,
                outlineColor: "#ffffff",
                outlineWidth: 1
              });
            }
          }
        }
      }
      this.focusedCountry = null;

      // 恢复全局视图
      this.map.flyHome();
    },

    toggleCountrySelection(code, name, graphic) {
      const index = this.selectedCountries.findIndex(c => c.code === code);
      
      if (index === -1) {
        // 添加选中
        this.selectedCountries.push({ code, name });
        this.graphicMap[code] = graphic;
        graphic.setStyle({
          color: "#ff5722",
          opacity: 0.6,
          outlineWidth: 2
        });
      } else {
        // 取消选中
        this.selectedCountries.splice(index, 1);
        delete this.graphicMap[code];
        graphic.setStyle({
          color: "#ffffff",
          opacity: 0.01,
          outlineWidth: 1
        });
      }
    },

    removeCountry(code) {
      const graphic = this.graphicMap[code];
      if (graphic) {
        graphic.setStyle({
          color: "#ffffff",
          opacity: 0.01,
          outlineWidth: 1
        });
      }
      this.selectedCountries = this.selectedCountries.filter(c => c.code !== code);
      delete this.graphicMap[code];
    },

    clearSelection() {
      this.selectedCountries.forEach(country => {
        const graphic = this.graphicMap[country.code];
        if (graphic) {
          graphic.setStyle({
            color: "#ffffff",
            opacity: 0.01,
            outlineWidth: 1
          });
        }
      });
      this.selectedCountries = [];
      this.graphicMap = {};
    },

    // 进入态势分析模式
    enterSituationMode() {
      this.showSituationPanel = true;
      this.applySecurityLayer();
      this.initPointLayer();
    },

    // 退出态势分析模式
    exitSituationMode() {
      this.showSituationPanel = false;
      this.selectedPointType = null;
      this.resetCountryStyles();
      
      // 移除点击添加点的监听
      this.map.off(mars3d.EventType.click, this.onMapClickAddPoint);
    },

    // 应用安全等级图层
    applySecurityLayer() {
      if (!this.countryLayer) return;
      
      const graphics = this.countryLayer.getGraphics();
      graphics.forEach(graphic => {
        const code = graphic.attr?.["ISO3166-1-Alpha-3"];
        if (code) {
          const color = getCountrySecurityColor(code);
          const level = getSecurityLevel(code);
          const opacity = level === 0 ? 0.2 : 0.5;
          
          graphic.setStyle({
            color: color,
            opacity: opacity,
            outline: true,
            outlineColor: "#ffffff",
            outlineWidth: 1
          });
        }
      });
    },

    // 应用事件频次图层（模拟数据）
    applyEventLayer() {
      if (!this.countryLayer) return;
      
      const graphics = this.countryLayer.getGraphics();
      graphics.forEach(graphic => {
        // 模拟事件频次，实际应从数据获取
        const eventCount = Math.random();
        let color;
        if (eventCount > 0.7) {
          color = "#e65100";
        } else if (eventCount > 0.4) {
          color = "#ff9800";
        } else {
          color = "#fff3e0";
        }
        
        graphic.setStyle({
          color: color,
          opacity: 0.5,
          outline: true,
          outlineColor: "#ffffff",
          outlineWidth: 1
        });
      });
    },

    // 重置国家样式
    resetCountryStyles() {
      if (!this.countryLayer) return;
      
      const graphics = this.countryLayer.getGraphics();
      graphics.forEach(graphic => {
        graphic.setStyle({
          color: "#ffffff",
          opacity: 0.01,
          outline: true,
          outlineColor: "#ffffff",
          outlineWidth: 1
        });
      });
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

    // 图层切换（从 SituationPanel 触发）
    onLayerChange(layer) {
      this.switchLayer(layer);
    },

    // 选择点类型
    onPointTypeSelect(typeId) {
      this.selectedPointType = typeId;
      
      if (typeId) {
        // 绑定地图点击事件
        this.map.on(mars3d.EventType.click, this.onMapClickAddPoint);
      } else {
        this.map.off(mars3d.EventType.click, this.onMapClickAddPoint);
      }
    },

    // 初始化点图层
    initPointLayer() {
      if (this.pointLayer) return;
      
      this.pointLayer = new mars3d.layer.GraphicLayer();
      this.map.addLayer(this.pointLayer);
    },

    // 地图点击添加点
    onMapClickAddPoint(event) {
      if (!this.selectedPointType || !event.cartesian) return;
      
      const position = mars3d.LngLatPoint.fromCartesian(event.cartesian);
      const pointColors = {
        'military': '#f44336',
        'political': '#2196f3',
        'economic': '#ff9800',
        'security': '#9c27b0',
        'diplomatic': '#4caf50',
        'tech': '#00bcd4'
      };
      
      const point = new mars3d.graphic.PointEntity({
        position: [position.lng, position.lat],
        style: {
          pixelSize: 12,
          color: pointColors[this.selectedPointType],
          outlineColor: "#ffffff",
          outlineWidth: 2
        },
        attr: {
          type: this.selectedPointType,
          id: Date.now()
        }
      });
      
      this.pointLayer.addGraphic(point);
      this.addedPoints.push({
        id: point.attr.id,
        type: this.selectedPointType,
        position: [position.lng, position.lat]
      });
    },

    // 时间轴事件点击
    onTimelineEventClick(event) {
      console.log('时间轴事件点击:', event);
      // 可以在这里处理事件点击，比如在地图上高亮相关位置
    },

    // 时间轴筛选
    onTimelineFilter(filter) {
      console.log('时间轴筛选:', filter);
      // 可以在这里处理筛选逻辑
    },

    // 左侧抽屉切换
    onDrawerToggle(isCollapsed) {
      console.log('抽屉状态:', isCollapsed ? '收起' : '展开');
    },

    // 左侧抽屉菜单选择
    onDrawerSelect(itemId) {
      console.log('左侧选择菜单:', itemId);
      // 可以根据选择的菜单项执行不同操作
    },

    // 右侧抽屉切换
    onRightDrawerToggle(isCollapsed) {
      console.log('右侧抽屉状态:', isCollapsed ? '收起' : '展开');
    },

    // 右侧抽屉菜单选择
    onRightDrawerSelect(itemId) {
      console.log('右侧选择菜单:', itemId);
      // 可以根据选择的菜单项执行不同操作
    }
  },
  beforeUnmount() {
    // 移除拖动事件监听
    document.removeEventListener('mousemove', this.onDragOverview);
    document.removeEventListener('mouseup', this.stopDragOverview);
    
    // 清除定时器
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

/* 概览图样式 */
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
}

.selected-panel {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 999;
  background: rgba(255, 255, 255, 0.95);
  padding: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  max-height: 300px;
  overflow-y: auto;
  min-width: 150px;
}

.selected-panel h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.selected-panel ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.selected-panel li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 13px;
  color: #555;
  border-bottom: 1px solid #f0f0f0;
}

.selected-panel li:last-child {
  border-bottom: none;
}

.remove-btn {
  cursor: pointer;
  color: #ff5722;
  font-weight: bold;
  padding: 0 5px;
  font-size: 16px;
}

.remove-btn:hover {
  color: #d32f2f;
}

.clear-btn {
  width: 100%;
  margin-top: 10px;
  padding: 8px;
  background: #ff5722;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.clear-btn:hover {
  background: #e64a19;
}

.map-container {
  width: 100%;
  height: 100%;
}

/* 加载遮罩 */
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

.loading-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 200px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(100, 150, 255, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #60a5fa);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 12px;
  color: #60a5fa;
  min-width: 36px;
  text-align: right;
}

@keyframes spin {
  to { transform: rotate(360deg); }
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

* {
  margin: 0;
  padding: 0;
}
</style>

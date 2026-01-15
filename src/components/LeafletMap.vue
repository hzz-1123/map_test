<template>
  <div class="situation-container">
    <!-- 顶部导航栏 -->
    <header class="top-header">
      <div class="header-row">
        <div class="header-left">
          <span class="system-title">复杂事件预测系统</span>
          <span class="divider">|</span>
          <nav class="breadcrumb">
            <span class="breadcrumb-link">主界面</span>
            <span class="separator">></span>
            <span class="current">态势分析</span>
          </nav>
        </div>
      </div>
      <div class="header-tabs-row">
        <div class="header-tabs">
          <button 
            :class="['tab-btn', { active: activeTab === 'event' }]"
            @click="activeTab = 'event'"
          >
            事件发生频次
          </button>
          <button 
            :class="['tab-btn', { active: activeTab === 'security' }]"
            @click="activeTab = 'security'"
          >
            国家安全等级
          </button>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <div class="main-area">
      <!-- 地图区域 -->
      <div class="map-container" ref="mapContainer"></div>
      
      <!-- 左侧抽屉 -->
      <LeftDrawer @toggle="onLeftDrawerToggle" @select="onLeftDrawerSelect" />

      <!-- 右侧抽屉 -->
      <RightDrawer @toggle="onRightDrawerToggle" @select="onRightDrawerSelect" />
      
      <!-- 左上角小地图概览 -->
      <div class="mini-map-container" v-show="showMiniMap" ref="miniMapWrapper">
        <div class="mini-map-header" @mousedown="startDragMiniMap">
          <span>全球概览</span>
          <button class="mini-map-close" @click="closeMiniMap">×</button>
        </div>
        <div class="mini-map" ref="miniMapContainer"></div>
      </div>

      <!-- 右上角搜索框 -->
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchQuery"
          placeholder="搜索地点或事件..."
          class="search-input"
        />
        <button class="search-btn">搜索</button>
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

      <!-- 右下角图例 -->
      <SecurityLegend v-if="activeTab === 'security'" />
      <EventFrequencyLegend v-if="activeTab === 'event'" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import LeftDrawer from './LeftDrawer.vue'
import RightDrawer from './RightDrawer.vue'
import CountryDetailPanel from './CountryDetailPanel.vue'
import EventTimeline from './EventTimeline.vue'
import SecurityLegend from './SecurityLegend.vue'
import EventFrequencyLegend from './EventFrequencyLegend.vue'

// 状态
const activeTab = ref('security')
const searchQuery = ref('')
const mapContainer = ref(null)
const miniMapContainer = ref(null)
const miniMapWrapper = ref(null)
const showMiniMap = ref(false)
const showCountryDetail = ref(false)
const focusedCountry = ref(null)

let map = null
let miniMap = null
let countriesLayer = null
let viewRectangle = null
let geojsonData = null
let currentCountryBounds = null
let selectedLayers = []
let diaoyuMarker = null

// 初始化地图
onMounted(async () => {
  if (mapContainer.value) {
    const bounds = L.latLngBounds(
      L.latLng(-85, -180),
      L.latLng(85, 180)
    )
    
    map = L.map(mapContainer.value, {
      center: [35, 105],
      zoom: 4,
      minZoom: 3,
      maxZoom: 7,
      zoomControl: true,
      attributionControl: false,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0
    })
    
    mapContainer.value.style.backgroundColor = '#b5d6f1'
    
    // 添加天地图瓦片底图
    L.tileLayer('/tiles/vec_w/{z}/{y}/{x}.png', {
      maxZoom: 7,
      minZoom: 3,
      noWrap: true,
      bounds: bounds
    }).addTo(map)
    
    // 添加天地图注记
    L.tileLayer('/tiles/cva_w/{z}/{y}/{x}.png', {
      maxZoom: 7,
      minZoom: 3,
      noWrap: true,
      bounds: bounds
    }).addTo(map)
    
    // 加载国家边界 GeoJSON
    try {
      const response = await fetch('/data/countries.geojson')
      geojsonData = await response.json()
      
      countriesLayer = L.geoJSON(geojsonData, {
        style: {
          fillColor: 'transparent',
          fillOpacity: 0,
          color: 'transparent',
          weight: 0,
          className: 'country-layer'
        },
        onEachFeature: (feature, layer) => {
          layer.on('click', () => {
            onCountryClick(feature, layer)
          })
        }
      }).addTo(map)
    } catch (error) {
      console.error('加载国家边界数据失败:', error)
    }
    
    map.zoomControl.setPosition('topleft')
  }
})

// 点击国家
const onCountryClick = (feature, layer) => {
  const countryName = feature.properties.NAME || feature.properties.ADMIN || feature.properties.name || '未知'
  const countryCode = feature.properties.ISO_A3 || feature.properties.ADM0_A3 || feature.properties['ISO3166-1-Alpha-3'] || ''
  
  resetSelectedLayers()
  
  const chinaCodes = ['CHN', 'TWN', 'HKG', 'MAC', 'PGA']
  const chinaNames = ['China', 'Taiwan', 'Hong Kong', 'Macao', 'Spratly Islands']
  const isChina = chinaCodes.includes(countryCode) || chinaNames.includes(countryName)
  
  if (isChina) {
    countriesLayer.eachLayer((l) => {
      const props = l.feature.properties
      const code = props.ISO_A3 || props.ADM0_A3 || props['ISO3166-1-Alpha-3'] || ''
      const name = props.NAME || props.ADMIN || props.name || ''
      if (chinaCodes.includes(code) || chinaNames.includes(name)) {
        selectedLayers.push(l)
      }
    })
  } else {
    selectedLayers.push(layer)
  }
  
  currentCountryBounds = isChina ? getChinaBounds() : getMainlandBounds(feature, layer)
  
  // 设置聚焦国家
  focusedCountry.value = { 
    code: isChina ? 'CHN' : countryCode, 
    name: isChina ? '中国' : countryName 
  }
  
  map.fitBounds(currentCountryBounds, { padding: [50, 50], maxZoom: 6 })
  
  setTimeout(() => {
    selectedLayers.forEach(l => {
      l.setStyle({
        fillColor: '#e74c3c',
        fillOpacity: 0.35,
        color: '#c0392b',
        weight: 1.5
      })
    })
    
    if (isChina) {
      diaoyuMarker = L.circleMarker([25.75, 123.47], {
        radius: 6,
        fillColor: '#e74c3c',
        fillOpacity: 0.7,
        color: '#c0392b',
        weight: 2
      }).addTo(map)
      diaoyuMarker.bindTooltip('钓鱼岛', { permanent: false, direction: 'top', offset: [0, -5] })
    }
  }, 300)
  
  showMiniMap.value = true
  showCountryDetail.value = true
  
  setTimeout(() => {
    initMiniMap(currentCountryBounds)
  }, 100)
}

const getChinaBounds = () => {
  let bounds = null
  countriesLayer.eachLayer((l) => {
    const props = l.feature.properties
    const code = props.ISO_A3 || props.ADM0_A3 || props['ISO3166-1-Alpha-3'] || ''
    const name = props.NAME || props.ADMIN || props.name || ''
    if (code === 'CHN' || name === 'China') {
      bounds = getMainlandBounds(l.feature, l)
    }
  })
  return bounds
}

const resetSelectedLayers = () => {
  selectedLayers.forEach(l => {
    l.setStyle({ fillColor: 'transparent', fillOpacity: 0, color: 'transparent', weight: 0 })
  })
  selectedLayers = []
  if (diaoyuMarker) {
    map.removeLayer(diaoyuMarker)
    diaoyuMarker = null
  }
}

const getMainlandBounds = (feature, layer) => {
  const geometry = feature.geometry
  if (geometry.type === 'MultiPolygon') {
    let maxArea = 0
    let mainPolygon = null
    geometry.coordinates.forEach(polygon => {
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity
      polygon[0].forEach(coord => {
        if (coord[0] < minLng) minLng = coord[0]
        if (coord[0] > maxLng) maxLng = coord[0]
        if (coord[1] < minLat) minLat = coord[1]
        if (coord[1] > maxLat) maxLat = coord[1]
      })
      if (maxLng - minLng > 180) return
      const area = (maxLng - minLng) * (maxLat - minLat)
      if (area > maxArea) {
        maxArea = area
        mainPolygon = { minLng, maxLng, minLat, maxLat }
      }
    })
    if (mainPolygon) {
      return L.latLngBounds(
        L.latLng(mainPolygon.minLat, mainPolygon.minLng),
        L.latLng(mainPolygon.maxLat, mainPolygon.maxLng)
      )
    }
  }
  const bounds = layer.getBounds()
  const sw = bounds.getSouthWest()
  const ne = bounds.getNorthEast()
  if (ne.lng - sw.lng > 180) {
    const center = bounds.getCenter()
    return L.latLngBounds(L.latLng(sw.lat, center.lng - 30), L.latLng(ne.lat, center.lng + 30))
  }
  return bounds
}

const initMiniMap = (countryBounds) => {
  if (!miniMapContainer.value) return
  if (miniMap) { miniMap.remove(); miniMap = null }
  
  miniMapContainer.value.style.backgroundColor = '#a3c8e8'
  miniMap = L.map(miniMapContainer.value, {
    center: countryBounds.getCenter(),
    zoom: 1,
    minZoom: 0,
    maxZoom: 5,
    zoomControl: false,
    attributionControl: false,
    dragging: true,
    scrollWheelZoom: true,
    doubleClickZoom: true,
    boxZoom: false,
    keyboard: false,
    touchZoom: true
  })
  
  if (geojsonData) {
    L.geoJSON(geojsonData, {
      style: { fillColor: '#f5f5dc', fillOpacity: 1, color: '#999', weight: 0.5 }
    }).addTo(miniMap)
  }
  
  setTimeout(() => {
    viewRectangle = L.rectangle(countryBounds, {
      color: '#c00', weight: 2, fillColor: '#c00', fillOpacity: 0.2
    }).addTo(miniMap)
    miniMap.fitBounds(countryBounds.pad(0.5), { animate: false })
  }, 200)
}

const closeMiniMap = () => {
  showMiniMap.value = false
  showCountryDetail.value = false
  currentCountryBounds = null
  focusedCountry.value = null
  resetSelectedLayers()
  if (miniMap) { miniMap.remove(); miniMap = null; viewRectangle = null }
}

const closeCountryDetail = () => {
  showCountryDetail.value = false
}

// 拖动小地图
let isDragging = false
let dragOffset = { x: 0, y: 0 }

const startDragMiniMap = (e) => {
  if (e.target.classList.contains('mini-map-close')) return
  isDragging = true
  const rect = miniMapWrapper.value.getBoundingClientRect()
  dragOffset.x = e.clientX - rect.left
  dragOffset.y = e.clientY - rect.top
  document.addEventListener('mousemove', onDragMiniMap)
  document.addEventListener('mouseup', stopDragMiniMap)
}

const onDragMiniMap = (e) => {
  if (!isDragging || !miniMapWrapper.value) return
  const parent = miniMapWrapper.value.parentElement
  const parentRect = parent.getBoundingClientRect()
  let newX = e.clientX - parentRect.left - dragOffset.x
  let newY = e.clientY - parentRect.top - dragOffset.y
  const wrapperRect = miniMapWrapper.value.getBoundingClientRect()
  newX = Math.max(0, Math.min(newX, parentRect.width - wrapperRect.width))
  newY = Math.max(0, Math.min(newY, parentRect.height - wrapperRect.height))
  miniMapWrapper.value.style.left = newX + 'px'
  miniMapWrapper.value.style.top = newY + 'px'
}

const stopDragMiniMap = () => {
  isDragging = false
  document.removeEventListener('mousemove', onDragMiniMap)
  document.removeEventListener('mouseup', stopDragMiniMap)
}

// 事件处理
const onLeftDrawerToggle = (collapsed) => console.log('左侧抽屉:', collapsed ? '收起' : '展开')
const onLeftDrawerSelect = (id) => console.log('左侧选择:', id)
const onRightDrawerToggle = (collapsed) => console.log('右侧抽屉:', collapsed ? '收起' : '展开')
const onRightDrawerSelect = (id) => console.log('右侧选择:', id)
const onTimelineEventClick = (event) => console.log('时间轴事件:', event)
const onTimelineFilter = (filter) => console.log('时间轴筛选:', filter)

onUnmounted(() => {
  if (miniMap) { miniMap.remove(); miniMap = null }
  if (map) { map.remove(); map = null }
})
</script>


<style scoped>
.situation-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #e8e8e8;
}

.top-header {
  display: flex;
  flex-direction: column;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #eee;
}

.header-tabs-row {
  background: #f5f5f5;
  padding: 6px 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.system-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.breadcrumb-link {
  color: #666;
  cursor: pointer;
}

.breadcrumb-link:hover {
  color: #1890ff;
}

.separator {
  color: #999;
}

.divider {
  color: #ccc;
  font-weight: 300;
}

.current {
  color: #333;
}

.header-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  padding: 6px 16px;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #333;
  transition: all 0.2s;
}

.tab-btn:hover {
  border-color: #1890ff;
  color: #1890ff;
}

.tab-btn.active {
  background: #1890ff;
  border-color: #1890ff;
  color: #fff;
}

.main-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.map-container {
  width: 100%;
  height: 100%;
}

.map-container :deep(.country-layer) {
  transition: fill-opacity 0.3s ease, stroke-opacity 0.3s ease;
}

.map-container :deep(.leaflet-tile) {
  outline: none !important;
  border: none !important;
}

.mini-map-container {
  position: absolute;
  left: 10px;
  top: 10px;
  width: 350px;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  z-index: 1001;
  overflow: hidden;
}

.mini-map-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #3d4a5c;
  color: #fff;
  font-size: 13px;
  cursor: move;
  user-select: none;
}

.mini-map-close {
  background: none;
  border: none;
  color: #fff;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.mini-map-close:hover {
  color: #ff6b6b;
}

.mini-map {
  width: 350px;
  height: 220px;
}

.search-box {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 0;
  z-index: 1000;
}

.search-input {
  width: 200px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-right: none;
  border-radius: 4px 0 0 4px;
  font-size: 14px;
  outline: none;
}

.search-input:focus {
  border-color: #1890ff;
}

.search-btn {
  padding: 8px 16px;
  background: #1890ff;
  border: 1px solid #1890ff;
  border-radius: 0 4px 4px 0;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
}

.search-btn:hover {
  background: #40a9ff;
}
</style>

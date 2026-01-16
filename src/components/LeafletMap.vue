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
            :class="['tab-btn', { active: currentLayer === 'event' }]"
            @click="switchLayer('event')"
          >
            事件发生频次
          </button>
          <button 
            :class="['tab-btn', { active: currentLayer === 'security' }]"
            @click="switchLayer('security')"
          >
            国家安全等级
          </button>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <div class="main-area">
      <!-- 左侧抽屉 -->
      <LeftDrawer @toggle="onLeftDrawerToggle" @select="onLeftDrawerSelect" @country-click="onCountryListClick" />

      <!-- 地图区域 -->
      <div class="map-container" ref="mapContainer"></div>
      
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

      <!-- 右侧抽屉 -->
      <RightDrawer 
        :focusedCountry="focusedCountry"
        @toggle="onRightDrawerToggle" 
        @select="onRightDrawerSelect"
        @close-detail="closeCountryDetail"
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

      <!-- 动态图例 -->
      <SecurityLegend v-if="currentLayer === 'security'" />
      <EventFrequencyLegend v-if="currentLayer === 'event'" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import LeftDrawer from './LeftDrawer.vue'
import RightDrawer from './RightDrawer.vue'
import EventTimeline from './EventTimeline.vue'
import SecurityLegend from './SecurityLegend.vue'
import EventFrequencyLegend from './EventFrequencyLegend.vue'
import { getChineseName } from '@/data/countryNames'
import { getCountrySecurityColor, getSecurityLevel } from '@/data/securityLevels'
import { getCountryFrequencyColor } from '@/data/eventFrequency'

// 状态
const currentLayer = ref('security')
const searchQuery = ref('')
const mapContainer = ref(null)
const miniMapContainer = ref(null)
const miniMapWrapper = ref(null)
const showMiniMap = ref(false)
const showCountryDetail = ref(false)
const focusedCountry = ref(null)
const mouseCoord = ref({ lng: '---', lat: '---', zoom: '---' })

let map = null
let miniMap = null
let countriesLayer = null
let viewRectangle = null
let geojsonData = null
let currentCountryBounds = null
let selectedLayers = []
let diaoyuMarker = null
let countryLayers = {}  // code -> layer[]
let lastHoveredCode = null

// 初始化地图
onMounted(async () => {
  if (mapContainer.value) {
    // 限制地图范围在一张图内
    const bounds = L.latLngBounds(
      L.latLng(-85, -180),
      L.latLng(85, 180)
    )
    
    // 创建 Leaflet 地图
    map = L.map(mapContainer.value, {
      center: [35, 105],
      zoom: 4,
      minZoom: 4,
      maxZoom: 7,
      zoomControl: true,
      attributionControl: false,
      maxBounds: bounds,
      maxBoundsViscosity: 1.0
    })
    
    // 设置背景色
    mapContainer.value.style.backgroundColor = '#b5d6f1'
    
    // 添加天地图瓦片底图
    L.tileLayer('/tiles/vec_w/{z}/{y}/{x}.png', {
      maxZoom: 7,
      minZoom: 4,
      noWrap: true,
      bounds: bounds
    }).addTo(map)
    
    // 添加天地图注记
    L.tileLayer('/tiles/cva_w/{z}/{y}/{x}.png', {
      maxZoom: 7,
      minZoom: 4,
      noWrap: true,
      bounds: bounds
    }).addTo(map)
    
    // 绑定鼠标移动事件更新坐标
    map.on('mousemove', (e) => {
      mouseCoord.value = {
        lng: e.latlng.lng.toFixed(4) + '°',
        lat: e.latlng.lat.toFixed(4) + '°',
        zoom: map.getZoom()
      }
    })
    
    // 加载国家边界 GeoJSON
    try {
      const response = await fetch('/data/countries.geojson')
      geojsonData = await response.json()
      
      // 处理台湾属于中国
      geojsonData.features.forEach(f => {
        if (f.properties['ISO3166-1-Alpha-3'] === 'TWN') {
          f.properties['ISO3166-1-Alpha-3'] = 'CHN'
        }
      })
      
      countriesLayer = L.geoJSON(geojsonData, {
        style: (feature) => getFeatureStyle(feature),
        onEachFeature: (feature, layer) => {
          const rawCode = feature.properties['ISO3166-1-Alpha-3'] || feature.properties.ISO_A3 || feature.properties.ADM0_A3 || ''
          const nameEN = feature.properties.name || feature.properties.NAME || feature.properties.ADMIN || ''
          // 对于代码为-99的国家，使用名称作为key
          const code = (rawCode && rawCode !== '-99') ? rawCode : nameEN
          const nameCN = code === 'CHN' ? '中国' : getChineseName(nameEN)
          
          // 存储图层引用
          if (!countryLayers[code]) {
            countryLayers[code] = []
          }
          countryLayers[code].push(layer)
          
          // 绑定事件（传入英文名用于边界匹配）
          layer.on('click', () => onCountryClick(code, nameEN, nameCN))
          layer.on('mouseover', () => onCountryHover(code, layer))
          layer.on('mouseout', () => onCountryOut(code))
        }
      }).addTo(map)
    } catch (error) {
      console.error('加载国家边界数据失败:', error)
    }
    
    // 移动缩放控件到左上角
    map.zoomControl.setPosition('topleft')
  }
})

// 获取国家样式
const getFeatureStyle = (feature) => {
  const code = feature.properties['ISO3166-1-Alpha-3'] || feature.properties.ISO_A3 || feature.properties.ADM0_A3 || ''
  const style = getCountryStyle(code)
  const isChina = code === 'CHN'
  
  return {
    fillColor: style.color,
    fillOpacity: style.opacity,
    color: isChina ? '#ff0000' : '#ffffff',
    weight: isChina ? 2 : 1,
    opacity: 0.8
  }
}

// 根据当前图层获取国家样式
const getCountryStyle = (code) => {
  if (currentLayer.value === 'security') {
    const color = getCountrySecurityColor(code)
    const level = getSecurityLevel(code)
    return { color, opacity: level === 0 ? 0.5 : 0.6 }
  } else {
    const color = getCountryFrequencyColor(code)
    return { color, opacity: 0.7 }
  }
}

// 切换图层
const switchLayer = (layer) => {
  currentLayer.value = layer
  applyCurrentLayer()
}

// 应用当前图层样式
const applyCurrentLayer = () => {
  Object.keys(countryLayers).forEach(code => {
    if (focusedCountry.value?.code === code) return
    
    const style = getCountryStyle(code)
    const isChina = code === 'CHN'
    const layers = countryLayers[code] || []
    layers.forEach(layer => {
      layer.setStyle({
        fillColor: style.color,
        fillOpacity: style.opacity,
        color: isChina ? '#ff0000' : '#ffffff',
        weight: isChina ? 2 : 1
      })
    })
  })
}

// 点击国家
const onCountryClick = (code, nameEN, nameCN) => {
  if (code === 'TWN') {
    code = 'CHN'
    nameEN = 'China'
    nameCN = '中国'
  }
  // 清理悬浮状态
  lastHoveredCode = null
  focusOnCountryWithNames(code, nameEN, nameCN)
}

// 鼠标悬浮国家
const onCountryHover = (code) => {
  if (code === 'TWN') code = 'CHN'
  if (lastHoveredCode === code) return
  
  // 恢复上一个悬浮国家的样式
  if (lastHoveredCode) {
    restoreCountryStyle(lastHoveredCode)
  }
  
  lastHoveredCode = code
  
  // 如果不是当前选中的国家，显示悬浮高亮效果
  if (focusedCountry.value?.code !== code) {
    const layers = countryLayers[code] || []
    const style = getCountryStyle(code)
    layers.forEach(layer => {
      layer.setStyle({
        fillColor: style.color,
        fillOpacity: 0.9,
        color: '#333333',
        weight: 2,
        opacity: 1
      })
    })
  }
}

// 鼠标离开国家
const onCountryOut = (code) => {
  // 由 onCountryHover 处理恢复
}

// 恢复国家样式
const restoreCountryStyle = (code) => {
  // 如果是当前选中的国家，保持蓝色高亮
  if (focusedCountry.value?.code === code) {
    const layers = countryLayers[code] || []
    layers.forEach(layer => {
      layer.setStyle({
        fillColor: '#2196F3',
        fillOpacity: 0.4,
        color: '#1565C0',
        weight: 3
      })
    })
    return
  }
  
  const layers = countryLayers[code] || []
  const style = getCountryStyle(code)
  const isChina = code === 'CHN'
  layers.forEach(layer => {
    layer.setStyle({
      fillColor: style.color,
      fillOpacity: style.opacity,
      color: isChina ? '#ff0000' : '#ffffff',
      weight: isChina ? 2 : 1,
      opacity: 0.8
    })
  })
}

// 聚焦到国家（支持英文名用于边界匹配，中文名用于显示）
const focusOnCountryWithNames = (code, nameEN, nameCN) => {
  // 先保存之前选中的国家代码
  const prevCode = focusedCountry.value?.code
  
  // 清空当前选中状态，这样 restoreCountryStyle 才能正确恢复样式
  focusedCountry.value = null
  
  // 恢复之前选中国家的样式
  if (prevCode) {
    restoreCountryStyle(prevCode)
  }
  
  // 尝试用 code 或 nameEN 查找图层
  let layers = countryLayers[code] || []
  if (layers.length === 0 && nameEN) {
    layers = countryLayers[nameEN] || []
  }
  
  // 更新 focusedCountry，使用实际找到图层的 key
  const actualCode = countryLayers[code] ? code : (countryLayers[nameEN] ? nameEN : code)
  focusedCountry.value = { code: actualCode, name: nameCN }
  
  layers.forEach(layer => {
    layer.setStyle({
      fillColor: '#2196F3',
      fillOpacity: 0.4,
      color: '#1565C0',
      weight: 3
    })
  })
  
  // 飞到该国家
  if (layers.length > 0) {
    let bounds
    
    // 特殊处理有远离本土领地的国家
    const specialBoundsMap = {
      'RUS': L.latLngBounds(L.latLng(41, 20), L.latLng(77, 140)),
      'Russia': L.latLngBounds(L.latLng(41, 20), L.latLng(77, 140)),
      'USA': L.latLngBounds(L.latLng(24, -125), L.latLng(50, -66)),
      'United States of America': L.latLngBounds(L.latLng(24, -125), L.latLng(50, -66)),
      'NOR': L.latLngBounds(L.latLng(57, 4), L.latLng(71, 31)),
      'Norway': L.latLngBounds(L.latLng(57, 4), L.latLng(71, 31)),
      'FRA': L.latLngBounds(L.latLng(41, -5), L.latLng(51, 10)),
      'France': L.latLngBounds(L.latLng(41, -5), L.latLng(51, 10)),
      'NLD': L.latLngBounds(L.latLng(50.5, 3), L.latLng(53.5, 7.5)),
      'Netherlands': L.latLngBounds(L.latLng(50.5, 3), L.latLng(53.5, 7.5)),
      'DNK': L.latLngBounds(L.latLng(54.5, 8), L.latLng(57.8, 15)),
      'Denmark': L.latLngBounds(L.latLng(54.5, 8), L.latLng(57.8, 15)),
      'GBR': L.latLngBounds(L.latLng(49, -8), L.latLng(61, 2)),
      'United Kingdom': L.latLngBounds(L.latLng(49, -8), L.latLng(61, 2)),
      'ESP': L.latLngBounds(L.latLng(36, -9.5), L.latLng(43.8, 4.5)),
      'Spain': L.latLngBounds(L.latLng(36, -9.5), L.latLng(43.8, 4.5)),
      'PRT': L.latLngBounds(L.latLng(36.9, -9.5), L.latLng(42.2, -6)),
      'Portugal': L.latLngBounds(L.latLng(36.9, -9.5), L.latLng(42.2, -6)),
      'AUS': L.latLngBounds(L.latLng(-44, 112), L.latLng(-10, 154)),
      'Australia': L.latLngBounds(L.latLng(-44, 112), L.latLng(-10, 154)),
      'NZL': L.latLngBounds(L.latLng(-47, 166), L.latLng(-34, 179)),
      'New Zealand': L.latLngBounds(L.latLng(-47, 166), L.latLng(-34, 179)),
      'CHL': L.latLngBounds(L.latLng(-56, -76), L.latLng(-17, -66)),
      'Chile': L.latLngBounds(L.latLng(-56, -76), L.latLng(-17, -66)),
      'ECU': L.latLngBounds(L.latLng(-5, -81), L.latLng(1.5, -75)),
      'Ecuador': L.latLngBounds(L.latLng(-5, -81), L.latLng(1.5, -75)),
      'IDN': L.latLngBounds(L.latLng(-11, 95), L.latLng(6, 141)),
      'Indonesia': L.latLngBounds(L.latLng(-11, 95), L.latLng(6, 141)),
      'MYS': L.latLngBounds(L.latLng(0.8, 99), L.latLng(7.5, 119)),
      'Malaysia': L.latLngBounds(L.latLng(0.8, 99), L.latLng(7.5, 119)),
      'JPN': L.latLngBounds(L.latLng(30, 129), L.latLng(46, 146)),
      'Japan': L.latLngBounds(L.latLng(30, 129), L.latLng(46, 146)),
      'KIR': L.latLngBounds(L.latLng(-5, 169), L.latLng(5, 177)),
      'Kiribati': L.latLngBounds(L.latLng(-5, 169), L.latLng(5, 177)),
      'FJI': L.latLngBounds(L.latLng(-21, 177), L.latLng(-12, -179.5)),
      'Fiji': L.latLngBounds(L.latLng(-21, 177), L.latLng(-12, -179.5))
    }
    
    if (specialBoundsMap[code]) {
      bounds = specialBoundsMap[code]
    } else if (specialBoundsMap[nameEN]) {
      bounds = specialBoundsMap[nameEN]
    } else {
      bounds = L.featureGroup(layers).getBounds()
    }
    
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 6 })
    currentCountryBounds = bounds
  }
  
  if (code === 'CHN') {
    addDiaoyuMarker()
  }
  
  showMiniMap.value = true
  showCountryDetail.value = true
  
  setTimeout(() => {
    initMiniMap(currentCountryBounds)
  }, 100)
}

// 聚焦到国家（保留用于兼容）
const focusOnCountry = (code, name) => {
  // 调用新函数，name 作为英文名和中文名
  focusOnCountryWithNames(code, name, name)
}

// 添加钓鱼岛标记
const addDiaoyuMarker = () => {
  if (diaoyuMarker) {
    map.removeLayer(diaoyuMarker)
  }
  
  diaoyuMarker = L.circleMarker([25.75, 123.47], {
    radius: 12,
    fillColor: '#2196F3',
    fillOpacity: 0.7,
    color: '#1565C0',
    weight: 3
  })
  
  diaoyuMarker.bindTooltip('钓鱼岛', {
    permanent: false,
    direction: 'top',
    offset: [0, -10]
  })
  
  if (map.getZoom() >= 6) {
    diaoyuMarker.addTo(map)
  }
  
  map.on('zoomend', updateDiaoyuVisibility)
}

// 点击国家时聚焦并显示小地图（旧方法保留兼容）
const onCountryClickOld = (feature, layer) => {
  const countryName = feature.properties.NAME || feature.properties.ADMIN || feature.properties.name || '未知'
  const countryCode = feature.properties.ISO_A3 || feature.properties.ADM0_A3 || feature.properties['ISO3166-1-Alpha-3'] || ''
  console.log('点击国家:', countryName, countryCode)
  
  // 重置之前选中的国家颜色
  resetSelectedLayers()
  
  // 中国相关的代码列表
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
  
  // 获取国家边界
  if (isChina) {
    currentCountryBounds = getChinaBounds()
  } else {
    currentCountryBounds = getMainlandBounds(feature, layer)
  }
  
  // 先聚焦到该国家
  map.fitBounds(currentCountryBounds, { padding: [50, 50], maxZoom: 6 })
  
  // 聚焦完成后再渲染红色
  setTimeout(() => {
    selectedLayers.forEach(l => {
      l.setStyle({
        fillColor: '#e74c3c',
        fillOpacity: 0.35,
        color: '#c0392b',
        weight: 1.5
      })
    })
    
    // 如果是中国，添加钓鱼岛标记（只在缩放级别>=6时显示）
    if (isChina) {
      diaoyuMarker = L.circleMarker([25.75, 123.47], {
        radius: 12,
        fillColor: '#e74c3c',
        fillOpacity: 0.7,
        color: '#c0392b',
        weight: 3
      })
      
      diaoyuMarker.bindTooltip('钓鱼岛', {
        permanent: false,
        direction: 'top',
        offset: [0, -10]
      })
      
      // 根据当前缩放级别决定是否显示
      if (map.getZoom() >= 6) {
        diaoyuMarker.addTo(map)
      }
      
      // 监听缩放事件，动态显示/隐藏钓鱼岛标记
      map.on('zoomend', updateDiaoyuVisibility)
    }
  }, 300)
  
  // 显示小地图概览
  showMiniMap.value = true
  
  setTimeout(() => {
    initMiniMap(currentCountryBounds)
  }, 100)
}

// 获取中国边界
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

// 重置选中的图层
const resetSelectedLayers = () => {
  selectedLayers.forEach(l => {
    l.setStyle({
      fillColor: 'transparent',
      fillOpacity: 0,
      color: 'transparent',
      weight: 0
    })
  })
  selectedLayers = []
  
  // 移除缩放监听
  if (map) {
    map.off('zoomend', updateDiaoyuVisibility)
  }
  
  if (diaoyuMarker) {
    map.removeLayer(diaoyuMarker)
    diaoyuMarker = null
  }
}

// 根据缩放级别更新钓鱼岛标记显示
const updateDiaoyuVisibility = () => {
  if (!diaoyuMarker || !map) return
  
  if (map.getZoom() >= 6) {
    if (!map.hasLayer(diaoyuMarker)) {
      diaoyuMarker.addTo(map)
    }
  } else {
    if (map.hasLayer(diaoyuMarker)) {
      map.removeLayer(diaoyuMarker)
    }
  }
}

// 获取国家主要领土的边界
const getMainlandBounds = (feature, layer) => {
  const geometry = feature.geometry
  
  if (geometry.type === 'MultiPolygon') {
    let maxArea = 0
    let mainPolygon = null
    
    geometry.coordinates.forEach(polygon => {
      let minLng = Infinity, maxLng = -Infinity
      let minLat = Infinity, maxLat = -Infinity
      
      polygon[0].forEach(coord => {
        const lng = coord[0]
        const lat = coord[1]
        if (lng < minLng) minLng = lng
        if (lng > maxLng) maxLng = lng
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
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
    return L.latLngBounds(
      L.latLng(sw.lat, center.lng - 30),
      L.latLng(ne.lat, center.lng + 30)
    )
  }
  
  return bounds
}

// 初始化小地图
const initMiniMap = (countryBounds) => {
  if (!miniMapContainer.value) return
  
  if (miniMap) {
    miniMap.remove()
    miniMap = null
  }
  
  // 设置小地图容器背景色（海洋）
  miniMapContainer.value.style.backgroundColor = '#a3c8e8'
  
  // 创建小地图
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
  
  // 用 GeoJSON 绘制国家轮廓
  if (geojsonData) {
    L.geoJSON(geojsonData, {
      style: {
        fillColor: '#f5f5dc',
        fillOpacity: 1,
        color: '#999',
        weight: 0.5
      }
    }).addTo(miniMap)
  }
  
  // 延迟添加矩形框
  setTimeout(() => {
    viewRectangle = L.rectangle(countryBounds, {
      color: '#c00',
      weight: 2,
      fillColor: '#c00',
      fillOpacity: 0.2
    }).addTo(miniMap)
    
    miniMap.fitBounds(countryBounds.pad(0.5), { animate: false })
  }, 200)
}

// 关闭小地图
const closeMiniMap = () => {
  showMiniMap.value = false
  currentCountryBounds = null
  
  if (miniMap) {
    miniMap.remove()
    miniMap = null
    viewRectangle = null
  }
}

// 关闭国家详情面板
const closeCountryDetail = () => {
  showCountryDetail.value = false
  showMiniMap.value = false
  
  // 先保存代码，再清除选中状态，最后恢复样式
  const prevCode = focusedCountry.value?.code
  focusedCountry.value = null
  
  if (prevCode) {
    restoreCountryStyle(prevCode)
  }
  
  // 清理小地图
  if (miniMap) {
    miniMap.remove()
    miniMap = null
  }
}

// 拖动小地图窗口
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
const onTimelineEventClick = (e) => console.log('时间轴事件:', e)
const onTimelineFilter = (f) => console.log('时间轴筛选:', f)

// 从国家列表点击国家
const onCountryListClick = (country) => {
  if (!countriesLayer) return
  
  // 传入国家代码、英文名（用于边界匹配）和中文名（用于显示）
  focusOnCountryWithNames(country.code, country.nameEN, country.nameCN)
}

// 清理地图
onUnmounted(() => {
  if (miniMap) {
    miniMap.remove()
    miniMap = null
  }
  if (map) {
    map.remove()
    map = null
  }
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

/* 顶部导航栏 */
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

/* 主内容区 */
.main-area {
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* 地图容器 */
.map-container {
  width: 100%;
  height: 100%;
}

/* 国家图层过渡效果 */
.map-container :deep(.country-layer) {
  transition: fill-opacity 0.3s ease, stroke-opacity 0.3s ease;
}

/* 去除瓦片拼接线 */
.map-container :deep(.leaflet-tile) {
  outline: none !important;
  border: none !important;
}

.map-container :deep(.leaflet-tile-container) {
  outline: none !important;
}

.map-container :deep(.leaflet-tile-pane) {
  image-rendering: -webkit-optimize-contrast;
}

/* 小地图概览 */
.mini-map-container {
  position: absolute;
  left: 400px;
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

/* 搜索框 */
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
</style>

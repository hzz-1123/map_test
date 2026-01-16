<template>
  <div :class="['left-drawer-wrapper', { collapsed: isCollapsed }]">
    <!-- 抽屉内容 -->
    <div :class="['drawer-content', { collapsed: isCollapsed }]">
      <div class="drawer-menu">
        <div 
          v-for="item in menuItems" 
          :key="item.id"
          :class="['menu-item', { active: activeItem === item.id }]"
          @click="selectItem(item.id)"
        >
          <span class="menu-text">{{ item.name }}</span>
        </div>
      </div>
    </div>
    
    <!-- 伸缩按钮（固定位置） -->
    <div class="toggle-btn" @click="toggleDrawer">
      <span class="toggle-arrow">{{ isCollapsed ? '›' : '‹' }}</span>
    </div>
    
    <!-- 国家列表面板 -->
    <div v-if="showCountryPanel" class="country-panel">
      <div class="panel-header">
        <span class="panel-title">国家</span>
        <button class="panel-close" @click="closeCountryPanel">×</button>
      </div>
      <div class="panel-search">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="搜索..." 
          class="search-input"
        />
      </div>
      <div class="country-list">
        <div 
          v-for="country in filteredCountries" 
          :key="country.code"
          class="country-item"
          @click="onCountryItemClick(country)"
        >
          <span class="country-code">{{ country.code }}</span>
          <span class="country-name">{{ country.nameCN }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { getChineseName } from '../data/countryNames.js';

export default {
  name: "LeftDrawer",
  data() {
    return {
      isCollapsed: false,
      activeItem: 'country',
      showCountryPanel: false,
      searchQuery: '',
      countries: [],
      menuItems: [
        { id: 'country', name: '国家' },
        { id: 'person', name: '人物' },
        { id: 'facility', name: '设施' },
        { id: 'organization', name: '机构' },
        { id: 'event', name: '事件' }
      ]
    };
  },
  computed: {
    filteredCountries() {
      if (!this.searchQuery) return this.countries;
      const query = this.searchQuery.toLowerCase();
      return this.countries.filter(c => 
        c.nameCN.includes(query) || 
        c.nameEN.toLowerCase().includes(query) ||
        c.code.toLowerCase().includes(query)
      );
    }
  },
  async mounted() {
    await this.loadCountries();
  },
  methods: {
    toggleDrawer() {
      this.isCollapsed = !this.isCollapsed;
      if (this.isCollapsed) {
        this.showCountryPanel = false;
      }
      this.$emit('toggle', this.isCollapsed);
    },
    selectItem(id) {
      this.activeItem = id;
      this.$emit('select', id);
      
      if (id === 'country') {
        this.showCountryPanel = !this.showCountryPanel;
      } else {
        this.showCountryPanel = false;
      }
    },
    closeCountryPanel() {
      this.showCountryPanel = false;
    },
    async loadCountries() {
      try {
        const response = await fetch('/data/countries.geojson');
        const geojson = await response.json();
        
        const countryMap = new Map();
        
        geojson.features.forEach(feature => {
          const props = feature.properties;
          const nameEN = props.NAME || props.ADMIN || props.name || '';
          const code = props.ISO_A3 || props.ADM0_A3 || props['ISO3166-1-Alpha-3'] || '';
          
          // 跳过无效数据和重复项
          if (!nameEN || countryMap.has(code)) return;
          
          // 跳过一些特殊区域
          const skipList = ['Antarctica', 'Bir Tawil', 'Scarborough Reef', 'Serranilla Bank', 'Bajo Nuevo Bank (Petrel Is.)'];
          if (skipList.includes(nameEN)) return;
          
          const nameCN = getChineseName(nameEN);
          
          countryMap.set(code, {
            code: code || '--',
            nameEN,
            nameCN,
            feature
          });
        });
        
        // 按中文名排序
        this.countries = Array.from(countryMap.values()).sort((a, b) => 
          a.nameCN.localeCompare(b.nameCN, 'zh-CN')
        );
      } catch (error) {
        console.error('加载国家数据失败:', error);
      }
    },
    onCountryItemClick(country) {
      this.$emit('country-click', country);
    }
  }
};
</script>

<style scoped>
.left-drawer-wrapper {
  position: absolute;
  top: 150px;
  left: 0;
  z-index: 999;
  display: flex;
  align-items: stretch;
  height: 400px;
  transition: transform 0.3s ease, height 0.3s ease, top 0.3s ease;
}

.left-drawer-wrapper.collapsed {
  top: calc(50% - 30px);
  height: 60px;
}

/* 抽屉内容 */
.drawer-content {
  width: 80px;
  background: linear-gradient(to right, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
  backdrop-filter: blur(10px);
  border: 1px solid rgba(200, 200, 200, 0.3);
  border-left: none;
  border-radius: 0;
  overflow: hidden;
  transition: width 0.3s ease;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.1);
}

.drawer-content.collapsed {
  width: 0;
  border-width: 0;
}

.drawer-menu {
  width: 80px;
  display: flex;
  flex-direction: column;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  cursor: pointer;
  border-bottom: 1px solid rgba(200, 200, 200, 0.3);
  transition: background 0.2s;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:hover {
  background: rgba(59, 130, 246, 0.15);
}

.menu-item.active {
  background: linear-gradient(to right, rgba(59, 130, 246, 0.25), rgba(59, 130, 246, 0.1));
  border-left: 3px solid #3b82f6;
}

.menu-text {
  color: #374151;
  font-size: 18px;
  writing-mode: vertical-rl;
  letter-spacing: 8px;
  white-space: nowrap;
}

.menu-item.active .menu-text {
  color: #1d4ed8;
  font-weight: 500;
}

/* 伸缩按钮 */
.toggle-btn {
  width: 20px;
  background: linear-gradient(to right, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.7));
  backdrop-filter: blur(10px);
  border: 1px solid rgba(200, 200, 200, 0.3);
  border-left: none;
  border-radius: 0 6px 6px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.08);
}

.toggle-btn:hover {
  background: rgba(255, 255, 255, 0.95);
}

.toggle-arrow {
  color: #6b7280;
  font-size: 18px;
  font-weight: bold;
}

.toggle-btn:hover .toggle-arrow {
  color: #3b82f6;
}

/* 国家列表面板 */
.country-panel {
  position: absolute;
  left: 100px;
  top: 0;
  width: 280px;
  height: 500px;
  background: #2d3a4b;
  border-radius: 4px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #2d3a4b;
  border-bottom: 1px solid #3d4a5c;
}

.panel-title {
  color: #fff;
  font-size: 15px;
  font-weight: 500;
}

.panel-close {
  background: none;
  border: none;
  color: #8b9cb5;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.panel-close:hover {
  color: #fff;
}

.panel-search {
  padding: 12px 16px;
}

.panel-search .search-input {
  width: 100%;
  padding: 8px 12px;
  background: #3d4a5c;
  border: none;
  border-radius: 4px;
  color: #fff;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.panel-search .search-input::placeholder {
  color: #8b9cb5;
}

.country-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}

.country-list::-webkit-scrollbar {
  width: 6px;
}

.country-list::-webkit-scrollbar-track {
  background: #2d3a4b;
}

.country-list::-webkit-scrollbar-thumb {
  background: #4a5568;
  border-radius: 3px;
}

.country-item {
  display: flex;
  align-items: center;
  padding: 12px 8px;
  cursor: pointer;
  border-bottom: 1px solid #3d4a5c;
  transition: background 0.2s;
}

.country-item:hover {
  background: #3d4a5c;
}

.country-item:last-child {
  border-bottom: none;
}

.country-code {
  width: 40px;
  color: #8b9cb5;
  font-size: 13px;
  flex-shrink: 0;
}

.country-name {
  flex: 1;
  color: #e2e8f0;
  font-size: 14px;
}

.country-checkbox {
  display: none;
}
</style>

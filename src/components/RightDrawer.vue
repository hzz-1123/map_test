<template>
  <div :class="['right-drawer-wrapper', { collapsed: isCollapsed }]">
    <!-- 伸缩按钮 -->
    <div class="toggle-btn" @click="toggleDrawer">
      <span class="toggle-arrow">{{ isCollapsed ? '‹' : '›' }}</span>
    </div>
    
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
    
    <!-- 国家详情面板 -->
    <div v-if="focusedCountry && !isCollapsed" class="country-detail-panel">
      <div class="panel-header">
        <span class="panel-title">国家情况</span>
        <button class="panel-close" @click="closeDetail">×</button>
      </div>
      <div class="panel-content">
        <!-- 国家简介 -->
        <div class="section country-intro" v-if="activeItem === 'country'">
          <div class="section-header">
            <span class="icon">🏛</span>
            <span>国家简介</span>
          </div>
          <div class="intro-grid">
            <div class="intro-item">
              <span class="label">国土面积</span>
              <span class="value">{{ countryData.area }}</span>
            </div>
            <div class="intro-item">
              <span class="label">人口数量</span>
              <span class="value">{{ countryData.population }}</span>
            </div>
            <div class="intro-item">
              <span class="label">首都</span>
              <span class="value">{{ countryData.capital }}</span>
            </div>
            <div class="intro-item">
              <span class="label">领导人</span>
              <span class="value">{{ countryData.leader }}</span>
            </div>
            <div class="intro-item">
              <span class="label">官方语言</span>
              <span class="value">{{ countryData.language }}</span>
            </div>
            <div class="intro-item">
              <span class="label">货币</span>
              <span class="value">{{ countryData.currency }}</span>
            </div>
          </div>
        </div>

        <!-- 最近热点事件 -->
        <div class="section hot-events" v-if="activeItem === 'country'">
          <div class="section-header">
            <span class="icon">🔥</span>
            <span>最近热点事件</span>
          </div>
          <div class="event-list">
            <div class="event-item" v-for="event in recentEvents" :key="event.id">
              <div class="event-title">{{ event.title }}</div>
              <div class="event-date">{{ event.date }}</div>
            </div>
          </div>
        </div>

        <!-- 军事 -->
        <div v-if="activeItem === 'military'" class="section">
          <div class="section-header">
            <span class="icon">⚔️</span>
            <span>军事情况</span>
          </div>
          <div class="chart-placeholder">军事数据图表</div>
        </div>

        <!-- 政策 -->
        <div v-if="activeItem === 'policy'" class="section">
          <div class="section-header">
            <span class="icon">📋</span>
            <span>政策情况</span>
          </div>
          <div class="chart-placeholder">政策数据图表</div>
        </div>

        <!-- 外交 -->
        <div v-if="activeItem === 'diplomatic'" class="section">
          <div class="section-header">
            <span class="icon">🤝</span>
            <span>外交情况</span>
          </div>
          <div class="chart-placeholder">外交数据图表</div>
        </div>

        <!-- 安全 -->
        <div v-if="activeItem === 'security'" class="section">
          <div class="section-header">
            <span class="icon">🛡️</span>
            <span>安全情况</span>
          </div>
          <div class="chart-placeholder">安全数据图表</div>
        </div>

        <!-- 经济 -->
        <div v-if="activeItem === 'economic'" class="section">
          <div class="section-header">
            <span class="icon">💰</span>
            <span>经济情况</span>
          </div>
          <div class="chart-placeholder">经济数据图表</div>
        </div>

        <!-- 科技 -->
        <div v-if="activeItem === 'tech'" class="section">
          <div class="section-header">
            <span class="icon">🔬</span>
            <span>科技情况</span>
          </div>
          <div class="chart-placeholder">科技数据图表</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "RightDrawer",
  props: {
    focusedCountry: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      isCollapsed: true,
      activeItem: 'country',
      menuItems: [
        { id: 'country', name: '国家' },
        { id: 'military', name: '军事' },
        { id: 'policy', name: '政策' },
        { id: 'diplomatic', name: '外交' },
        { id: 'security', name: '安全' },
        { id: 'economic', name: '经济' },
        { id: 'tech', name: '科技' }
      ]
    };
  },
  computed: {
    countryData() {
      return {
        area: '328万平方公里',
        population: '14.2亿',
        capital: '新德里',
        leader: '纳伦德拉·莫迪',
        language: '印地语、英语',
        currency: '印度卢比'
      };
    },
    recentEvents() {
      return [
        { id: 1, title: '边境军事演习', date: '2025-01-08' },
        { id: 2, title: '经济改革政策发布', date: '2025-01-05' }
      ];
    }
  },
  watch: {
    focusedCountry(newVal) {
      if (newVal) {
        this.activeItem = 'country';
        this.isCollapsed = false;
      } else {
        this.isCollapsed = true;
      }
    }
  },
  methods: {
    toggleDrawer() {
      this.isCollapsed = !this.isCollapsed;
      this.$emit('toggle', this.isCollapsed);
    },
    selectItem(id) {
      this.activeItem = id;
      this.$emit('select', id);
    },
    closeDetail() {
      this.$emit('close-detail');
    }
  }
};
</script>

<style scoped>
.right-drawer-wrapper {
  position: absolute;
  top: 150px;
  right: 0;
  z-index: 999;
  display: flex;
  align-items: stretch;
  height: 560px;
  transition: transform 0.3s ease, height 0.3s ease, top 0.3s ease;
}

.right-drawer-wrapper.collapsed {
  top: calc(50% - 30px);
  height: 60px;
}

.drawer-content {
  width: 80px;
  height: 100%;
  background: linear-gradient(to left, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
  backdrop-filter: blur(10px);
  border: 1px solid rgba(200, 200, 200, 0.3);
  border-right: none;
  overflow: hidden;
  transition: width 0.3s ease;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
}

.drawer-content.collapsed {
  width: 0;
  border-width: 0;
}

.drawer-menu {
  width: 80px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
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
  background: linear-gradient(to left, rgba(59, 130, 246, 0.25), rgba(59, 130, 246, 0.1));
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

.toggle-btn {
  width: 20px;
  background: linear-gradient(to left, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.7));
  backdrop-filter: blur(10px);
  border: 1px solid rgba(200, 200, 200, 0.3);
  border-right: none;
  border-radius: 6px 0 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.08);
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

/* 国家详情面板 */
.country-detail-panel {
  position: absolute;
  right: 100px;
  top: 0;
  width: 320px;
  height: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 4px;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.8);
  border-bottom: 1px solid rgba(200, 200, 200, 0.3);
}

.panel-title {
  color: #1f2937;
  font-size: 15px;
  font-weight: 600;
}

.panel-close {
  background: none;
  border: none;
  color: #6b7280;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.panel-close:hover {
  color: #ef4444;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: rgba(200, 200, 200, 0.2);
}

.panel-content::-webkit-scrollbar-thumb {
  background: rgba(59, 130, 246, 0.3);
  border-radius: 3px;
}

.section {
  margin-bottom: 16px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  padding: 12px;
  border: 1px solid rgba(200, 200, 200, 0.2);
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(200, 200, 200, 0.3);
}

.icon {
  font-size: 14px;
}

.intro-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.intro-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.intro-item .label {
  font-size: 11px;
  color: #6b7280;
}

.intro-item .value {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-item {
  padding-left: 12px;
  border-left: 3px solid rgba(59, 130, 246, 0.5);
}

.event-title {
  font-size: 13px;
  color: #1f2937;
  font-weight: 500;
}

.event-date {
  font-size: 11px;
  color: #6b7280;
  margin-top: 2px;
}

.chart-placeholder {
  height: 120px;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 13px;
}
</style>

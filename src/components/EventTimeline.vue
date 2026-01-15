<template>
  <div class="event-timeline-wrapper" :class="{ collapsed: isCollapsed }">
    <!-- 折叠按钮 -->
    <div class="collapse-toggle" @click="toggleCollapse">
      <span class="collapse-arrow">{{ isCollapsed ? '▲' : '▼' }}</span>
      <span class="collapse-text">{{ isCollapsed ? '展开时间轴' : '收起' }}</span>
    </div>

    <!-- 内容区域 -->
    <div class="timeline-content" v-show="!isCollapsed">
      <!-- 顶部筛选栏 -->
      <div class="timeline-header">
        <div class="header-left">
          <span class="header-title">事件时间轴分布</span>
        </div>
        <div class="header-right">
          <select v-model="selectedCategory" class="filter-select">
            <option value="all">全部类型</option>
            <option v-for="cat in eventCategories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
          <input type="date" v-model="startDate" class="date-input" />
          <span class="date-separator">至</span>
          <input type="date" v-model="endDate" class="date-input" />
          <input type="text" class="search-input" placeholder="搜索事件..." v-model="searchText" />
          <select v-model="timeUnit" class="filter-select small">
            <option value="year">年</option>
            <option value="half">半年</option>
          </select>
          <button class="filter-btn" @click="toggleMultiSelect">多选</button>
          <button class="filter-btn" @click="applyFilter">筛选</button>
          <button class="filter-btn highlight" @click="showRelated">关联时间段</button>
        </div>
      </div>

      <!-- 国家标题 -->
      <div class="country-title">{{ countryName }} - 事件时间分布</div>

      <!-- 时间轴区域 -->
      <div class="timeline-area">
        <div class="timeline-scroll" ref="timelineScroll">
          <!-- 年份列 -->
          <div class="year-columns">
            <div class="year-column" v-for="period in displayPeriods" :key="period.key">
              <!-- 棋盘格 -->
              <div class="event-grid">
                <div 
                  class="grid-row" 
                  v-for="(row, rowIdx) in getGridData(period.key)" 
                  :key="rowIdx"
                >
                  <div 
                    class="event-dot"
                    v-for="(event, colIdx) in row"
                    :key="colIdx"
                    :style="{ backgroundColor: event.color }"
                    :title="event.title + ' (' + event.date + ')'"
                    @click="onEventClick(event)"
                  ></div>
                </div>
              </div>
              <!-- 年份标签 -->
              <div class="year-label">{{ period.label }}</div>
            </div>
          </div>
          
          <!-- 时间轴线 -->
          <div class="timeline-axis"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "EventTimeline",
  props: {
    countryCode: { type: String, default: '' },
    countryName: { type: String, default: '全球' }
  },
  data() {
    return {
      isCollapsed: false,
      selectedCategory: 'all',
      startDate: '2020-01-01',
      endDate: '2026-12-31',
      searchText: '',
      timeUnit: 'year',
      isMultiSelect: false,
      
      // 事件类型配置（颜色顺序：紫、蓝、青、绿、黄、橙、红）
      eventCategories: [
        { id: 'security', name: '安全', color: '#9c27b0' },
        { id: 'policy', name: '政策', color: '#2196f3' },
        { id: 'tech', name: '科技', color: '#00bcd4' },
        { id: 'diplomatic', name: '外交', color: '#4caf50' },
        { id: 'economic', name: '经济', color: '#ffeb3b' },
        { id: 'military', name: '军事', color: '#ff9800' },
        { id: 'conflict', name: '冲突', color: '#f44336' }
      ],
      
      // 事件数据
      timelineEvents: []
    };
  },
  computed: {
    displayPeriods() {
      const start = new Date(this.startDate).getFullYear();
      const end = new Date(this.endDate).getFullYear();
      const periods = [];
      
      for (let y = start; y <= end; y++) {
        if (this.timeUnit === 'half') {
          periods.push({ key: `${y}-H1`, label: y, year: y, half: 1 });
          periods.push({ key: `${y}-H2`, label: y, year: y, half: 2 });
        } else {
          periods.push({ key: `${y}`, label: y, year: y });
        }
      }
      return periods;
    }
  },
  created() {
    this.generateMockEvents();
  },
  methods: {
    generateMockEvents() {
      const events = [];
      for (let year = 2020; year <= 2026; year++) {
        this.eventCategories.forEach(cat => {
          const count = Math.floor(Math.random() * 6) + 3;
          for (let i = 0; i < count; i++) {
            const month = Math.floor(Math.random() * 12) + 1;
            const day = Math.floor(Math.random() * 28) + 1;
            events.push({
              date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
              type: cat.id,
              title: `${cat.name}事件`,
              color: cat.color
            });
          }
        });
      }
      this.timelineEvents = events;
    },

    getGridData(periodKey) {
      // 获取该时间段的事件
      let events = this.timelineEvents.filter(e => {
        const eventYear = new Date(e.date).getFullYear();
        const eventMonth = new Date(e.date).getMonth() + 1;
        
        if (this.timeUnit === 'half') {
          const [year, half] = periodKey.split('-H');
          const isFirstHalf = half === '1' ? eventMonth <= 6 : eventMonth > 6;
          return eventYear === parseInt(year) && isFirstHalf;
        }
        return eventYear === parseInt(periodKey);
      });
      
      // 按类型筛选
      if (this.selectedCategory !== 'all') {
        events = events.filter(e => e.type === this.selectedCategory);
      }
      
      // 按类型分组排序（按eventCategories顺序：紫、蓝、青、绿、黄、橙、红）
      events.sort((a, b) => {
        const aIdx = this.eventCategories.findIndex(c => c.id === a.type);
        const bIdx = this.eventCategories.findIndex(c => c.id === b.type);
        return aIdx - bIdx;
      });
      
      // 构建矩形网格（8列，按行从上到下、从左到右填充）
      const cols = 8;
      const grid = [];
      
      for (let i = 0; i < events.length; i++) {
        const row = Math.floor(i / cols);
        const col = i % cols;
        
        if (!grid[row]) grid[row] = [];
        grid[row][col] = events[i];
      }
      
      return grid;
    },
    
    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed;
      this.$emit('collapse-change', this.isCollapsed);
    },
    
    onEventClick(event) {
      this.$emit('event-click', event);
    },
    
    toggleMultiSelect() {
      this.isMultiSelect = !this.isMultiSelect;
    },
    
    applyFilter() {
      this.$emit('filter-apply', {
        category: this.selectedCategory,
        startDate: this.startDate,
        endDate: this.endDate,
        searchText: this.searchText
      });
    },
    
    showRelated() {
      this.$emit('show-related');
    }
  }
};
</script>

<style scoped>
.event-timeline-wrapper {
  position: absolute;
  bottom: 28px;
  left: 0;
  right: 0;
  z-index: 997;
  background: linear-gradient(to top, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1));
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(200, 200, 200, 0.3);
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.event-timeline-wrapper.collapsed {
  background: transparent;
  border-top: none;
  box-shadow: none;
  backdrop-filter: none;
}

/* 折叠按钮 */
.collapse-toggle {
  position: absolute;
  top: -28px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 16px;
  background: linear-gradient(to top, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.8));
  backdrop-filter: blur(10px);
  border: 1px solid rgba(200, 200, 200, 0.3);
  border-bottom: none;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  z-index: 998;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.08);
}

.collapse-arrow {
  color: #3b82f6;
  font-size: 10px;
}

.collapse-text {
  color: #6b7280;
  font-size: 12px;
}

.collapse-toggle:hover {
  background: rgba(255, 255, 255, 0.95);
}

.collapse-toggle:hover .collapse-text {
  color: #374151;
}

/* 内容区域 */
.timeline-content {
  padding: 10px 20px 16px;
}

/* 顶部筛选栏 */
.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.header-left {
  display: flex;
  align-items: center;
}

.header-title {
  color: #1f2937;
  font-size: 14px;
  font-weight: 600;
  padding-left: 8px;
  border-left: 3px solid #3b82f6;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-select, .date-input, .search-input {
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(200, 200, 200, 0.5);
  border-radius: 4px;
  color: #374151;
  font-size: 12px;
}

.filter-select:focus, .date-input:focus, .search-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.filter-select.small {
  width: 60px;
}

.search-input {
  width: 120px;
}

.date-separator {
  color: #6b7280;
  font-size: 12px;
}

.filter-btn {
  padding: 5px 12px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(200, 200, 200, 0.5);
  border-radius: 4px;
  color: #6b7280;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
  color: #3b82f6;
}

.filter-btn.highlight {
  background: linear-gradient(to right, rgba(59, 130, 246, 0.8), rgba(59, 130, 246, 0.6));
  border-color: #3b82f6;
  color: #fff;
}

/* 国家标题 */
.country-title {
  text-align: center;
  color: #1e40af;
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
}

/* 时间轴区域 */
.timeline-area {
  position: relative;
  overflow-x: auto;
  padding-bottom: 5px;
}

.timeline-scroll {
  position: relative;
  min-width: max-content;
  padding-bottom: 25px;
}

.year-columns {
  display: flex;
  gap: 200px;
  padding: 0 40px;
  position: relative;
  z-index: 2;
}

.year-column {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

/* 矩形网格 */
.event-grid {
  display: flex;
  flex-direction: column-reverse;
  gap: 6px;
  min-height: 140px;
  position: relative;
  z-index: 2;
}

.grid-row {
  display: flex;
  gap: 6px;
}

.grid-row:first-child {
  margin-bottom: -6px;
}

.event-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.event-dot:hover {
  transform: scale(1.4);
  box-shadow: 0 0 8px currentColor;
}

/* 年份标签 */
.year-label {
  color: #374151;
  font-size: 16px;
  font-weight: 600;
  margin-top: 8px;
  padding-left: 2px;
}

/* 时间轴线 */
.timeline-axis {
  position: absolute;
  bottom: 22px;
  left: 40px;
  right: 40px;
  height: 2px;
  background: rgba(59, 130, 246, 0.4);
  z-index: 1;
}
</style>

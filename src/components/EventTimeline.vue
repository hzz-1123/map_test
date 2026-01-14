<template>
  <div class="event-timeline-wrapper">
    <!-- 折叠标题栏 -->
    <div class="timeline-header" @click="toggleExpand">
      <span class="header-title">事件时间轴分布</span>
      <span class="expand-icon">{{ isExpanded ? '▼' : '▲' }}</span>
    </div>

    <!-- 展开内容 -->
    <div class="timeline-content" v-show="isExpanded">
      <!-- 筛选控制栏 -->
      <div class="filter-bar">
        <div class="filter-left">
          <select v-model="selectedCategory" class="filter-select">
            <option value="all">全部类型</option>
            <option v-for="cat in eventCategories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>
        <div class="filter-right">
          <input type="date" v-model="startDate" class="date-input" />
          <span class="date-separator">至</span>
          <input type="date" v-model="endDate" class="date-input" />
          <button class="filter-btn" @click="applyFilter">筛选全部</button>
          <button class="filter-btn secondary" @click="filterSelected">筛选选中</button>
          <button class="filter-btn secondary" @click="resetFilter">取消</button>
          <button class="filter-btn primary" @click="confirmFilter">确认</button>
          <button class="filter-btn highlight" @click="showRelated">关联时间段</button>
        </div>
      </div>

      <!-- 国家名称标题 -->
      <div class="country-title">{{ countryName }} - 事件时间分布</div>

      <!-- 时间轴区域 -->
      <div class="timeline-area">
        <div class="timeline-scroll" ref="timelineScroll">
          <!-- 年份列 -->
          <div class="year-columns">
            <div class="year-column" v-for="year in displayYears" :key="year">
              <!-- 事件棋盘格 -->
              <div class="event-grid">
                <div 
                  class="event-dot"
                  v-for="(event, idx) in getYearEvents(year)"
                  :key="idx"
                  :style="{ backgroundColor: event.color }"
                  :title="event.title + ' (' + event.date + ')'"
                  @click="onEventClick(event)"
                ></div>
              </div>
              <!-- 时间轴节点 -->
              <div class="year-node">
                <div class="node-line"></div>
                <div class="node-dot"></div>
              </div>
              <!-- 年份标签 -->
              <div class="year-label">{{ year }}</div>
            </div>
          </div>
          
          <!-- 时间轴线 -->
          <div class="timeline-axis"></div>
        </div>
      </div>

      <!-- 图例 -->
      <div class="legend-bar">
        <div 
          class="legend-item" 
          v-for="cat in eventCategories" 
          :key="cat.id"
          :class="{ active: selectedCategory === cat.id || selectedCategory === 'all' }"
          @click="filterByCategory(cat.id)"
        >
          <span class="legend-dot" :style="{ backgroundColor: cat.color }"></span>
          <span class="legend-text">{{ cat.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "EventTimeline",
  props: {
    countryCode: {
      type: String,
      default: ''
    },
    countryName: {
      type: String,
      default: '全球'
    }
  },
  data() {
    return {
      isExpanded: true,
      selectedCategory: 'all',
      startDate: '2020-01-01',
      endDate: '2026-12-31',
      
      // ========== 事件类型配置 ==========
      // 修改颜色和类型名称
      eventCategories: [
        { id: 'military', name: '军事', color: '#f44336' },
        { id: 'policy', name: '政策', color: '#2196f3' },
        { id: 'diplomatic', name: '外交', color: '#4caf50' },
        { id: 'security', name: '安全', color: '#9c27b0' },
        { id: 'economic', name: '经济', color: '#ff9800' },
        { id: 'tech', name: '科技', color: '#00bcd4' }
      ],
      
      // ========== 事件数据 ==========
      // 格式: { date: 'YYYY-MM-DD', type: '类型ID', title: '事件标题' }
      timelineEvents: [
        // 2020年
        { date: '2020-01-10', type: 'military', title: '军事演习' },
        { date: '2020-01-20', type: 'policy', title: '政策发布' },
        { date: '2020-02-05', type: 'economic', title: '经济会议' },
        { date: '2020-02-15', type: 'diplomatic', title: '外交访问' },
        { date: '2020-03-08', type: 'security', title: '安全事件' },
        { date: '2020-03-22', type: 'tech', title: '科技发布' },
        { date: '2020-04-12', type: 'military', title: '边境巡逻' },
        { date: '2020-05-18', type: 'policy', title: '法规修订' },
        { date: '2020-06-25', type: 'economic', title: '贸易协定' },
        { date: '2020-07-14', type: 'diplomatic', title: '峰会召开' },
        { date: '2020-08-20', type: 'security', title: '反恐行动' },
        { date: '2020-09-10', type: 'tech', title: '技术突破' },
        { date: '2020-10-05', type: 'military', title: '联合军演' },
        { date: '2020-11-15', type: 'policy', title: '新政出台' },
        { date: '2020-12-22', type: 'economic', title: '投资论坛' },
        
        // 2021年
        { date: '2021-01-08', type: 'diplomatic', title: '双边会谈' },
        { date: '2021-01-25', type: 'security', title: '边境冲突' },
        { date: '2021-02-14', type: 'tech', title: '航天发射' },
        { date: '2021-03-10', type: 'military', title: '海上演习' },
        { date: '2021-04-18', type: 'policy', title: '改革方案' },
        { date: '2021-05-22', type: 'economic', title: '金融峰会' },
        { date: '2021-06-15', type: 'diplomatic', title: '国事访问' },
        { date: '2021-07-28', type: 'security', title: '网络安全' },
        { date: '2021-08-12', type: 'tech', title: '5G部署' },
        { date: '2021-09-05', type: 'military', title: '空军演练' },
        { date: '2021-10-20', type: 'policy', title: '环保政策' },
        { date: '2021-11-10', type: 'economic', title: '能源合作' },
        { date: '2021-12-18', type: 'diplomatic', title: '多边会议' },
        
        // 2022年
        { date: '2022-01-15', type: 'security', title: '情报合作' },
        { date: '2022-02-08', type: 'tech', title: 'AI发展' },
        { date: '2022-02-28', type: 'military', title: '导弹试射' },
        { date: '2022-03-20', type: 'policy', title: '税收改革' },
        { date: '2022-04-15', type: 'economic', title: '产业升级' },
        { date: '2022-05-10', type: 'diplomatic', title: '建交纪念' },
        { date: '2022-06-22', type: 'security', title: '反间谍' },
        { date: '2022-07-18', type: 'tech', title: '量子计算' },
        { date: '2022-08-25', type: 'military', title: '冬季演习' },
        { date: '2022-09-12', type: 'policy', title: '医疗改革' },
        { date: '2022-10-28', type: 'economic', title: '自贸协定' },
        { date: '2022-11-15', type: 'diplomatic', title: '首脑会晤' },
        { date: '2022-12-05', type: 'security', title: '打击犯罪' },
        
        // 2023年
        { date: '2023-01-12', type: 'tech', title: '芯片突破' },
        { date: '2023-02-18', type: 'military', title: '联合巡航' },
        { date: '2023-03-08', type: 'policy', title: '教育改革' },
        { date: '2023-04-22', type: 'economic', title: '数字经济' },
        { date: '2023-05-15', type: 'diplomatic', title: '文化交流' },
        { date: '2023-06-28', type: 'security', title: '边防建设' },
        { date: '2023-07-10', type: 'tech', title: '新能源' },
        { date: '2023-08-20', type: 'military', title: '战略部署' },
        { date: '2023-09-05', type: 'policy', title: '农业政策' },
        { date: '2023-10-18', type: 'economic', title: '基建投资' },
        { date: '2023-11-25', type: 'diplomatic', title: '和平谈判' },
        { date: '2023-12-12', type: 'security', title: '反恐演练' },
        
        // 2024年
        { date: '2024-01-08', type: 'tech', title: '太空探索' },
        { date: '2024-02-15', type: 'military', title: '装备更新' },
        { date: '2024-03-22', type: 'policy', title: '社保改革' },
        { date: '2024-04-10', type: 'economic', title: '绿色发展' },
        { date: '2024-05-18', type: 'diplomatic', title: '区域合作' },
        { date: '2024-06-25', type: 'security', title: '应急演练' },
        { date: '2024-07-12', type: 'tech', title: '生物科技' },
        { date: '2024-08-28', type: 'military', title: '新年演习' },
        { date: '2024-09-15', type: 'policy', title: '数字政务' },
        { date: '2024-10-22', type: 'economic', title: '碳中和' },
        { date: '2024-11-08', type: 'diplomatic', title: '友好条约' },
        { date: '2024-12-18', type: 'security', title: '网络防御' },
        
        // 2025年
        { date: '2025-01-10', type: 'tech', title: '机器人' },
        { date: '2025-02-20', type: 'military', title: '海军节' },
        { date: '2025-03-15', type: 'policy', title: '住房政策' },
        { date: '2025-04-25', type: 'economic', title: '智能制造' },
        { date: '2025-05-12', type: 'diplomatic', title: '联合国会议' },
        { date: '2025-06-28', type: 'security', title: '灾害应对' },
        { date: '2025-07-18', type: 'tech', title: '元宇宙' },
        { date: '2025-08-08', type: 'military', title: '战略演习' },
        { date: '2025-09-22', type: 'policy', title: '新年政策' },
        { date: '2025-10-15', type: 'economic', title: '金融创新' },
        { date: '2025-11-28', type: 'diplomatic', title: '峰会外交' },
        { date: '2025-12-10', type: 'security', title: '年终安保' },
        
        // 2026年
        { date: '2026-01-05', type: 'tech', title: '科技展望' },
        { date: '2026-01-18', type: 'military', title: '开年部署' },
        { date: '2026-02-10', type: 'policy', title: '规划发布' },
        { date: '2026-03-20', type: 'economic', title: '经济论坛' }
      ]
    };
  },
  computed: {
    displayYears() {
      const start = new Date(this.startDate).getFullYear();
      const end = new Date(this.endDate).getFullYear();
      const years = [];
      for (let y = start; y <= end; y++) {
        years.push(y);
      }
      return years;
    }
  },
  methods: {
    toggleExpand() {
      this.isExpanded = !this.isExpanded;
    },
    
    getYearEvents(year) {
      const events = this.timelineEvents
        .filter(e => {
          const eventYear = new Date(e.date).getFullYear();
          const matchYear = eventYear === year;
          const matchCategory = this.selectedCategory === 'all' || e.type === this.selectedCategory;
          return matchYear && matchCategory;
        })
        .map(e => {
          const category = this.eventCategories.find(c => c.id === e.type);
          const categoryIndex = this.eventCategories.findIndex(c => c.id === e.type);
          return {
            ...e,
            color: category ? category.color : '#999',
            categoryIndex: categoryIndex >= 0 ? categoryIndex : 999
          };
        });
      
      // 按类型分组排序：同类型放一起，按 eventCategories 顺序排列
      return events.sort((a, b) => {
        if (a.categoryIndex !== b.categoryIndex) {
          return a.categoryIndex - b.categoryIndex;
        }
        return new Date(a.date) - new Date(b.date);
      });
    },
    
    onEventClick(event) {
      this.$emit('event-click', event);
    },
    
    filterByCategory(catId) {
      this.selectedCategory = this.selectedCategory === catId ? 'all' : catId;
    },
    
    applyFilter() {
      this.$emit('filter-apply', {
        category: this.selectedCategory,
        startDate: this.startDate,
        endDate: this.endDate
      });
    },
    
    filterSelected() {
      this.$emit('filter-selected');
    },
    
    resetFilter() {
      this.selectedCategory = 'all';
      this.startDate = '2020-01-01';
      this.endDate = '2026-12-31';
    },
    
    confirmFilter() {
      this.$emit('filter-confirm', {
        category: this.selectedCategory,
        startDate: this.startDate,
        endDate: this.endDate
      });
    },
    
    showRelated() {
      this.$emit('show-related');
    },
    
    // 外部调用方法
    setEvents(events) {
      this.timelineEvents = events;
    },
    
    addEvent(event) {
      this.timelineEvents.push(event);
    },
    
    clearEvents() {
      this.timelineEvents = [];
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
  background: rgba(15, 23, 42, 0.95);
  border-top: 1px solid rgba(100, 150, 255, 0.3);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 20px;
  background: rgba(30, 41, 59, 0.9);
  cursor: pointer;
  user-select: none;
  border-bottom: 1px solid rgba(100, 150, 255, 0.2);
}

.header-title {
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 500;
}

.expand-icon {
  color: #64748b;
  font-size: 10px;
}

.timeline-content {
  padding: 12px 20px 16px;
}

.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-left, .filter-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-select, .date-input {
  padding: 5px 10px;
  background: rgba(51, 65, 85, 0.8);
  border: 1px solid rgba(100, 150, 255, 0.3);
  border-radius: 4px;
  color: #e2e8f0;
  font-size: 12px;
}

.filter-select:focus, .date-input:focus {
  outline: none;
  border-color: #2196f3;
}

.date-separator {
  color: #64748b;
  font-size: 12px;
}

.filter-btn {
  padding: 5px 12px;
  background: rgba(51, 65, 85, 0.8);
  border: 1px solid rgba(100, 150, 255, 0.3);
  border-radius: 4px;
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  background: rgba(71, 85, 105, 0.9);
  color: #e2e8f0;
}

.filter-btn.secondary {
  background: transparent;
}

.filter-btn.primary {
  background: rgba(33, 150, 243, 0.8);
  border-color: #2196f3;
  color: #fff;
}

.filter-btn.highlight {
  background: rgba(33, 150, 243, 0.6);
  border-color: #2196f3;
  color: #fff;
}

.country-title {
  text-align: center;
  color: #e2e8f0;
  font-size: 14px;
  margin-bottom: 15px;
}

/* 时间轴区域 */
.timeline-area {
  position: relative;
  overflow-x: auto;
  padding-bottom: 10px;
}

.timeline-area::-webkit-scrollbar {
  height: 6px;
}

.timeline-area::-webkit-scrollbar-track {
  background: rgba(51, 65, 85, 0.4);
  border-radius: 3px;
}

.timeline-area::-webkit-scrollbar-thumb {
  background: rgba(100, 150, 255, 0.4);
  border-radius: 3px;
}

.timeline-scroll {
  position: relative;
  min-width: max-content;
  padding-bottom: 20px;
}

/* 年份列容器 */
.year-columns {
  display: flex;
  gap: 100px;
  padding: 0 40px;
  position: relative;
  z-index: 2;
}

.year-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
}

/* 事件棋盘格 */
.event-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding: 12px;
  background: rgba(30, 41, 59, 0.6);
  border-radius: 8px;
  min-height: 100px;
  min-width: 100px;
  align-content: start;
  margin-bottom: 12px;
  border: 1px solid rgba(100, 150, 255, 0.15);
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

/* 时间轴节点 */
.year-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 3;
}

.node-line {
  width: 2px;
  height: 15px;
  background: rgba(100, 150, 255, 0.5);
}

.node-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #4fc3f7;
  border: 2px solid rgba(15, 23, 42, 0.9);
  box-shadow: 0 0 6px rgba(79, 195, 247, 0.5);
}

/* 年份标签 */
.year-label {
  margin-top: 8px;
  color: #94a3b8;
  font-size: 12px;
  font-weight: 500;
}

/* 时间轴线 */
.timeline-axis {
  position: absolute;
  bottom: 32px;
  left: 40px;
  right: 40px;
  height: 3px;
  background: linear-gradient(90deg, 
    rgba(100, 150, 255, 0.2), 
    rgba(100, 150, 255, 0.5) 10%, 
    rgba(100, 150, 255, 0.5) 90%, 
    rgba(100, 150, 255, 0.2)
  );
  border-radius: 2px;
  z-index: 1;
}

/* 图例 */
.legend-bar {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 15px;
  padding-top: 12px;
  border-top: 1px solid rgba(100, 150, 255, 0.15);
  flex-wrap: wrap;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
  opacity: 0.6;
}

.legend-item.active {
  opacity: 1;
}

.legend-item:hover {
  background: rgba(51, 65, 85, 0.5);
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-text {
  color: #94a3b8;
  font-size: 11px;
}

.legend-item.active .legend-text {
  color: #e2e8f0;
}
</style>

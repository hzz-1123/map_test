<template>
  <div class="country-detail-wrapper" v-if="visible">
    <!-- 收起/展开箭头 -->
    <div class="collapse-toggle" @click="collapsed = !collapsed">
      <span class="arrow">{{ collapsed ? '◀' : '▶' }}</span>
    </div>
    
    <!-- 右侧竖式分类标签 -->
    <div class="category-tabs">
      <div 
        v-for="tab in categoryTabs" 
        :key="tab.id"
        :class="['tab-item', { active: activeCategory === tab.id }]"
        @click="activeCategory = tab.id; collapsed = false"
      >
        <span class="tab-text">{{ tab.name }}</span>
      </div>
    </div>

    <!-- 左侧详细内容面板 -->
    <div class="detail-panel" :class="{ collapsed: collapsed }">
      <div class="panel-header">
        <span class="panel-title">国家情况</span>
        <span class="panel-close" @click="$emit('close')">×</span>
      </div>

      <div class="panel-content">
        <!-- 国家简介 - 默认显示 -->
        <div class="section country-intro" v-if="activeCategory === 'country'">
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

        <!-- 最近热点事件 - 在国家简介下显示 -->
        <div class="section hot-events" v-if="activeCategory === 'country'">
          <div class="section-header">
            <span class="icon">🔥</span>
            <span>最近热点事件</span>
          </div>
          <div class="event-list">
            <div class="event-item" v-for="event in recentEvents" :key="event.id">
              <div class="event-content">
                <div class="event-title">{{ event.title }}</div>
                <div class="event-date">{{ event.date }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 军事 -->
        <div v-if="activeCategory === 'military'" class="section">
          <div class="section-header">
            <span class="icon">⚔️</span>
            <span>军事情况</span>
          </div>
          <div class="chart-group">
            <div class="chart-item">
              <div class="chart-title">军事事件数量变化</div>
              <div class="chart-placeholder bar-chart">
                <div class="bar" v-for="(v, i) in militaryData.events" :key="i" :style="{ height: v + '%' }"></div>
              </div>
            </div>
            <div class="chart-item">
              <div class="chart-title">军费支出占GDP比例</div>
              <div class="chart-placeholder line-chart">
                <svg viewBox="0 0 200 60">
                  <polyline :points="militaryData.gdpLine" fill="none" stroke="#4fc3f7" stroke-width="2"/>
                </svg>
              </div>
            </div>
            <div class="chart-item">
              <div class="chart-title">兵力结构</div>
              <div class="pie-chart"></div>
            </div>
          </div>
        </div>

        <!-- 政策 -->
        <div v-if="activeCategory === 'policy'" class="section">
          <div class="section-header">
            <span class="icon">📋</span>
            <span>政策情况</span>
          </div>
          <div class="chart-group">
            <div class="chart-item">
              <div class="chart-title">政策事件数量变化</div>
              <div class="chart-placeholder bar-chart">
                <div class="bar blue" v-for="(v, i) in policyData.events" :key="i" :style="{ height: v + '%' }"></div>
              </div>
            </div>
            <div class="chart-item">
              <div class="chart-title">政策类型分布</div>
              <div class="chart-placeholder bar-chart horizontal">
                <div class="h-bar" v-for="(item, i) in policyData.types" :key="i">
                  <span class="h-bar-label">{{ item.name }}</span>
                  <div class="h-bar-fill" :style="{ width: item.value + '%' }"></div>
                </div>
              </div>
            </div>
            <div class="chart-item">
              <div class="chart-title">最新政策</div>
              <div class="policy-list">
                <div class="policy-item" v-for="(p, i) in policyData.latest" :key="i">
                  <span class="policy-date">{{ p.date }}</span>
                  <span class="policy-title">{{ p.title }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 外交 -->
        <div v-if="activeCategory === 'diplomatic'" class="section">
          <div class="section-header">
            <span class="icon">🤝</span>
            <span>外交情况</span>
          </div>
          <div class="chart-group">
            <div class="chart-item">
              <div class="chart-title">外交事件数量变化</div>
              <div class="chart-placeholder bar-chart">
                <div class="bar green" v-for="(v, i) in diplomaticData.events" :key="i" :style="{ height: v + '%' }"></div>
              </div>
            </div>
            <div class="chart-item">
              <div class="chart-title">合作类型分布</div>
              <div class="pie-chart small"></div>
            </div>
            <div class="chart-item">
              <div class="chart-title">贸易金额对比</div>
              <div class="chart-placeholder bar-chart">
                <div class="bar orange" v-for="(v, i) in diplomaticData.trade" :key="i" :style="{ height: v + '%' }"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- 安全 -->
        <div v-if="activeCategory === 'security'" class="section">
          <div class="section-header">
            <span class="icon">🛡️</span>
            <span>安全情况</span>
          </div>
          <div class="chart-group">
            <div class="chart-item">
              <div class="chart-title">安全事件数量变化</div>
              <div class="chart-placeholder bar-chart">
                <div class="bar red" v-for="(v, i) in securityData.events" :key="i" :style="{ height: v + '%' }"></div>
              </div>
            </div>
            <div class="chart-item">
              <div class="chart-title">安全威胁类型</div>
              <div class="bubble-chart">
                <div class="bubble" v-for="(b, i) in securityData.threats" :key="i"
                  :style="{ width: b.size + 'px', height: b.size + 'px', background: b.color }">
                  {{ b.name }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 经济 -->
        <div v-if="activeCategory === 'economic'" class="section">
          <div class="section-header">
            <span class="icon">💰</span>
            <span>经济情况</span>
          </div>
          <div class="chart-group">
            <div class="chart-item">
              <div class="chart-title">经济事件数量变化</div>
              <div class="chart-placeholder bar-chart">
                <div class="bar orange" v-for="(v, i) in economicData.events" :key="i" :style="{ height: v + '%' }"></div>
              </div>
            </div>
            <div class="chart-item">
              <div class="chart-title">人均GDP变化</div>
              <div class="chart-placeholder line-chart">
                <svg viewBox="0 0 200 60">
                  <polyline :points="economicData.gdpLine" fill="none" stroke="#66bb6a" stroke-width="2"/>
                </svg>
              </div>
            </div>
            <div class="chart-item">
              <div class="chart-title">资源储量</div>
              <div class="chart-placeholder bar-chart horizontal">
                <div class="h-bar" v-for="(item, i) in economicData.resources" :key="i">
                  <span class="h-bar-label">{{ item.name }}</span>
                  <div class="h-bar-fill orange" :style="{ width: item.value + '%' }"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 科技 -->
        <div v-if="activeCategory === 'tech'" class="section">
          <div class="section-header">
            <span class="icon">🔬</span>
            <span>科技情况</span>
          </div>
          <div class="chart-group">
            <div class="chart-item">
              <div class="chart-title">科技事件数量变化</div>
              <div class="chart-placeholder bar-chart">
                <div class="bar cyan" v-for="(v, i) in techData.events" :key="i" :style="{ height: v + '%' }"></div>
              </div>
            </div>
            <div class="chart-item">
              <div class="chart-title">科研论文发表数量</div>
              <div class="chart-placeholder line-chart">
                <svg viewBox="0 0 200 60">
                  <polyline :points="techData.papersLine" fill="none" stroke="#00bcd4" stroke-width="2"/>
                </svg>
              </div>
            </div>
            <div class="chart-item">
              <div class="chart-title">最新科技成果</div>
              <div class="policy-list">
                <div class="policy-item" v-for="(t, i) in techData.latest" :key="i">
                  <span class="policy-date">{{ t.date }}</span>
                  <span class="policy-title">{{ t.title }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "CountryDetailPanel",
  props: {
    visible: Boolean,
    country: Object
  },
  data() {
    return {
      collapsed: false,
      activeCategory: 'country',
      categoryTabs: [
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
    },
    militaryData() {
      return {
        events: [30, 45, 60, 40, 55, 70, 50, 65],
        gdpLine: '0,50 30,45 60,40 90,35 120,38 150,30 180,25 200,20'
      };
    },
    policyData() {
      return {
        events: [40, 55, 35, 60, 45, 70, 55, 50],
        types: [
          { name: '高层互访', value: 80 },
          { name: '联合声明', value: 60 },
          { name: '协议签署', value: 45 },
          { name: '政策调整', value: 30 }
        ],
        latest: [
          { date: '01-08', title: '发布新经济政策' },
          { date: '01-05', title: '签署双边协议' }
        ]
      };
    },
    diplomaticData() {
      return {
        events: [50, 40, 60, 55, 45, 70, 65, 55],
        trade: [80, 60, 45, 70, 55, 40, 65, 50]
      };
    },
    securityData() {
      return {
        events: [20, 35, 25, 40, 30, 45, 35, 40],
        threats: [
          { name: '恐袭', size: 50, color: '#f44336' },
          { name: '冲突', size: 40, color: '#ff9800' },
          { name: '动荡', size: 35, color: '#9c27b0' }
        ]
      };
    },
    economicData() {
      return {
        events: [45, 55, 50, 65, 60, 70, 75, 80],
        gdpLine: '0,55 30,50 60,45 90,40 120,35 150,30 180,28 200,25',
        resources: [
          { name: '石油', value: 70 },
          { name: '天然气', value: 55 },
          { name: '煤炭', value: 80 },
          { name: '铁矿', value: 45 }
        ]
      };
    },
    techData() {
      return {
        events: [35, 45, 50, 55, 60, 70, 75, 85],
        papersLine: '0,50 30,48 60,42 90,38 120,32 150,28 180,22 200,18',
        latest: [
          { date: '01-10', title: '量子计算突破' },
          { date: '01-06', title: '新能源技术发布' }
        ]
      };
    }
  }
};
</script>


<style scoped>
.country-detail-wrapper {
  position: absolute;
  top: 140px;
  right: 0;
  height: calc(100% - 585px);
  display: flex;
  z-index: 1000;
}

/* 收起/展开箭头 */
.collapse-toggle {
  position: absolute;
  left: -20px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 50px;
  background: rgba(30, 41, 59, 0.95);
  border-radius: 4px 0 0 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 1px solid rgba(100, 150, 255, 0.2);
  border-right: none;
  z-index: 10;
}

.collapse-toggle:hover {
  background: rgba(51, 65, 85, 0.95);
}

.arrow {
  color: #94a3b8;
  font-size: 10px;
}

/* 右侧竖式分类标签 */
.category-tabs {
  width: 36px;
  background: rgba(30, 58, 95, 0.95);
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(100, 150, 255, 0.2);
}

.tab-item {
  padding: 12px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-bottom: 1px solid rgba(100, 150, 255, 0.1);
  transition: all 0.2s;
}

.tab-item:hover {
  background: rgba(51, 65, 85, 0.6);
}

.tab-item.active {
  background: #2563eb;
}

.tab-text {
  writing-mode: vertical-rl;
  text-orientation: upright;
  font-size: 12px;
  color: #e2e8f0;
  letter-spacing: 2px;
}

/* 左侧详细内容面板 */
.detail-panel {
  width: 320px;
  background: rgba(15, 23, 42, 0.95);
  border-left: 1px solid rgba(100, 150, 255, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.3s ease, opacity 0.3s ease;
}

.detail-panel.collapsed {
  width: 0;
  opacity: 0;
  border-left: none;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(30, 41, 59, 0.9);
  border-bottom: 1px solid rgba(100, 150, 255, 0.2);
  flex-shrink: 0;
}

.panel-title {
  color: #e2e8f0;
  font-size: 14px;
  font-weight: 500;
}

.panel-close {
  cursor: pointer;
  color: #64748b;
  font-size: 18px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.panel-close:hover {
  background: rgba(239, 68, 68, 0.2);
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
  background: rgba(30, 41, 59, 0.5);
}

.panel-content::-webkit-scrollbar-thumb {
  background: rgba(100, 150, 255, 0.3);
  border-radius: 3px;
}

.section {
  margin-bottom: 16px;
  background: rgba(30, 41, 59, 0.6);
  border-radius: 6px;
  padding: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #4fc3f7;
  font-size: 13px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(100, 150, 255, 0.15);
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
  color: #64748b;
}

.intro-item .value {
  font-size: 14px;
  color: #e2e8f0;
  font-weight: 500;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-item {
  padding-left: 12px;
  border-left: 3px solid rgba(100, 150, 255, 0.4);
}

.event-title {
  font-size: 13px;
  color: #e2e8f0;
  font-weight: 500;
}

.event-date {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}

.chart-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chart-item {
  background: rgba(30, 41, 59, 0.4);
  border-radius: 4px;
  padding: 10px;
}

.chart-title {
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 8px;
}

.chart-placeholder {
  height: 60px;
  display: flex;
  align-items: flex-end;
  gap: 4px;
}

.bar-chart .bar {
  flex: 1;
  background: #f44336;
  border-radius: 2px 2px 0 0;
  min-height: 4px;
}

.bar-chart .bar.blue { background: #2196f3; }
.bar-chart .bar.green { background: #4caf50; }
.bar-chart .bar.orange { background: #ff9800; }
.bar-chart .bar.red { background: #f44336; }
.bar-chart .bar.cyan { background: #00bcd4; }

.line-chart {
  height: 60px;
}

.line-chart svg {
  width: 100%;
  height: 100%;
}

.bar-chart.horizontal {
  flex-direction: column;
  height: auto;
  gap: 6px;
}

.h-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.h-bar-label {
  font-size: 10px;
  color: #94a3b8;
  width: 50px;
  flex-shrink: 0;
}

.h-bar-fill {
  height: 12px;
  background: #2196f3;
  border-radius: 2px;
}

.h-bar-fill.orange {
  background: #ff9800;
}

.bubble-chart {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  padding: 10px 0;
}

.bubble {
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #fff;
}

.policy-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.policy-item {
  display: flex;
  gap: 8px;
  font-size: 11px;
}

.policy-date {
  color: #64748b;
  flex-shrink: 0;
}

.policy-title {
  color: #e2e8f0;
}

.pie-chart {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: conic-gradient(#f44336 0deg 120deg, #2196f3 120deg 240deg, #4caf50 240deg 360deg);
  margin: 0 auto;
}

.pie-chart.small {
  width: 50px;
  height: 50px;
}
</style>

<template>
  <div class="situation-panel">
    <!-- 图层切换 -->
    <div class="layer-switch">
      <button 
        :class="['layer-btn', { active: currentLayer === 'event' }]"
        @click="switchLayer('event')"
      >
        事件发生频次
      </button>
      <button 
        :class="['layer-btn', { active: currentLayer === 'security' }]"
        @click="switchLayer('security')"
      >
        国家安全等级
      </button>
    </div>

    <!-- 安全等级图例 -->
    <div class="legend" v-if="currentLayer === 'security'">
      <div class="legend-title">安全等级</div>
      <div class="legend-items">
        <div class="legend-item">
          <span class="legend-color" style="background: #b71c1c"></span>
          <span>威胁 +3</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #e53935"></span>
          <span>威胁 +2</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #ff8a80"></span>
          <span>威胁 +1</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #9e9e9e"></span>
          <span>无关 0</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #81c784"></span>
          <span>友好 -1</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #4caf50"></span>
          <span>友好 -2</span>
        </div>
        <div class="legend-item">
          <span class="legend-color" style="background: #1b5e20"></span>
          <span>友好 -3</span>
        </div>
      </div>
    </div>

    <!-- 事件频次图例 -->
    <div class="legend" v-if="currentLayer === 'event'">
      <div class="legend-title">事件频次</div>
      <div class="legend-gradient">
        <div class="gradient-bar"></div>
        <div class="gradient-labels">
          <span>低</span>
          <span>高</span>
        </div>
      </div>
    </div>

    <!-- 添加点数据 -->
    <div class="add-point-section">
      <div class="section-title">添加标记点</div>
      <div class="point-types">
        <div 
          v-for="type in pointTypes" 
          :key="type.id"
          :class="['point-type', { active: selectedPointType === type.id }]"
          @click="selectPointType(type.id)"
        >
          <span class="point-icon" :style="{ background: type.color }"></span>
          <span>{{ type.name }}</span>
        </div>
      </div>
      <div class="add-hint" v-if="selectedPointType">
        点击地图添加 {{ getPointTypeName(selectedPointType) }} 标记
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "SituationPanel",
  props: {
    visible: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      currentLayer: 'security',
      selectedPointType: null,
      pointTypes: [
        { id: 'military', name: '军事基地', color: '#f44336' },
        { id: 'political', name: '政治事件', color: '#2196f3' },
        { id: 'economic', name: '经济热点', color: '#ff9800' },
        { id: 'security', name: '安全事件', color: '#9c27b0' },
        { id: 'diplomatic', name: '外交活动', color: '#4caf50' },
        { id: 'tech', name: '科技动态', color: '#00bcd4' }
      ]
    };
  },
  methods: {
    switchLayer(layer) {
      this.currentLayer = layer;
      this.$emit('layer-change', layer);
    },
    selectPointType(typeId) {
      this.selectedPointType = this.selectedPointType === typeId ? null : typeId;
      this.$emit('point-type-select', this.selectedPointType);
    },
    getPointTypeName(typeId) {
      const type = this.pointTypes.find(t => t.id === typeId);
      return type ? type.name : '';
    }
  }
};
</script>

<style scoped>
.situation-panel {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 998;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.layer-switch {
  display: flex;
  gap: 8px;
}

.layer-btn {
  padding: 8px 16px;
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(100, 150, 255, 0.3);
  border-radius: 4px;
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.layer-btn:hover {
  background: rgba(51, 65, 85, 0.9);
}

.layer-btn.active {
  background: rgba(33, 150, 243, 0.8);
  color: #fff;
  border-color: #2196f3;
}

.legend {
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(100, 150, 255, 0.3);
  border-radius: 4px;
  padding: 12px;
  min-width: 140px;
}

.legend-title {
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(100, 150, 255, 0.2);
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #94a3b8;
}

.legend-color {
  width: 20px;
  height: 12px;
  border-radius: 2px;
}

.legend-gradient .gradient-bar {
  height: 12px;
  border-radius: 2px;
  background: linear-gradient(to right, #fff3e0, #ff9800, #e65100);
}

.legend-gradient .gradient-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
  font-size: 11px;
  color: #94a3b8;
}

.add-point-section {
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(100, 150, 255, 0.3);
  border-radius: 4px;
  padding: 12px;
}

.section-title {
  color: #e2e8f0;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid rgba(100, 150, 255, 0.2);
}

.point-types {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.point-type {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  color: #94a3b8;
  transition: all 0.2s;
}

.point-type:hover {
  background: rgba(51, 65, 85, 0.6);
}

.point-type.active {
  background: rgba(33, 150, 243, 0.3);
  color: #fff;
}

.point-icon {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.add-hint {
  margin-top: 10px;
  padding: 8px;
  background: rgba(33, 150, 243, 0.2);
  border-radius: 4px;
  font-size: 11px;
  color: #64b5f6;
  text-align: center;
}
</style>

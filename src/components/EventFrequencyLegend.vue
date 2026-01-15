<template>
  <div class="frequency-legend">
    <div class="legend-title">事件发生频次</div>
    <div class="legend-items">
      <div class="legend-item" v-for="item in legendItems" :key="item.label">
        <span class="legend-dot" :style="{ backgroundColor: item.color }"></span>
        <span class="legend-label">{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'EventFrequencyLegend',
  data() {
    return {
      legendItems: [
        { color: '#871a1a', label: '>500次（极高）' },
        { color: '#FF9933', label: '201-500次（高）' },
        { color: '#FFCC80', label: '51-200次（中）' },
        { color: '#FFE6B3', label: '11-50次（低）' },
        { color: '#FFF9E6', label: '0-10次（极低）' }
      ]
    };
  }
};
</script>

<style scoped>
.frequency-legend {
  position: absolute;
  right: 10px;
  bottom: 250px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 4px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 996;
  min-width: 120px;
}

.legend-title {
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
  text-align: center;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.legend-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  font-size: 12px;
  color: #555;
}
</style>

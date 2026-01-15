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
        { color: '#67000d', label: '>400次' },
        { color: '#a50f15', label: '31-400次' },
        { color: '#cb181d', label: '21-300次' },
        { color: '#ef3b2c', label: '11-200次' },
        { color: '#fb6a4a', label: '6-100次' },
        { color: '#fc9272', label: '1-5次' },
        { color: '#fee0d2', label: '0次' }
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

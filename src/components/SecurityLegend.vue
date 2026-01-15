<template>
  <div class="security-legend">
    <div class="legend-title">国家安全等级</div>
    <div class="legend-items">
      <div class="legend-item" v-for="item in legendItems" :key="item.level">
        <span class="legend-dot" :style="{ backgroundColor: item.color }"></span>
        <span class="legend-label">{{ item.label }} ({{ item.level >= 0 ? '+' : '' }}{{ item.level }})</span>
      </div>
    </div>
  </div>
</template>

<script>
import { securityColors } from '@/data/securityLevels';

export default {
  name: 'SecurityLegend',
  data() {
    return {
      legendItems: [
        { level: 3, label: '极度危险', color: securityColors[3] },
        { level: 2, label: '很危险', color: securityColors[2] },
        { level: 1, label: '较危险', color: securityColors[1] },
        { level: 0, label: '中性', color: securityColors[0] },
        { level: -1, label: '较安全', color: securityColors['-1'] },
        { level: -2, label: '很安全', color: securityColors['-2'] },
        { level: -3, label: '非常安全', color: securityColors['-3'] }
      ]
    };
  }
};
</script>

<style scoped>
.security-legend {
  position: absolute;
  right: 20px;
  bottom: 60px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  z-index: 996;
  min-width: 140px;
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
  gap: 8px;
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
  font-size: 13px;
  color: #555;
}
</style>

<template>
  <aside :class="['left-drawer', { open: drawerOpen }]">
    <div class="drawer-collapsed" v-if="!drawerOpen" @click="drawerOpen = true">
      <span class="collapse-icon">›</span>
    </div>
    <div class="drawer-content" v-else>
      <button 
        v-for="tool in tools" 
        :key="tool.id"
        :class="['tool-btn', { active: activeTool === tool.id }]"
        @click="selectTool(tool.id)"
      >
        {{ tool.label }}
      </button>
      <button class="tool-btn collapse-btn" @click="drawerOpen = false">‹</button>
    </div>
  </aside>
</template>

<script>
export default {
  name: "LeftDrawer",
  data() {
    return {
      drawerOpen: false,
      activeTool: 'country',
      tools: [
        { id: 'country', label: '国家' },
        { id: 'person', label: '人物' },
        { id: 'facility', label: '设施' },
        { id: 'org', label: '机构' },
        { id: 'event', label: '事件' }
      ]
    };
  },
  methods: {
    selectTool(id) {
      this.activeTool = id;
      this.$emit('select', id);
    }
  },
  watch: {
    drawerOpen(val) {
      this.$emit('toggle', !val);
    }
  }
};
</script>

<style scoped>
.left-drawer {
  position: absolute;
  left: 0;
  z-index: 999;
  display: flex;
  align-items: stretch;
  height: 400px;
  transition: top 0.3s ease, height 0.3s ease;
}

.left-drawer-wrapper.collapsed {
  top: 50%;
  transform: translateY(-50%);
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

.left-drawer:not(.open) {
  width: 32px;
}

.left-drawer.open {
  width: 70px;
}

.drawer-collapsed {
  width: 32px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
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
  flex-direction: column;
  width: 70px;
}

.tool-btn {
  width: 70px;
  padding: 18px 0;
  background: #3d4a5c;
  border: none;
  border-bottom: 1px solid #4a5a6e;
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
</style>

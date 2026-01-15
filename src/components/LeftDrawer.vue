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
  top: 80px;
  background: #3d4a5c;
  z-index: 1000;
  transition: width 0.3s ease;
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
  color: #fff;
  font-size: 16px;
}

.drawer-collapsed:hover {
  background: #4a5a6e;
}

.drawer-content {
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
  font-size: 14px;
  color: #b0b8c4;
  text-align: center;
  transition: all 0.2s;
}

.tool-btn:hover {
  background: #4a5a6e;
  color: #fff;
}

.tool-btn.active {
  background: #1890ff;
  color: #fff;
}

.collapse-btn {
  font-size: 16px;
  padding: 12px 0;
}
</style>

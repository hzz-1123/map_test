<template>
  <aside :class="['right-drawer', { open: drawerOpen }]">
    <div class="drawer-collapsed-right" v-if="!drawerOpen" @click="drawerOpen = true">
      <span class="collapse-icon">‹</span>
    </div>
    <div class="drawer-content-right" v-else>
      <button 
        v-for="item in rightTools" 
        :key="item.id"
        :class="['tool-btn-right', { active: activeTool === item.id }]"
        @click="selectTool(item.id)"
      >
        {{ item.label }}
      </button>
      <button class="tool-btn-right collapse-btn-right" @click="drawerOpen = false">›</button>
    </div>
  </aside>
</template>

<script>
export default {
  name: "RightDrawer",
  data() {
    return {
      drawerOpen: false,
      activeTool: 'country',
      rightTools: [
        { id: 'country', label: '国家' },
        { id: 'military', label: '军事' },
        { id: 'policy', label: '政策' },
        { id: 'diplomacy', label: '外交' },
        { id: 'security', label: '安全' },
        { id: 'economy', label: '经济' },
        { id: 'tech', label: '科技' }
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
.right-drawer {
  position: absolute;
  right: 0;
  top: 50px;
  background: #3d4a5c;
  z-index: 1000;
  transition: width 0.3s ease;
}

.right-drawer:not(.open) {
  width: 32px;
}

.right-drawer.open {
  width: 70px;
}

.drawer-collapsed-right {
  width: 32px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  font-size: 16px;
}

.drawer-collapsed-right:hover {
  background: #4a5a6e;
}

.drawer-content-right {
  display: flex;
  flex-direction: column;
  width: 70px;
}

.tool-btn-right {
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

.tool-btn-right:hover {
  background: #4a5a6e;
  color: #fff;
}

.tool-btn-right.active {
  background: #1890ff;
  color: #fff;
}

.collapse-btn-right {
  font-size: 16px;
  padding: 12px 0;
}
</style>

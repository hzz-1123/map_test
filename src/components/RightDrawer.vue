<template>
  <div :class="['right-drawer-wrapper', { collapsed: isCollapsed }]">
    <!-- 伸缩按钮（固定位置） -->
    <div class="toggle-btn" @click="toggleDrawer">
      <span class="toggle-arrow">{{ isCollapsed ? '‹' : '›' }}</span>
    </div>
    
    <!-- 抽屉内容 -->
    <div :class="['drawer-content', { collapsed: isCollapsed }]">
      <div class="drawer-menu">
        <div 
          v-for="item in menuItems" 
          :key="item.id"
          :class="['menu-item', { active: activeItem === item.id }]"
          @click="selectItem(item.id)"
        >
          <span class="menu-text">{{ item.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "RightDrawer",
  data() {
    return {
      isCollapsed: false,
      activeItem: 'country',
      menuItems: [
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
  methods: {
    toggleDrawer() {
      this.isCollapsed = !this.isCollapsed;
      this.$emit('toggle', this.isCollapsed);
    },
    selectItem(id) {
      this.activeItem = id;
      this.$emit('select', id);
    }
  }
};
</script>

<style scoped>
.right-drawer-wrapper {
  position: absolute;
  top: 150px;
  right: 0;
  z-index: 999;
  display: flex;
  align-items: stretch;
  height: 560px;
  transition: transform 0.3s ease, height 0.3s ease, top 0.3s ease;
}

.right-drawer-wrapper.collapsed {
  top: calc(50% - 30px);
  height: 60px;
}

/* 抽屉内容 */
.drawer-content {
  width: 80px;
  height: 100%;
  background: linear-gradient(to left, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.7));
  backdrop-filter: blur(10px);
  border: 1px solid rgba(200, 200, 200, 0.3);
  border-right: none;
  border-radius: 0;
  overflow: hidden;
  transition: width 0.3s ease;
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
}

.drawer-content.collapsed {
  width: 0;
  border-width: 0;
}

.drawer-menu {
  width: 80px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
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
  background: linear-gradient(to left, rgba(59, 130, 246, 0.25), rgba(59, 130, 246, 0.1));
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
  background: linear-gradient(to left, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.7));
  backdrop-filter: blur(10px);
  border: 1px solid rgba(200, 200, 200, 0.3);
  border-right: none;
  border-radius: 6px 0 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.08);
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

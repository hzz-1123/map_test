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
  transition: height 0.3s ease;
}

.right-drawer-wrapper.collapsed {
  height: 60px;
}

/* 抽屉内容 */
.drawer-content {
  width: 80px;
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid rgba(100, 150, 255, 0.2);
  border-right: none;
  border-radius: 0;
  overflow: hidden;
  transition: width 0.3s ease;
}

.drawer-content.collapsed {
  width: 0;
  border-width: 0;
}

.drawer-menu {
  width: 80px;
  display: flex;
  flex-direction: column;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  cursor: pointer;
  border-bottom: 1px solid rgba(100, 150, 255, 0.15);
  transition: background 0.2s;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:hover {
  background: rgba(51, 65, 85, 0.6);
}

.menu-item.active {
  background: rgba(33, 150, 243, 0.3);
}

.menu-text {
  color: #e2e8f0;
  font-size: 18px;
  writing-mode: vertical-rl;
  letter-spacing: 8px;
  white-space: nowrap;
}

.menu-item.active .menu-text {
  color: #ffffff;
}

/* 伸缩按钮 */
.toggle-btn {
  width: 20px;
  background: rgba(30, 41, 59, 0.95);
  border: 1px solid rgba(100, 150, 255, 0.2);
  border-right: none;
  border-radius: 6px 0 0 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
}

.toggle-btn:hover {
  background: rgba(51, 65, 85, 0.95);
}

.toggle-arrow {
  color: #94a3b8;
  font-size: 18px;
  font-weight: bold;
}

.toggle-btn:hover .toggle-arrow {
  color: #e2e8f0;
}
</style>

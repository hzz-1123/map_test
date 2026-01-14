import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const cesiumSource = 'node_modules/mars3d-cesium/Build/Cesium';

export default defineConfig({
  plugins: [
    vue(),
    viteStaticCopy({
      targets: [
        { src: `${cesiumSource}/Workers`, dest: 'cesium' },
        { src: `${cesiumSource}/Assets`, dest: 'cesium' },
        { src: `${cesiumSource}/ThirdParty`, dest: 'cesium' },
        { src: `${cesiumSource}/Widgets`, dest: 'cesium' }
      ]
    })
  ],
  define: {
    CESIUM_BASE_URL: JSON.stringify('/cesium')
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  optimizeDeps: {
    include: ['mars3d']
  }
});

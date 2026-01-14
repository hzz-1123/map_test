<template>
  <div id="app">
    <Mars3dMap />
  </div>
</template>

<script>
import Mars3dMap from './components/Mars3dMap.vue';

export default {
  name: 'App',
  components: {
    Mars3dMap
  }
};
</script>

<style>
html, body, #app {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>

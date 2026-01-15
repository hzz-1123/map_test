<template>
  <div id="app">
    <AMapComponent />
  </div>
</template>

<script>
import AMapComponent from './components/AMapComponent.vue';

export default {
  name: 'App',
  components: {
    AMapComponent
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

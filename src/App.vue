<template>
    <div id="app">
        <leafletMap />
    </div>
</template>

<script>
import leafletMap from "./components/leafletMap.vue";

export default {
    name: "App",
    components: {
        leafletMap,
    },
};
</script>

<style>
html,
body,
#app {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
}
</style>

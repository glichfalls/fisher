<script setup>
import RodCursor from './components/RodCursor.vue'
import FishingPoll from './components/FishingPoll.vue'
import FishSchool from './components/FishSchool.vue'
import Kraken from './components/Kraken.vue'
import LiveCursors from './components/LiveCursors.vue'
</script>

<template>
  <div class="stage">
    <FishingPoll />
    <FishSchool />
    <Kraken />
    <LiveCursors />
    <RodCursor />
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  min-height: 100%;
}
</style>

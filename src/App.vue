<script setup>
import RodCursor from './components/RodCursor.vue'
import FishingPoll from './components/FishingPoll.vue'
import FishSchool from './components/FishSchool.vue'
</script>

<template>
  <div class="stage">
    <FishingPoll />
    <FishSchool />
    <RodCursor />
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  min-height: 100%;
}
</style>

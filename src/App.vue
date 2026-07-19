<script setup>
import RodCursor from './components/RodCursor.vue'
import FishingPoll from './components/FishingPoll.vue'
</script>

<template>
  <div class="stage">
    <FishingPoll />
    <RodCursor />
  </div>
</template>

<style scoped>
.stage {
  position: relative;
  min-height: 100%;
}
</style>

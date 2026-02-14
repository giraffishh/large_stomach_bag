<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <div class="app-container">
      <Transition
        :name="route.meta.transition as string || 'fade'"
      >
        <component :is="Component" :key="route.path" class="app-page" />
      </Transition>
    </div>
  </RouterView>
</template>

<style>
/* 使用 Grid 让进出的页面重叠在同一个位置，避免布局跳动 */
.app-container {
  display: grid;
  grid-template-areas: 'stack';
  min-height: 100vh;
  width: 100%;
}

.app-page {
  grid-area: stack;
  width: 100%;
  min-height: 100vh;
}

/* 淡入淡出过渡（默认） */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 封面 → 主页：淡出 + 上滑效果 */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}
.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.slide-up-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* 尊重用户的减弱动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active,
  .slide-up-enter-active,
  .slide-up-leave-active {
    transition: none;
  }
}
</style>

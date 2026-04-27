<script setup lang="ts">
import { RouterView } from 'vue-router'
import type { RouteLocationNormalizedLoaded } from 'vue-router'

const getRouteTransition = (route: RouteLocationNormalizedLoaded) => {
  const transition = route.meta.resolvedTransition || route.meta.transition
  return typeof transition === 'string' ? transition : 'fade'
}

const usesRouteTransitionCss = (route: RouteLocationNormalizedLoaded) => {
  return getRouteTransition(route) !== 'none'
}
</script>

<template>
  <RouterView v-slot="{ Component, route }">
    <div class="app-container">
      <Transition
        :name="getRouteTransition(route)"
        :css="usesRouteTransitionCss(route)"
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
  background: #f5f5f4;
  overflow-x: clip;
}

.dark .app-container {
  background: #09090b;
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

/* 封面 → 主页：吃掉手势惯性后的主入口过渡 */
.cover-to-home-enter-active,
.cover-to-home-leave-active {
  transition:
    opacity 520ms ease,
    transform 620ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity, transform;
}

.cover-to-home-enter-active {
  transition-delay: 70ms;
}

.cover-to-home-enter-from {
  opacity: 0;
  transform: translate3d(0, 28px, 0) scale(0.985);
}

.cover-to-home-leave-to {
  opacity: 0;
  transform: translate3d(0, -34px, 0) scale(0.99);
}

/* 主页 <-> 详情页：轻量横向过渡，避免详情页返回时闪动 */
.detail-forward-enter-active,
.detail-forward-leave-active,
.detail-back-enter-active,
.detail-back-leave-active {
  transition:
    opacity 220ms ease,
    transform 320ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity, transform;
}

.detail-forward-enter-from {
  opacity: 0;
  transform: translate3d(18px, 0, 0);
}

.detail-forward-leave-to {
  opacity: 0;
  transform: translate3d(-10px, 0, 0);
}

.detail-back-enter-from {
  opacity: 0;
  transform: translate3d(-10px, 0, 0);
}

.detail-back-leave-to {
  opacity: 0;
  transform: translate3d(18px, 0, 0);
}

/* 尊重用户的减弱动画偏好 */
@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active,
  .slide-up-enter-active,
  .slide-up-leave-active,
  .cover-to-home-enter-active,
  .cover-to-home-leave-active,
  .detail-forward-enter-active,
  .detail-forward-leave-active,
  .detail-back-enter-active,
  .detail-back-leave-active {
    transition: none;
  }
}
</style>

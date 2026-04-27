<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import CoverPage from '@/components/CoverPage.vue'

const router = useRouter()
const route = useRoute()

// 防止重复导航
const isNavigating = ref(false)
let homePreloadTimer: ReturnType<typeof setTimeout> | null = null
let touchStartY = 0
let touchStartX = 0

const lockScrollDuringNavigation = () => {
  document.documentElement.classList.add('cover-route-lock')
  window.scrollTo(0, 0)

  window.setTimeout(() => {
    window.scrollTo(0, 0)
    document.documentElement.classList.remove('cover-route-lock')
  }, 720)
}

const navigateToHome = () => {
  if (isNavigating.value) return
  isNavigating.value = true
  lockScrollDuringNavigation()

  // 标记用户已访问过封面
  sessionStorage.setItem('hasVisitedCover', 'true')

  // 如果有重定向目标则跳转，否则去主页
  const redirect = route.query.redirect as string
  router.replace(redirect || '/home')
}

// --- 滚轮事件：向下滚动触发导航 ---
const handleWheel = (e: WheelEvent) => {
  // deltaY > 0 表示向下滚动
  if (e.deltaY > 30) {
    e.preventDefault()
    navigateToHome()
  }
}

// --- 触摸事件：向上滑动触发导航 ---
const handleTouchStart = (e: TouchEvent) => {
  if (e.touches[0]) {
    touchStartY = e.touches[0].clientY
    touchStartX = e.touches[0].clientX
  }
}

const handleTouchMove = (e: TouchEvent) => {
  if (e.cancelable) {
    e.preventDefault()
  }
}

const handleTouchEnd = (e: TouchEvent) => {
  const touch = e.changedTouches[0]
  if (!touch) return
  const deltaY = touchStartY - touch.clientY
  const deltaX = Math.abs(touchStartX - touch.clientX)
  // deltaY > 50 表示用户向上滑动了足够的距离
  if (deltaY > 54 && deltaY > deltaX * 1.2) {
    navigateToHome()
  }
}

// --- 键盘事件：下箭头/空格/回车触发导航 ---
const handleKeyDown = (e: KeyboardEvent) => {
  if (['ArrowDown', 'Space', 'Enter'].includes(e.code)) {
    e.preventDefault()
    navigateToHome()
  }
}

onMounted(() => {
  window.addEventListener('wheel', handleWheel, { passive: false })
  window.addEventListener('touchstart', handleTouchStart, { passive: true })
  window.addEventListener('touchmove', handleTouchMove, { passive: false })
  window.addEventListener('touchend', handleTouchEnd, { passive: true })
  window.addEventListener('keydown', handleKeyDown)

  homePreloadTimer = setTimeout(() => {
    homePreloadTimer = null
    void import('@/views/HomeView.vue')
  }, 600)
})

onBeforeUnmount(() => {
  window.removeEventListener('wheel', handleWheel)
  window.removeEventListener('touchstart', handleTouchStart)
  window.removeEventListener('touchmove', handleTouchMove)
  window.removeEventListener('touchend', handleTouchEnd)
  window.removeEventListener('keydown', handleKeyDown)

  if (homePreloadTimer) {
    clearTimeout(homePreloadTimer)
    homePreloadTimer = null
  }
})
</script>

<template>
  <div class="cover-view">
    <CoverPage @scroll-down="navigateToHome" />
  </div>
</template>

<style scoped>
.cover-view {
  /* 防止出现滚动条 */
  position: fixed;
  inset: 0;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  overscroll-behavior: none;
  touch-action: none;
}
</style>

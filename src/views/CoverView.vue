<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import CoverPage from '@/components/CoverPage.vue'

const router = useRouter()
const route = useRoute()

// 防止重复导航
const isNavigating = ref(false)

const navigateToHome = () => {
  if (isNavigating.value) return
  isNavigating.value = true

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
let touchStartY = 0

const handleTouchStart = (e: TouchEvent) => {
  if (e.touches[0]) {
    touchStartY = e.touches[0].clientY
  }
}

const handleTouchEnd = (e: TouchEvent) => {
  const touch = e.changedTouches[0]
  if (!touch) return
  const deltaY = touchStartY - touch.clientY
  // deltaY > 50 表示用户向上滑动了足够的距离
  if (deltaY > 50) {
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
  window.addEventListener('touchend', handleTouchEnd, { passive: true })
  window.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('wheel', handleWheel)
  window.removeEventListener('touchstart', handleTouchStart)
  window.removeEventListener('touchend', handleTouchEnd)
  window.removeEventListener('keydown', handleKeyDown)
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
  height: 100vh;
  overflow: hidden;
}
</style>

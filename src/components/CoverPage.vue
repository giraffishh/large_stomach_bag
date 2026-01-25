<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'
import { ref, onMounted } from 'vue'

const isVisible = ref(false)
const emit = defineEmits<{
  scrollDown: []
}>()

onMounted(() => {
  // Trigger entrance animation after mount
  setTimeout(() => {
    isVisible.value = true
  }, 100)
})

const handleScrollDown = () => {
  emit('scrollDown')
}
</script>

<template>
  <section
    class="cover-page relative h-screen w-full flex flex-col items-center justify-center overflow-hidden snap-start snap-always"
  >
    <!-- Animated Background - Light Mode -->
    <div class="absolute inset-0 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <!-- Gradient Orbs - Light Mode: warm colors, Dark Mode: cool colors -->
      <div class="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-300/30 dark:bg-indigo-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
      <div class="absolute bottom-1/4 right-1/4 w-80 h-80 bg-rose-300/25 dark:bg-purple-500/15 rounded-full blur-3xl animate-pulse-slow animation-delay-1000"></div>
      <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-amber-200/20 dark:from-indigo-500/10 to-transparent rounded-full"></div>

      <!-- Grid Pattern Overlay -->
      <div class="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]"></div>
    </div>

    <!-- Content -->
    <div class="relative z-10 text-center px-6">
      <!-- Emoji/Icon -->
      <div
        class="text-6xl md:text-7xl mb-6 transition-all duration-1000 ease-out"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
      >
        🍜
      </div>

      <!-- Title -->
      <h1
        class="text-3xl md:text-5xl lg:text-6xl font-black mb-4 tracking-tight transition-all duration-1000 ease-out delay-150 whitespace-nowrap"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
      >
        <span class="bg-gradient-to-r from-amber-600 via-orange-500 to-rose-500 dark:from-white dark:via-zinc-200 dark:to-zinc-400 bg-clip-text text-transparent">
          我也想拥有大胃袋...
        </span>
      </h1>

      <!-- Subtitle -->
      <p
        class="text-base md:text-lg transition-all duration-1000 ease-out delay-300 whitespace-nowrap"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
      >
        <span class="bg-gradient-to-r from-orange-500 via-rose-400 to-pink-400 dark:from-zinc-300 dark:via-zinc-400 dark:to-zinc-500 bg-clip-text text-transparent">
          从夯到拉的餐厅锐评
        </span>
      </p>

      <!-- Author -->
      <p
        class="text-sm text-zinc-400 dark:text-zinc-500 mt-6 italic transition-all duration-1000 ease-out delay-500 translate-x-8 md:translate-x-20"
        :class="isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'"
      >
        —— By Giraffish
      </p>
    </div>

    <!-- Scroll Indicator -->
    <button
      @click="handleScrollDown"
      class="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer group"
      :class="isVisible ? 'opacity-100' : 'opacity-0'"
    >
      <span class="text-xs tracking-widest uppercase">向上滑动</span>
      <div class="animate-bounce">
        <ChevronDown :size="24" class="rotate-180 group-hover:scale-110 transition-transform" />
      </div>
    </button>

    <!-- Bottom Gradient Fade -->
    <div class="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-stone-100 dark:from-zinc-950 to-transparent pointer-events-none"></div>
  </section>
</template>

<style scoped>
/* Smooth entrance transitions */
.cover-page {
  will-change: transform, opacity;
}

/* Slow breathing pulse for orbs */
@keyframes pulse-slow {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1) translateY(0);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.08) translateY(-10px);
  }
}

/* Floating animation for emoji */
@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

.animate-pulse-slow {
  animation: pulse-slow 8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}

.animation-delay-1000 {
  animation-delay: 2s;
}

.bg-gradient-radial {
  background: radial-gradient(circle, var(--tw-gradient-from) 0%, var(--tw-gradient-to) 70%);
}

/* Smooth scroll snap behavior */
.snap-start {
  scroll-snap-align: start;
}

/* Add GPU acceleration for smoother animations */
.cover-page * {
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
</style>

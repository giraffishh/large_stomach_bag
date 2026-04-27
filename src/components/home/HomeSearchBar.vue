<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { List, Map, Moon, Search, Sun } from 'lucide-vue-next'
import { useDark } from '@vueuse/core'
import { useRestaurantStore } from '@/stores/restaurants'

const store = useRestaurantStore()
const { searchQuery, isMapView } = storeToRefs(store)

const isDark = useDark()

type ViewTransitionHandle = {
  finished: Promise<void>
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionHandle
}

const toggleDarkMode = (event: MouseEvent) => {
  const target = event.currentTarget as HTMLElement | null
  const nextTheme = !isDark.value
  const documentWithTransition = document as ViewTransitionDocument
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!target || !documentWithTransition.startViewTransition || prefersReducedMotion) {
    isDark.value = nextTheme
    return
  }

  const rect = target.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  )
  const root = document.documentElement

  root.style.setProperty('--theme-reveal-x', `${x}px`)
  root.style.setProperty('--theme-reveal-y', `${y}px`)
  root.style.setProperty('--theme-reveal-radius', `${endRadius}px`)
  root.classList.add('theme-transitioning')

  const transition = documentWithTransition.startViewTransition(() => {
    isDark.value = nextTheme
  })

  transition.finished.finally(() => {
    root.classList.remove('theme-transitioning')
  })
}
</script>

<template>
  <div class="flex items-center gap-3 mb-2">
    <div class="relative group grow">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search
          class="h-5 w-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors"
        />
      </div>
      <input
        v-model="searchQuery"
        type="text"
        class="block w-full pl-9 pr-3 py-2.5 md:pl-10 md:pr-3 md:py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl leading-5 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs md:text-sm"
        placeholder="搜索餐厅、评价、地址..."
      />
    </div>
    <button
      @click="isMapView = !isMapView"
      class="p-2.5 md:p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 transition-colors shrink-0"
      :title="isMapView ? '切换到列表视图' : '切换到地图视图'"
      :aria-label="isMapView ? '切换到列表视图' : '切换到地图视图'"
    >
      <component :is="isMapView ? List : Map" :size="18" class="md:w-5 md:h-5" />
    </button>
    <button
      @click="toggleDarkMode"
      class="group/theme p-2.5 md:p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 transition-colors shrink-0 overflow-hidden"
      :aria-label="isDark ? '切换到亮色模式' : '切换到暗色模式'"
      :aria-pressed="isDark"
    >
      <component
        :is="isDark ? Moon : Sun"
        :key="isDark ? 'moon' : 'sun'"
        :size="18"
        class="theme-toggle-icon md:w-5 md:h-5"
      />
    </button>
  </div>
</template>

<style scoped>
.theme-toggle-icon {
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 180ms ease;
}

.group\/theme:active .theme-toggle-icon {
  transform: rotate(24deg) scale(0.86);
}
</style>

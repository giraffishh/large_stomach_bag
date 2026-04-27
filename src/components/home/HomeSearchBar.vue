<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { List, Map, Moon, Search, Sun } from 'lucide-vue-next'
import { useDark, useToggle } from '@vueuse/core'
import { useRestaurantStore } from '@/stores/restaurants'

const store = useRestaurantStore()
const { searchQuery, isMapView } = storeToRefs(store)

const isDark = useDark()
const toggleDark = useToggle(isDark)
</script>

<template>
  <div class="flex items-center gap-3 mb-2">
    <div class="relative group grow">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search class="h-5 w-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
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
      @click="toggleDark()"
      class="p-2.5 md:p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 transition-colors shrink-0"
      :aria-label="isDark ? '切换到亮色模式' : '切换到暗色模式'"
    >
      <component :is="isDark ? Moon : Sun" :size="18" class="md:w-5 md:h-5" />
    </button>
  </div>
</template>

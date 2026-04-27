<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { onClickOutside } from '@vueuse/core'
import { ArrowUpDown, Check } from 'lucide-vue-next'
import { useRestaurantStore } from '@/stores/restaurants'

const sortOptions = [
  { label: '默认排序', value: 'default' },
  { label: '距离最近', value: 'distance' },
  { label: '评分最高', value: 'rating' },
  { label: '价格最低', value: 'price_asc' },
  { label: '价格最高', value: 'price_desc' },
] as const

const store = useRestaurantStore()
const { sortBy } = storeToRefs(store)

const showSortMenu = ref(false)
const sortMenuRef = ref<HTMLElement | null>(null)

onClickOutside(sortMenuRef, () => {
  showSortMenu.value = false
})

const selectedSortLabel = computed(() => {
  return sortOptions.find((o) => o.value === sortBy.value)?.label || '排序'
})
</script>

<template>
  <div ref="sortMenuRef" class="relative shrink-0 ml-2">
    <button
      @click="showSortMenu = !showSortMenu"
      class="flex items-center gap-1 px-2 py-1.5 rounded-xl text-[13px] font-bold border bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 transition-all shadow-sm whitespace-nowrap"
      aria-label="排序选项"
    >
      <ArrowUpDown :size="14" />
      <span>{{ selectedSortLabel }}</span>
    </button>
    <div
      v-if="showSortMenu"
      class="absolute top-full right-0 mt-2 w-40 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 z-50 overflow-hidden"
    >
      <ul>
        <li v-for="option in sortOptions" :key="option.value">
          <button
            @click="sortBy = option.value; showSortMenu = false"
            class="w-full text-left px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-between"
            :class="{
              'font-bold text-indigo-600 dark:text-indigo-400': sortBy === option.value,
            }"
          >
            <span>{{ option.label }}</span>
            <Check v-if="sortBy === option.value" :size="16" />
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

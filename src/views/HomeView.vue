<script setup lang="ts">
import { useRestaurantStore } from '@/stores/restaurants'
import { storeToRefs } from 'pinia'
import { Search, Moon, Sun, Check, Map, List, Filter, X, ArrowUpDown } from 'lucide-vue-next'
import RestaurantCard from '@/components/RestaurantCard.vue'
import RestaurantMap from '@/components/RestaurantMap.vue'
import CoverPage from '@/components/CoverPage.vue'
import { useDark, useToggle, onClickOutside } from '@vueuse/core'
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

// Scroll container ref
const scrollContainerRef = ref<HTMLElement | null>(null)

// Track scroll state

const scrollToMain = () => {
  const anchor = document.getElementById('main-content-anchor')
  anchor?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(() => {
  console.log('[Scroll Debug] onMounted called, scrollContainerRef:', scrollContainerRef.value)

  // Restore scroll position if returning from detail page
  const savedScrollTop = sessionStorage.getItem('homeScrollPosition')
  console.log('[Scroll Debug] Saved scroll position:', savedScrollTop)

  if (savedScrollTop && scrollContainerRef.value) {
    const container = scrollContainerRef.value
    const targetScrollTop = parseInt(savedScrollTop)
    console.log('[Scroll Debug] Restoring to position:', targetScrollTop)

    // Temporarily disable scroll-snap to prevent it from overriding our position
    container.style.scrollSnapType = 'none'

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      container.scrollTop = targetScrollTop
      console.log('[Scroll Debug] Set scrollTop to:', container.scrollTop)

      // Re-enable scroll-snap after a short delay
      setTimeout(() => {
        container.style.scrollSnapType = ''
        // Clear the saved position after successful restore
        sessionStorage.removeItem('homeScrollPosition')
        console.log('[Scroll Debug] Scroll snap re-enabled, position cleared')
      }, 100)
    })
  }

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        store.setUserLocation(position.coords.latitude, position.coords.longitude)
      },
      (err) => {
        console.warn('Geolocation error:', err)
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 },
    )
  }
})

onBeforeUnmount(() => {
  console.log('[Scroll Debug] onBeforeUnmount called, scrollContainerRef:', scrollContainerRef.value)
  // Save scroll position when leaving
  if (scrollContainerRef.value) {
    const scrollTop = scrollContainerRef.value.scrollTop
    console.log('[Scroll Debug] Saving scroll position:', scrollTop)
    sessionStorage.setItem('homeScrollPosition', scrollTop.toString())
  } else {
    console.log('[Scroll Debug] WARNING: scrollContainerRef is null in onBeforeUnmount!')
  }
})

const isDark = useDark()
const toggleDark = useToggle(isDark)

const store = useRestaurantStore()
const {
  searchQuery,
  selectedTags,
  selectedRatings,
  priceRanges,
  allTags,
  filteredRestaurants,
  sortBy,
  isMapView,
} = storeToRefs(store)

const ratings = ['夯', '人上人', 'npc', '拉完了']
const priceOptions = [
  { label: '0-30', value: { min: 0, max: 30 } },
  { label: '30-60', value: { min: 30, max: 60 } },
  { label: '60-90', value: { min: 60, max: 90 } },
  { label: '90-150', value: { min: 90, max: 150 } },
  { label: '150+', value: { min: 150, max: 99999 } },
]
const sortOptions = [
  { label: '默认排序', value: 'default' },
  { label: '距离最近', value: 'distance' },
  { label: '评分最高', value: 'rating' },
  { label: '价格最低', value: 'price_asc' },
  { label: '价格最高', value: 'price_desc' },
] as const

// Filter Menu State
const showFilterMenu = ref(false)
const filterMenuRef = ref(null)
const tagSearchQuery = ref('')
const customMin = ref('')
const customMax = ref('')
const showSortMenu = ref(false)
const sortMenuRef = ref(null)

onClickOutside(filterMenuRef, () => {
  showFilterMenu.value = false
})

onClickOutside(sortMenuRef, () => {
  showSortMenu.value = false
})

const selectedSortLabel = computed(() => {
  return sortOptions.find((o) => o.value === sortBy.value)?.label || '排序'
})

const filteredTags = computed(() => {
  if (!tagSearchQuery.value) return allTags.value
  return allTags.value.filter((tag) =>
    tag.toLowerCase().includes(tagSearchQuery.value.toLowerCase()),
  )
})

const toggleTag = (tag: string) => {
  if (selectedTags.value.includes(tag)) {
    selectedTags.value = selectedTags.value.filter((t) => t !== tag)
  } else {
    selectedTags.value.push(tag)
  }
}

const toggleRating = (rating: string) => {
  if (selectedRatings.value.includes(rating)) {
    selectedRatings.value = selectedRatings.value.filter((r) => r !== rating)
  } else {
    selectedRatings.value.push(rating)
  }
}

const togglePriceRange = (range: { min: number; max: number }) => {
  const index = priceRanges.value.findIndex((r) => r.min === range.min && r.max === range.max)
  if (index !== -1) {
    priceRanges.value.splice(index, 1)
  } else {
    priceRanges.value.push(range)
  }
}

const applyCustomPrice = () => {
  const min = parseInt(customMin.value)
  const max = parseInt(customMax.value)

  if (isNaN(min) && isNaN(max)) return

  // Custom price clears presets and sets a single specific range
  priceRanges.value = [
    {
      min: isNaN(min) ? 0 : min,
      max: isNaN(max) ? 99999 : max,
    },
  ]
}

const clearAllFilters = () => {
  selectedTags.value = []
  selectedRatings.value = []
  priceRanges.value = []
  customMin.value = ''
  customMax.value = ''
}

const allSelectedFilters = computed(() => {
  const filters: {
    type: 'rating' | 'price' | 'tag'
    value: string | { min: number; max: number }
    label: string
  }[] = []

  selectedRatings.value.forEach((rating) => {
    filters.push({ type: 'rating', value: rating, label: rating })
  })

  priceRanges.value.forEach((range) => {
    filters.push({
      type: 'price',
      value: range,
      label: `¥${range.min}-${range.max >= 99999 ? '∞' : range.max}`,
    })
  })

  selectedTags.value.forEach((tag) => {
    filters.push({ type: 'tag', value: tag, label: `#${tag}` })
  })

  return filters
})

const removeFilter = (filter: {
  type: 'rating' | 'price' | 'tag'
  value: string | { min: number; max: number }
}) => {
  if (filter.type === 'rating') {
    toggleRating(filter.value as string)
  } else if (filter.type === 'price') {
    togglePriceRange(filter.value as { min: number; max: number })
  } else if (filter.type === 'tag') {
    toggleTag(filter.value as string)
  }
}
</script>

<template>
  <div
    ref="scrollContainerRef"
    class="h-screen overflow-y-auto scroll-snap-container"
  >
    <!-- Cover Page -->
    <CoverPage @scroll-down="scrollToMain" />

    <!-- Main Content -->
    <main
      id="main-content-anchor"
      class="min-h-screen bg-stone-100 dark:bg-zinc-950 transition-colors duration-300 snap-start"
      :class="[isMapView ? '' : 'pb-20']"
    >
      <header
        class="sticky top-0 z-30 bg-stone-100/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-stone-200 dark:border-zinc-800"
      >
        <div class="max-w-4xl mx-auto px-4 pt-4 pb-3 md:py-4">
          <!-- Search Bar Row -->
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
              @click="toggleDark()"
              class="p-2.5 md:p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 transition-colors shrink-0"
              :aria-label="isDark ? '切换到亮色模式' : '切换到暗色模式'"
            >
              <component :is="isDark ? Moon : Sun" :size="18" class="md:w-5 md:h-5" />
            </button>
          </div>

        <!-- Filter Toolbar Row -->
        <div class="flex items-center mt-1 md:mt-2 relative">
          <div ref="filterMenuRef" class="relative shrink-0">
            <button
              @click="showFilterMenu = !showFilterMenu"
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[13px] font-bold border transition-all shadow-sm whitespace-nowrap focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
              :class="
                selectedRatings.length > 0 || selectedTags.length > 0 || priceRanges.length > 0
                  ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
              "
              aria-label="打开筛选菜单"
            >
              <Filter :size="14" />
              <span>筛选</span>
              <span
                v-if="selectedRatings.length + selectedTags.length + priceRanges.length > 0"
                class="flex items-center justify-center bg-white text-black dark:bg-black dark:text-white rounded-full w-4 h-4 text-[9px] shrink-0 font-bold"
              >
                {{ selectedRatings.length + selectedTags.length + priceRanges.length }}
              </span>
            </button>

            <!-- Unified Filter Dropdown -->
            <div
              v-if="showFilterMenu"
              class="absolute top-full left-0 mt-2 w-[calc(100vw-32px)] md:w-[480px] max-w-[480px] bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 z-50 flex flex-col max-h-[75vh] overflow-hidden"
            >
              <!-- Header -->
              <div
                class="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800"
              >
                <h3 class="font-bold text-zinc-900 dark:text-zinc-100">筛选条件</h3>
                <button
                  v-if="selectedRatings.length + selectedTags.length + priceRanges.length > 0"
                  @click="clearAllFilters"
                  class="text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                >
                  清空全部
                </button>
              </div>

              <!-- Scrollable Content -->
              <div class="overflow-y-auto custom-scrollbar p-4 space-y-6">
                <!-- 1. Ratings Section -->
                <section>
                  <div class="flex items-center gap-2 mb-3">
                    <span class="text-sm font-bold text-zinc-900 dark:text-zinc-100">评分</span>
                  </div>
                  <div class="grid grid-cols-4 gap-2">
                    <button
                      v-for="rating in ratings"
                      :key="rating"
                      @click="toggleRating(rating)"
                      class="w-full px-1.5 py-2 rounded-xl text-[11px] md:text-sm font-bold border transition-all shadow-sm flex items-center justify-center gap-1"
                      :class="[
                        selectedRatings.includes(rating)
                          ? 'ring-1'
                          : 'hover:scale-105 active:scale-95',
                        rating === '夯'
                          ? selectedRatings.includes(rating)
                            ? 'bg-yellow-50 text-yellow-600 border-yellow-200 ring-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800'
                            : 'bg-white text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                          : '',
                        rating === '人上人'
                          ? selectedRatings.includes(rating)
                            ? 'bg-purple-50 text-purple-600 border-purple-200 ring-purple-400 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800'
                            : 'bg-white text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                          : '',
                        rating === 'npc'
                          ? selectedRatings.includes(rating)
                            ? 'bg-blue-50 text-blue-600 border-blue-200 ring-blue-400 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800'
                            : 'bg-white text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                          : '',
                        rating === '拉完了'
                          ? selectedRatings.includes(rating)
                            ? 'bg-green-50 text-green-600 border-green-200 ring-green-400 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                            : 'bg-white text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                          : '',
                      ]"
                    >
                      <span>{{ rating }}</span>
                      <Check
                        class="transition-all duration-200"
                        :class="
                          selectedRatings.includes(rating)
                            ? 'opacity-100 w-3.5'
                            : 'opacity-0 w-0 overflow-hidden'
                        "
                        :size="14"
                      />
                    </button>
                  </div>
                </section>

                <!-- 2. Price Section -->
                <section>
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-sm font-bold text-zinc-900 dark:text-zinc-100">人均价格</span>
                  </div>
                  <div class="grid grid-cols-3 gap-2 mb-3">
                    <button
                      v-for="opt in priceOptions"
                      :key="opt.label"
                      @click="togglePriceRange(opt.value)"
                      class="py-2 rounded-lg text-xs font-medium border transition-all text-center"
                      :class="
                        priceRanges.some((r) => r.min === opt.value.min && r.max === opt.value.max)
                          ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900'
                          : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                      "
                    >
                      {{ opt.label }}
                    </button>
                  </div>
                  <div class="flex items-center gap-2">
                    <div class="relative grow">
                      <span
                        class="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px]"
                        >¥</span
                      >
                      <input
                        v-model="customMin"
                        type="number"
                        placeholder="最低"
                        class="w-full pl-5 pr-2 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                      />
                    </div>
                    <span class="text-zinc-400 text-xs">-</span>
                    <div class="relative grow">
                      <span
                        class="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px]"
                        >¥</span
                      >
                      <input
                        v-model="customMax"
                        type="number"
                        placeholder="最高"
                        class="w-full pl-5 pr-2 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
                      />
                    </div>
                    <button
                      @click="applyCustomPrice"
                      class="px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-xs font-bold transition-colors whitespace-nowrap shrink-0 border border-zinc-200 dark:border-zinc-700"
                    >
                      确认
                    </button>
                  </div>
                </section>

                <!-- 3. Tags Section -->
                <section>
                  <div class="flex items-center justify-between mb-3">
                    <span class="text-sm font-bold text-zinc-900 dark:text-zinc-100">标签</span>
                    <div class="relative w-32 md:w-40">
                      <Search
                        class="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400"
                      />
                      <input
                        v-model="tagSearchQuery"
                        type="text"
                        placeholder="搜索标签"
                        class="w-full pl-7 pr-2 py-1 text-xs bg-zinc-100 dark:bg-zinc-800 border-none rounded-md outline-none focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-600 transition-all text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-2 max-h-40 overflow-y-auto custom-scrollbar">
                    <button
                      v-for="tag in filteredTags"
                      :key="tag"
                      @click="toggleTag(tag)"
                      class="px-3 py-1.5 text-xs rounded-lg border transition-all flex items-center gap-1"
                      :class="
                        selectedTags.includes(tag)
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400'
                          : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400'
                      "
                    >
                      #{{ tag }}
                    </button>
                  </div>
                </section>
              </div>

              <!-- Footer Actions -->
              <div
                class="p-3 md:p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50"
              >
                <button
                  @click="showFilterMenu = false"
                  class="w-full py-2.5 md:py-3 rounded-xl text-sm md:text-base font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity shadow-lg shadow-zinc-200 dark:shadow-zinc-900/50"
                >
                  查看 {{ filteredRestaurants.length }} 家餐厅
                </button>
              </div>
            </div>
          </div>

          <!-- Selected Filters Chips (Horizontal Scroll) -->
          <div
            class="flex items-center gap-2 overflow-x-auto no-scrollbar ml-2 mask-linear-fade grow"
          >
            <div
              v-for="(filter, idx) in allSelectedFilters.slice(0, 2)"
              :key="idx"
              class="flex items-center gap-1 px-2 py-1 rounded-md text-xs whitespace-nowrap border shrink-0"
              :class="[
                filter.type === 'tag'
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300',
              ]"
            >
              <span>{{ filter.label }}</span>
              <button @click="removeFilter(filter)" class="hover:text-red-500">
                <X :size="12" />
              </button>
            </div>
            <div
              v-if="allSelectedFilters.length > 2"
              class="px-2 py-1 rounded-md bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 text-xs text-zinc-400 whitespace-nowrap"
            >
              ...
            </div>
          </div>

          <!-- Sort Dropdown -->
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
        </div>
      </div>
    </header>

    <section
      :class="[
        isMapView
          ? 'w-full md:max-w-4xl md:mx-auto md:px-4 md:pt-4'
          : 'max-w-4xl mx-auto px-4 space-y-4 pt-4',
      ]"
    >
      <div v-if="isMapView" class="w-full">
        <RestaurantMap />
      </div>
      <div v-else class="space-y-4">
        <div v-if="filteredRestaurants.length === 0" class="text-center py-20 text-zinc-400">
          <p>没有找到相关餐厅...</p>
        </div>
        <RestaurantCard
          v-for="restaurant in filteredRestaurants"
          :key="restaurant.id"
          :restaurant="restaurant"
        />
      </div>
    </section>
  </main>
  </div>
</template>

<style>
.scroll-snap-container {
  scroll-snap-type: y mandatory;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}
.scroll-snap-container {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #e4e4e7;
  border-radius: 4px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: #3f3f46;
}
</style>

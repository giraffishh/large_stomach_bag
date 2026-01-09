<script setup lang="ts">
import { useRestaurantStore } from '@/stores/restaurants'
import { storeToRefs } from 'pinia'
import { Search, Moon, Sun, DollarSign, Tag, ChevronDown, Check, Map, List } from 'lucide-vue-next'
import RestaurantCard from '@/components/RestaurantCard.vue'
import RestaurantMap from '@/components/RestaurantMap.vue'
import { useDark, useToggle, onClickOutside } from '@vueuse/core'
import { ref, computed } from 'vue'

const isDark = useDark()
const toggleDark = useToggle(isDark)
const isMapView = ref(false)

const store = useRestaurantStore()
const { searchQuery, selectedTags, selectedRatings, priceRange, allTags, filteredRestaurants } = storeToRefs(store)

const ratings = ['夯', '人上人', 'npc', '拉完了']
const priceOptions = [
  { label: '0-30', value: { min: 0, max: 30 } },
  { label: '30-60', value: { min: 30, max: 60 } },
  { label: '60-90', value: { min: 60, max: 90 } },
  { label: '90-150', value: { min: 90, max: 150 } },
  { label: '150+', value: { min: 150, max: 99999 } },
]

// Tag Dropdown State
const showTagsDropdown = ref(false)
const tagsDropdownRef = ref(null)
const tagSearchQuery = ref('')

// Rating Dropdown State (Mobile)
const showRatingDropdown = ref(false)
const ratingDropdownRef = ref(null)

onClickOutside(ratingDropdownRef, () => {
  showRatingDropdown.value = false
})

const ratingLabel = computed(() => {
  const count = selectedRatings.value.length
  if (count === 0) return '评价'
  if (count <= 4) return selectedRatings.value.join(' ')
  return '评价'
})

onClickOutside(tagsDropdownRef, () => {
  showTagsDropdown.value = false
})

const filteredTags = computed(() => {
  if (!tagSearchQuery.value) return allTags.value
  return allTags.value.filter(tag => tag.toLowerCase().includes(tagSearchQuery.value.toLowerCase()))
})

// Price Dropdown State
const showPriceDropdown = ref(false)
const priceDropdownRef = ref(null)
const customMin = ref('')
const customMax = ref('')

onClickOutside(priceDropdownRef, () => {
  showPriceDropdown.value = false
})

const priceLabel = computed(() => {
  if (!priceRange.value) return '价格'
  const { min, max } = priceRange.value
  if (min === 0 && max >= 99999) return '价格'
  if (max >= 99999) return `¥${min}+`
  return `¥${min}-${max}`
})

const toggleTag = (tag: string) => {
  if (selectedTags.value.includes(tag)) {
    selectedTags.value = selectedTags.value.filter(t => t !== tag)
  } else {
    selectedTags.value.push(tag)
  }
}

const toggleRating = (rating: string) => {
  if (selectedRatings.value.includes(rating)) {
    selectedRatings.value = selectedRatings.value.filter(r => r !== rating)
  } else {
    selectedRatings.value.push(rating)
  }
}

const setPriceRange = (range: { min: number; max: number } | null) => {
  priceRange.value = range
  customMin.value = ''
  customMax.value = ''
}

const applyCustomPrice = () => {
  if (customMin.value === '' && customMax.value === '') {
    showPriceDropdown.value = false
    return
  }
  const min = parseInt(customMin.value) || 0
  const max = parseInt(customMax.value) || 99999
  if (min > max) return
  priceRange.value = { min, max }
  showPriceDropdown.value = false
}
</script>

<template>
  <main class="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20 transition-colors duration-300">
    <header class="sticky top-0 z-30 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
      <div class="max-w-4xl mx-auto px-4 py-4">
        <!-- Search Bar Row -->
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
            class="p-2.5 md:p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shrink-0"
            :title="isMapView ? '切换到列表视图' : '切换到地图视图'"
          >
            <component :is="isMapView ? List : Map" :size="18" class="md:w-5 md:h-5" />
          </button>
          <button 
            @click="toggleDark()" 
            class="p-2.5 md:p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors shrink-0"
          >
            <component :is="isDark ? Moon : Sun" :size="18" class="md:w-5 md:h-5" />
          </button>
        </div>

        <!-- Filter Toolbar Row -->
        <div class="flex items-center mt-1 md:mt-2 relative justify-between">
          <!-- Rating Filters (Desktop List) -->
          <div class="hidden md:flex items-center gap-2 overflow-x-auto p-2 no-scrollbar grow -ml-2 pl-2">
            <!-- All Button -->
            <button 
              class="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold border transition-all shrink-0 shadow-sm"
              :class="selectedRatings.length === 0 ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'"
              @click="selectedRatings = []"
            >
              全部
            </button>
            
            <button 
              v-for="rating in ratings" 
              :key="rating"
              @click="toggleRating(rating)"
              class="px-5 py-2 rounded-xl text-sm font-bold border transition-all shrink-0 shadow-sm flex items-center gap-1.5"
              :class="[
                selectedRatings.includes(rating) ? 'ring-2 ring-offset-1 dark:ring-offset-zinc-900' : 'hover:scale-105 active:scale-95',
                rating === '夯' ? (selectedRatings.includes(rating) ? 'bg-yellow-50 text-yellow-600 border-yellow-200 ring-yellow-400 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' : 'bg-white text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700') : '',
                rating === '人上人' ? (selectedRatings.includes(rating) ? 'bg-purple-50 text-purple-600 border-purple-200 ring-purple-400 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800' : 'bg-white text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700') : '',
                rating === 'npc' ? (selectedRatings.includes(rating) ? 'bg-blue-50 text-blue-600 border-blue-200 ring-blue-400 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' : 'bg-white text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700') : '',
                rating === '拉完了' ? (selectedRatings.includes(rating) ? 'bg-green-50 text-green-600 border-green-200 ring-green-400 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 'bg-white text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700') : '',
              ]"
            >
               {{ rating }}
            </button>
          </div>

          <!-- Rating Filter (Mobile Dropdown) -->
          <div ref="ratingDropdownRef" class="md:hidden relative mr-1.5">
            <button 
              @click="showRatingDropdown = !showRatingDropdown; showTagsDropdown = false; showPriceDropdown = false"
              class="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all shadow-sm max-w-[180px]"
              :class="selectedRatings.length > 0 || showRatingDropdown ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'"
            >
              <!-- Star icon for Rating -->
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span class="truncate block">
                {{ ratingLabel }}
              </span>
              <span v-if="selectedRatings.length > 4" class="flex items-center justify-center bg-white text-black dark:bg-black dark:text-white rounded-full w-4 h-4 text-[10px] shrink-0">
                {{ selectedRatings.length }}
              </span>
              <ChevronDown :size="12" class="transition-transform duration-300 shrink-0" :class="{ 'rotate-180': showRatingDropdown }" />
            </button>

            <!-- Rating Dropdown Content -->
            <div 
              v-if="showRatingDropdown"
              class="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 z-50 p-2"
            >
              <div class="max-h-[60vh] overflow-y-auto custom-scrollbar">
                <button 
                  v-for="rating in ratings" 
                  :key="rating"
                  @click="toggleRating(rating)"
                  class="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg mb-1 last:mb-0 transition-colors"
                  :class="[
                    selectedRatings.includes(rating) 
                      ? (rating === '夯' ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                         rating === '人上人' ? 'bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                         rating === 'npc' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                         'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400')
                      : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  ]"
                >
                  <span>{{ rating }}</span>
                  <Check v-if="selectedRatings.includes(rating)" :size="14" />
                </button>
              </div>
              <div class="pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-1">
                <button @click="showRatingDropdown = false" class="w-full px-3 py-2 rounded-lg text-sm font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity">确定</button>
              </div>
            </div>
          </div>

          <!-- Vertical Divider - Hidden on mobile -->
          <div class="hidden md:block w-px h-6 bg-zinc-300 dark:bg-zinc-700 mx-2 shrink-0"></div>
          <div class="flex items-center gap-1.5 md:gap-2 shrink-0">
            <!-- Tags -->
            <div ref="tagsDropdownRef" class="static md:relative">
              <button 
                @click="showTagsDropdown = !showTagsDropdown; showPriceDropdown = false"
                class="flex items-center gap-1 px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-bold border transition-all shadow-sm max-w-[100px] md:max-w-[150px]"
                :class="selectedTags.length > 0 || showTagsDropdown ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'"
              >
                <Tag :size="14" class="shrink-0" />
                <span class="truncate block">
                  {{ selectedTags.length === 1 ? selectedTags[0] : '标签' }}
                </span>
                <span v-if="selectedTags.length > 1" class="flex items-center justify-center bg-white text-black dark:bg-black dark:text-white rounded-full w-4 h-4 md:w-5 md:h-5 text-[10px] md:text-xs shrink-0">
                  {{ selectedTags.length }}
                </span>
                <ChevronDown :size="12" class="transition-transform duration-300" :class="{ 'rotate-180': showTagsDropdown }" />
              </button>

              <div v-if="showTagsDropdown" class="absolute top-full left-0 w-full md:w-72 md:left-auto md:right-0 mt-2 max-h-[60vh] overflow-hidden bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 z-50 flex flex-col">
                <div class="p-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div class="relative">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input v-model="tagSearchQuery" type="text" placeholder="搜索标签..." class="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border-none rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500" />
                  </div>
                </div>
                <div class="p-2 overflow-y-auto custom-scrollbar grid grid-cols-2 gap-2">
                  <div v-if="filteredTags.length === 0" class="col-span-2 p-4 text-center text-zinc-400 text-sm">未找到标签</div>
                  <button v-for="tag in filteredTags" :key="tag" @click="toggleTag(tag)" class="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800" :class="selectedTags.includes(tag) ? 'text-indigo-600 font-medium bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400' : 'text-zinc-600 dark:text-zinc-300'">
                    <span class="truncate">#{{ tag }}</span>
                    <Check v-if="selectedTags.includes(tag)" :size="14" />
                  </button>
                </div>
                <div class="p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 grid grid-cols-2 gap-3">
                  <button @click="selectedTags = []" class="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-center">清空</button>
                  <button @click="showTagsDropdown = false" class="px-4 py-2 rounded-lg text-sm font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity text-center">确定</button>
                </div>
              </div>
            </div>

            <!-- Price -->
            <div ref="priceDropdownRef" class="relative">
              <button 
                @click="showPriceDropdown = !showPriceDropdown; showTagsDropdown = false"
                class="flex items-center gap-1 px-2.5 py-1.5 md:px-3 md:py-2 rounded-lg md:rounded-xl text-xs md:text-sm font-bold border transition-all shadow-sm"
                :class="priceRange || showPriceDropdown ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'"
              >
                <DollarSign :size="14" class="shrink-0" />
                <span>{{ priceLabel }}</span>
                <ChevronDown :size="12" class="transition-transform duration-300" :class="{ 'rotate-180': showPriceDropdown }" />
              </button>

              <div v-if="showPriceDropdown" class="absolute top-full right-0 mt-2 w-64 md:w-72 bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 z-50 p-3 md:p-4">
                <div class="mb-4">
                  <div class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">价格区间</div>
                  <div class="grid grid-cols-2 gap-2">
                    <button @click="setPriceRange(null)" class="px-2 py-2 rounded-lg text-xs font-medium border transition-all" :class="!priceRange ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'">不限</button>
                    <button v-for="opt in priceOptions" :key="opt.label" @click="setPriceRange(priceRange?.min === opt.value.min && priceRange?.max === opt.value.max ? null : opt.value)" class="px-2 py-2 rounded-lg text-xs font-medium border transition-all" :class="priceRange?.min === opt.value.min && priceRange?.max === opt.value.max ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'">{{ opt.label }}</button>
                  </div>
                </div>
                <div>
                  <div class="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">自定义区间</div>
                  <div class="flex items-center gap-2">
                    <input v-model="customMin" type="number" placeholder="Min" class="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500" />
                    <span class="text-zinc-400">-</span>
                    <input v-model="customMax" type="number" placeholder="Max" class="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500" />
                  </div>
                  <button @click="applyCustomPrice" class="w-full mt-3 px-3 py-2 rounded-lg text-sm font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity">确定</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>

    <section class="max-w-4xl mx-auto px-4 space-y-4 pt-4">
      <div v-if="isMapView">
        <RestaurantMap />
      </div>
      <div v-else class="space-y-4">
        <div v-if="filteredRestaurants.length === 0" class="text-center py-20 text-zinc-400">
          <p>没有找到相关餐厅...</p>
        </div>
        <RestaurantCard v-for="restaurant in filteredRestaurants" :key="restaurant.id" :restaurant="restaurant" />
      </div>
    </section>
  </main>
</template>

<style>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e4e4e7; border-radius: 4px; }
.dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #3f3f46; }
</style>

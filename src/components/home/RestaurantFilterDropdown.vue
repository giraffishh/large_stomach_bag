<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { onClickOutside } from '@vueuse/core'
import { Check, Filter, Search, Trash2 } from 'lucide-vue-next'
import { useRestaurantStore } from '@/stores/restaurants'
import { useRestaurantFilters } from '@/composables/useRestaurantFilters'
import { formatCityLabel, isSameCity, normalizeCityName } from '@/utils/city'

const store = useRestaurantStore()
const { allTags, filteredRestaurants, priceRanges, restaurants, selectedCities, selectedRatings, selectedTags, userCity } =
  storeToRefs(store)

const {
  ratings,
  priceOptions,
  toggleCity,
  toggleTag,
  toggleRating,
  togglePriceRange,
  setCustomPrice,
  clearAllFilters,
} = useRestaurantFilters()

const showFilterMenu = ref(false)
const filterMenuRef = ref<HTMLElement | null>(null)
const tagSearchQuery = ref('')
const customMin = ref('')
const customMax = ref('')

onClickOutside(filterMenuRef, () => {
  showFilterMenu.value = false
})

const activeFilterCount = computed(() => {
  return (
    selectedCities.value.length +
    selectedRatings.value.length +
    selectedTags.value.length +
    priceRanges.value.length
  )
})

const filteredTags = computed(() => {
  if (!tagSearchQuery.value) return allTags.value
  return allTags.value.filter((tag) =>
    tag.toLowerCase().includes(tagSearchQuery.value.toLowerCase()),
  )
})

const applyCustomPrice = () => {
  setCustomPrice(customMin.value, customMax.value)
}

const clearFilters = () => {
  clearAllFilters()
  customMin.value = ''
  customMax.value = ''
}

const hasCurrentCityOption = computed(() => {
  return Boolean(userCity.value?.trim())
})

const isCityActive = (city: string) => {
  return selectedCities.value.some((selectedCity) => isSameCity(selectedCity, city))
}

const cityOptions = computed(() => {
  const cityMap = new Map<string, { value: string; label: string; count: number }>()

  restaurants.value.forEach((restaurant) => {
    const normalizedCity = normalizeCityName(restaurant.city)
    if (!normalizedCity) {
      return
    }

    const existing = cityMap.get(normalizedCity)
    if (existing) {
      existing.count += 1
      return
    }

    cityMap.set(normalizedCity, {
      value: restaurant.city,
      label: formatCityLabel(restaurant.city),
      count: 1,
    })
  })

  const options = Array.from(cityMap.values()).sort((a, b) => b.count - a.count)

  if (!hasCurrentCityOption.value) {
    return options
  }

  const currentCity = userCity.value
  const currentCityIndex = options.findIndex((option) => isSameCity(option.value, currentCity))

  if (currentCityIndex !== -1) {
    const currentOption = options[currentCityIndex]
    if (currentOption) {
      options.splice(currentCityIndex, 1)
      options.unshift({
        ...currentOption,
        value: currentCity,
        label: formatCityLabel(currentCity),
      })
      return options
    }
  }

  options.unshift({
    value: currentCity,
    label: formatCityLabel(currentCity),
    count: 0,
  })

  return options
})

const isCurrentCityOption = (city: string) => {
  return Boolean(userCity.value?.trim()) && isSameCity(city, userCity.value)
}
</script>

<template>
  <div ref="filterMenuRef" class="relative shrink-0">
    <button
      @click="showFilterMenu = !showFilterMenu"
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[13px] font-bold border transition-all shadow-sm whitespace-nowrap focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
      :class="
        activeFilterCount > 0
          ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900'
          : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
      "
      aria-label="打开筛选菜单"
    >
      <Filter :size="14" />
      <span>筛选</span>
      <span
        v-if="activeFilterCount > 0"
        class="flex items-center justify-center bg-white text-black dark:bg-black dark:text-white rounded-full w-4 h-4 text-[9px] shrink-0 font-bold"
      >
        {{ activeFilterCount }}
      </span>
    </button>

    <div
      v-if="showFilterMenu"
      class="absolute top-full left-0 mt-2 w-[calc(100vw-32px)] md:w-[480px] max-w-[480px] bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 z-50 flex flex-col max-h-[75vh] overflow-hidden"
    >
      <button
        v-if="activeFilterCount > 0"
        @click="clearFilters"
        class="absolute top-2 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
        aria-label="清空全部筛选"
        title="清空全部筛选"
      >
        <Trash2 :size="16" />
      </button>

      <div class="overflow-y-auto custom-scrollbar p-4 space-y-6">
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
                selectedRatings.includes(rating) ? 'ring-1' : 'hover:scale-105 active:scale-95',
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

        <section>
          <div class="flex items-center gap-2 mb-3">
            <span class="text-sm font-bold text-zinc-900 dark:text-zinc-100">城市</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="city in cityOptions"
              :key="city.label"
              @click="toggleCity(city.value)"
              class="px-3 py-1.5 text-xs rounded-lg border transition-all flex items-center gap-1"
              :class="
                isCityActive(city.value)
                  ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900'
                  : isCurrentCityOption(city.value)
                    ? 'bg-white border-zinc-300 ring-1 ring-zinc-200 text-zinc-700 hover:border-zinc-400 dark:bg-zinc-800 dark:border-zinc-600 dark:ring-zinc-700 dark:text-zinc-300'
                    : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400'
              "
            >
              <span>{{ city.label }}</span>
              <span class="text-[11px] opacity-70">{{ city.count }}</span>
            </button>
          </div>
        </section>

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
              <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px]">
                ¥
              </span>
              <input
                v-model="customMin"
                type="number"
                placeholder="最低"
                class="w-full pl-5 pr-2 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs focus:ring-2 focus:ring-indigo-500/20 outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              />
            </div>
            <span class="text-zinc-400 text-xs">-</span>
            <div class="relative grow">
              <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400 text-[10px]">
                ¥
              </span>
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

        <section>
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-bold text-zinc-900 dark:text-zinc-100">标签</span>
            <div class="relative w-32 md:w-40">
              <Search class="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
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
                  ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400'
              "
            >
              #{{ tag }}
            </button>
          </div>
        </section>
      </div>

      <div class="p-3 md:p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
        <button
          @click="showFilterMenu = false"
          class="w-full py-2.5 md:py-3 rounded-xl text-sm md:text-base font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:opacity-90 transition-opacity shadow-lg shadow-zinc-200 dark:shadow-zinc-900/50"
        >
          查看 {{ filteredRestaurants.length }} 家餐厅
        </button>
      </div>
    </div>
  </div>
</template>

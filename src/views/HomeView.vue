<script setup lang="ts">
import { defineAsyncComponent, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRestaurantStore } from '@/stores/restaurants'
import { useAMap } from '@/composables/useAMap'
import RestaurantCard from '@/components/RestaurantCard.vue'
import HomeSearchBar from '@/components/home/HomeSearchBar.vue'
import RestaurantFilterDropdown from '@/components/home/RestaurantFilterDropdown.vue'
import RestaurantSortDropdown from '@/components/home/RestaurantSortDropdown.vue'
import SelectedFilterChips from '@/components/home/SelectedFilterChips.vue'

const RestaurantMap = defineAsyncComponent(() => import('@/components/RestaurantMap.vue'))

const { initLocation } = useAMap()

onMounted(() => {
  initLocation()
})

const store = useRestaurantStore()
const { filteredRestaurants, isMapView } = storeToRefs(store)
</script>

<template>
  <main
    class="min-h-screen bg-stone-100 dark:bg-zinc-950 transition-colors duration-300"
    :class="[isMapView ? '' : 'pb-20']"
  >
    <header
      class="sticky top-0 z-30 bg-stone-100/90 dark:bg-zinc-900/90 backdrop-blur-md border-b border-stone-200 dark:border-zinc-800"
    >
      <div class="max-w-4xl mx-auto px-4 pt-4 pb-3 md:py-4">
        <HomeSearchBar />

        <div class="flex items-center mt-1 md:mt-2 relative">
          <RestaurantFilterDropdown />
          <SelectedFilterChips />
          <RestaurantSortDropdown />
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
</template>

<style>
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

<script setup lang="ts">
import { defineAsyncComponent, onBeforeUnmount, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRestaurantStore } from '@/stores/restaurants'
import RestaurantCard from '@/components/RestaurantCard.vue'
import HomeSearchBar from '@/components/home/HomeSearchBar.vue'
import RestaurantFilterDropdown from '@/components/home/RestaurantFilterDropdown.vue'
import RestaurantSortDropdown from '@/components/home/RestaurantSortDropdown.vue'
import SelectedFilterChips from '@/components/home/SelectedFilterChips.vue'

const RestaurantMap = defineAsyncComponent(() => import('@/components/RestaurantMap.vue'))

let locationTimer: ReturnType<typeof setTimeout> | null = null
let isDisposed = false

onMounted(() => {
  locationTimer = setTimeout(() => {
    locationTimer = null

    import('@/composables/useAMap')
      .then(({ useAMap }) => {
        if (!isDisposed) {
          useAMap().initLocation()
        }
      })
      .catch((error) => {
        console.error('[HomeView] Failed to initialize location:', error)
      })
  }, 350)
})

onBeforeUnmount(() => {
  isDisposed = true

  if (locationTimer) {
    clearTimeout(locationTimer)
    locationTimer = null
  }
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
      <div v-else>
        <div v-if="filteredRestaurants.length === 0" class="text-center py-20 text-zinc-400">
          <p>没有找到相关餐厅...</p>
        </div>
        <TransitionGroup
          v-else
          name="restaurant-list"
          tag="div"
          class="restaurant-list flex flex-col gap-4"
        >
          <RestaurantCard
            v-for="(restaurant, index) in filteredRestaurants"
            :key="restaurant.id"
            :restaurant="restaurant"
            :priority="index < 2"
          />
        </TransitionGroup>
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
.restaurant-list {
  position: relative;
}
.restaurant-list-move,
.restaurant-list-enter-active,
.restaurant-list-leave-active {
  transition:
    transform 520ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 220ms ease;
}
.restaurant-list-enter-from,
.restaurant-list-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}
.restaurant-list-leave-active {
  position: absolute;
  left: 0;
  right: 0;
  width: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .restaurant-list-move,
  .restaurant-list-enter-active,
  .restaurant-list-leave-active {
    transition: none;
  }
}
</style>

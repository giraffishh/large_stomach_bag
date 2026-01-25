<script setup lang="ts">
import type { Restaurant } from '@/stores/restaurants'
import { useRestaurantStore } from '@/stores/restaurants'
import RatingBadge from './RatingBadge.vue'
import { MapPin, ArrowRight } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    restaurant: Restaurant
    autoHeight?: boolean
  }>(),
  {
    autoHeight: false,
  },
)

const router = useRouter()
const store = useRestaurantStore()

const goToDetail = () => {
  router.push(`/restaurant/${props.restaurant.id}`)
}

const displayAddress = computed(() => {
  if (props.restaurant.location) return props.restaurant.location

  const addr = props.restaurant.shareLink || ''
  const startMarker = '/人'
  const endMarker = 'https'

  const startIndex = addr.indexOf(startMarker)
  const endIndex = addr.indexOf(endMarker)

  // If both found and order is correct
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    return addr.substring(startIndex + startMarker.length, endIndex).trim()
  }

  // If '/人' found but no 'https', take everything after '/人'
  if (startIndex !== -1 && endIndex === -1) {
    return addr.substring(startIndex + startMarker.length).trim()
  }

  // Fallback: If no match, return original
  return addr
})
</script>

<template>
  <div
    @click="goToDetail"
    class="group bg-white dark:bg-zinc-900 rounded-xl md:rounded-2xl overflow-hidden shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_16px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-pointer border border-stone-200/60 dark:border-zinc-800 flex flex-row"
    :class="[autoHeight ? 'min-h-[7rem] md:min-h-[12rem]' : 'h-28 md:h-48']"
    v-motion
    :initial="{ opacity: 0, y: 20 }"
    :enter="{ opacity: 1, y: 0 }"
  >
    <!-- Cover Image -->
    <div class="w-28 md:w-48 lg:w-64 shrink-0 overflow-hidden relative self-stretch">
      <img
        :src="
          restaurant.coverUrl || restaurant.cover || 'https://placehold.co/600x400?text=No+Image'
        "
        alt="Cover"
        class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
    </div>

    <!-- Content -->
    <div class="pt-2 px-3 pb-2 md:p-6 flex flex-col justify-between grow min-w-0">
      <div class="flex flex-col gap-1 md:gap-0">
        <div class="flex justify-between items-start md:mb-2">
          <h3 class="text-sm md:text-lg font-bold text-zinc-900 dark:text-zinc-100 line-clamp-1">
            {{ restaurant.name }}
          </h3>
        </div>

        <div class="flex items-center gap-1 text-zinc-500 text-xs md:text-sm md:mb-3">
          <MapPin :size="10" class="md:hidden" />
          <MapPin :size="14" class="hidden md:block" />
          <span class="line-clamp-1">{{ displayAddress }}</span>
        </div>

        <div class="flex flex-wrap gap-1 md:gap-2">
          <span
            v-for="tag in restaurant.tags.slice(0, 3)"
            :key="tag"
            class="px-1.5 py-0.5 md:px-2 md:py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] md:text-xs rounded md:rounded-md"
          >
            #{{ tag }}
          </span>
        </div>
      </div>

      <div
        class="flex items-center justify-between mt-2 pt-2 md:mt-2 md:pt-3 border-t border-zinc-100 dark:border-zinc-800"
      >
        <div class="flex items-center gap-2 md:gap-3 grow">
          <div
            class="text-xs md:text-sm font-medium text-zinc-900 dark:text-zinc-200 whitespace-nowrap"
          >
            ¥{{ restaurant.price }}
            <span class="text-zinc-400 text-[10px] md:text-xs font-normal">/人</span>
          </div>
          <RatingBadge :rating="restaurant.rating" class="scale-90 origin-left md:scale-100" />

          <span
            v-if="store.getDistance(restaurant)"
            class="text-xs text-zinc-500 dark:text-zinc-400 font-medium md:ml-1 ml-auto md:ml-0 whitespace-nowrap"
          >
            {{ store.getDistance(restaurant) }}
          </span>
        </div>
        <button
          class="hidden md:flex text-xs text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white items-center gap-1 transition-colors shrink-0"
        >
          查看详情 <ArrowRight :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>

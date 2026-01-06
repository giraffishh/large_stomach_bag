<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useRestaurantStore } from '@/stores/restaurants'
import { computed } from 'vue'
import { ArrowLeft, MapPin, ExternalLink } from 'lucide-vue-next'
import RatingBadge from '@/components/RatingBadge.vue'

const route = useRoute()
const router = useRouter()
const store = useRestaurantStore()

const restaurant = computed(() => {
  return store.restaurants.find(r => r.id === route.params.id)
})

const goBack = () => router.back()
</script>

<template>
  <div v-if="restaurant" class="min-h-screen bg-white dark:bg-zinc-900 pb-20">
    <!-- Hero Image -->
    <div class="relative h-64 md:h-96 w-full overflow-hidden">
      <img 
        :src="restaurant.coverUrl || restaurant.cover || 'https://placehold.co/800x600'" 
        class="w-full h-full object-cover"
        alt="Cover"
        v-motion
        :initial="{ scale: 1.1 }"
        :enter="{ scale: 1 }"
      />
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
      
      <button 
        @click="goBack"
        class="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors z-10"
      >
        <ArrowLeft :size="24" />
      </button>

      <div class="absolute bottom-0 left-0 right-0 p-6 text-white">
        <div class="max-w-4xl mx-auto">
          <div class="flex items-center gap-3 mb-2">
            <RatingBadge :rating="restaurant.rating" class="bg-white/20 backdrop-blur-md text-white border border-white/10 !text-sm !px-3 !py-1 scale-125 origin-left" />
            <span class="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-xs border border-white/10">
              ¥{{ restaurant.price }}/人
            </span>
          </div>
          <h1 class="text-3xl md:text-4xl font-bold mb-2 shadow-sm">{{ restaurant.name }}</h1>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="max-w-4xl mx-auto px-6 py-8">
      <div class="flex flex-wrap gap-2 mb-8">
        <span 
          v-for="tag in restaurant.tags" 
          :key="tag"
          class="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-sm rounded-full"
        >
          #{{ tag }}
        </span>
      </div>

      <div class="space-y-8">
        <!-- Review Section -->
        <section>
          <h2 class="text-xl font-bold mb-4 flex items-center gap-2">
            <span>我的评价</span>
          </h2>
          <div class="prose dark:prose-invert max-w-none bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl">
            <p class="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 leading-relaxed text-lg">
              {{ restaurant.review || '暂无详细评价...' }}
            </p>
          </div>
        </section>

        <!-- Info Section -->
        <section class="grid grid-cols-1 gap-6">
          <div class="bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <div class="flex items-center gap-3 mb-2 text-zinc-400 text-sm font-medium uppercase tracking-wider">
              <MapPin :size="16" /> 地址
            </div>
            <p class="text-zinc-900 dark:text-zinc-100 font-medium mb-2">{{ restaurant.address }}</p>
            <a 
              v-if="restaurant.address && restaurant.address.startsWith('http')"
              :href="restaurant.address" 
              target="_blank"
              class="text-indigo-600 text-sm flex items-center gap-1 hover:underline"
            >
              在地图中查看 <ExternalLink :size="12" />
            </a>
          </div>
        </section>
      </div>
    </div>
  </div>
  <div v-else class="flex items-center justify-center min-h-screen">
    <p>Loading...</p>
  </div>
</template>

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
  return store.restaurants.find((r) => r.id === route.params.id)
})

const displayAddress = computed(() => {
  if (!restaurant.value) return ''
  const addr = restaurant.value.address || ''
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

  // Fallback: If no match, return original but try to strip URL if present
  if (endIndex !== -1) {
    return addr.substring(0, endIndex).trim()
  }
  return addr
})

const mapUrl = computed(() => {
  if (!restaurant.value?.address) return ''
  const match = restaurant.value.address.match(/(https?:\/\/[^\s]+)/)
  return match ? match[0] : ''
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
      <div
        class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
      ></div>

            <button

              @click="goBack"

              class="absolute top-4 left-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/20 hover:bg-black/50 transition-colors z-10"

            >

              <ArrowLeft :size="20" class="md:hidden" />

              <ArrowLeft :size="24" class="hidden md:block" />

            </button>

      

            <div class="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-white">

              <div class="max-w-4xl mx-auto">

                <h1 class="text-xl md:text-4xl font-bold mb-2 shadow-sm leading-tight">{{ restaurant.name }}</h1>

              </div>

            </div>

          </div>

      

              <!-- Content -->

      

              <div class="max-w-4xl mx-auto px-4 md:px-6 py-5 md:py-8">

      

                <div class="flex items-center gap-2 mb-4">

      

                  <RatingBadge 

      

                    :rating="restaurant.rating" 

      

                    class="!text-sm !px-2.5 md:!px-3 !py-1 md:!py-1.5" 

      

                  />

      

                  <span class="flex items-center px-2.5 md:px-3 py-1 md:py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-medium">

      

                    ¥{{ restaurant.price }}/人

      

                  </span>

      

                </div>

      

          

      

                <div class="flex flex-wrap gap-1.5 mb-6 md:mb-8">

      

                  <span 

      

                    v-for="tag in restaurant.tags" 

      

                    :key="tag"

      

                    class="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-sm rounded-full"

      

                  >

      

                    #{{ tag }}

      

                  </span>

      

                </div>

      

          

      

                <div class="space-y-5 md:space-y-8">

      

                  <!-- Review Section -->

      

                  <section>

      

                    <h2

      

                      class="text-lg md:text-xl font-bold mb-3 flex items-center gap-2 text-zinc-900 dark:text-zinc-100"

      

                    >

      

                      <span>简评</span>

      

                    </h2>

      

                    <div

      

                      class="prose dark:prose-invert max-w-none bg-zinc-50 dark:bg-zinc-800/50 p-4 md:p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800/50"

      

                    >

      

                      <p

      

                        class="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm md:text-lg"

      

                      >

      

                        {{ restaurant.review || '暂无详细评价...' }}

      

                      </p>

      

                    </div>

      

                  </section>

      

                      <!-- Info Section -->

      

                      <section class="grid grid-cols-1 gap-6">

      

                        <div

      

                          class="bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800"

      

                        >

      

                                      <div

      

                                        class="flex items-center gap-2 mb-3 text-zinc-900 dark:text-zinc-100 text-sm md:text-lg font-bold"

      

                                      >

      

                                        <MapPin :size="16" class="md:hidden" />

      

                                        <MapPin :size="20" class="hidden md:block" /> 地址

      

                                      </div>

      

                          <p

      

                            class="text-zinc-900 dark:text-zinc-100 font-medium mb-3 text-xs md:text-base leading-relaxed"

      

                          >

      

                            {{ displayAddress }}

      

                          </p>

                  <a

                    v-if="mapUrl"

                    :href="mapUrl"

                    target="_blank"

                    class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs font-medium rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"

                  >

                    在大众点评查看 <ExternalLink :size="12" />

                  </a>

                </div>

              </section>

            </div>

          </div>
  </div>
  <div v-else class="flex flex-col items-center justify-center min-h-screen text-zinc-400 gap-4">
    <p class="text-lg">未找到餐厅信息</p>
    <button
      @click="goBack"
      class="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg text-sm"
    >
      返回列表
    </button>
  </div>
</template>

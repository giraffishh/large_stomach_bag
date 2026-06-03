<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRestaurantStore } from '@/stores/restaurants'
import { ArrowLeft, MapPin, ExternalLink, FileText } from 'lucide-vue-next'
import RatingBadge from '@/components/RatingBadge.vue'
import TwikooComments from '@/components/TwikooComments.vue'
import { useImageFallback } from '@/composables/useImageFallback'
import { extractMapUrl, getDisplayAddress, getRestaurantImageSources } from '@/utils/restaurant'

const route = useRoute()
const router = useRouter()
const store = useRestaurantStore()

const restaurant = computed(() => {
  return store.restaurants.find((r) => r.id === route.params.id)
})

const displayAddress = computed(() => {
  if (!restaurant.value) return ''
  return getDisplayAddress(restaurant.value)
})

const mapUrl = computed(() => {
  return extractMapUrl(restaurant.value?.shareLink)
})

const commentPath = computed(() => {
  if (!restaurant.value) return ''
  return `/restaurant/${restaurant.value.id}`
})

const imagePlaceholder = 'https://placehold.co/800x600?text=No+Image'
const { imageSrc, handleImageError } = useImageFallback(() =>
  getRestaurantImageSources(restaurant.value, imagePlaceholder),
)

onMounted(() => {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
})

const goBack = () => {
  const back = window.history.state?.back

  if (typeof back === 'string' && back.startsWith('/')) {
    router.replace(back)
    return
  }

  router.replace('/home')
}
</script>

<template>
  <div v-if="restaurant" class="min-h-screen bg-stone-100 dark:bg-zinc-900 pb-20">
    <!-- Hero Image -->
    <div class="relative h-64 md:h-96 w-full overflow-hidden">
      <img
        :src="imageSrc"
        class="theme-dimmable-image detail-hero-image w-full h-full object-cover"
        :alt="`${restaurant.name} 封面图片`"
        fetchpriority="high"
        decoding="async"
        @error="handleImageError"
      />
      <div
        class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
      ></div>

      <button
        @click="goBack"
        class="absolute top-4 left-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/20 hover:bg-black/50 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/50 transition-colors z-10"
        aria-label="返回上一页"
      >
        <ArrowLeft :size="20" class="md:hidden" />
        <ArrowLeft :size="24" class="hidden md:block" />
      </button>

      <div class="absolute bottom-0 left-0 right-0 p-4 md:p-6 text-white">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-xl md:text-4xl font-bold mb-2 shadow-sm leading-tight">
            {{ restaurant.name }}
          </h1>
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

        <span
          class="flex items-center px-2.5 md:px-3 py-1 md:py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-medium"
        >
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

        <section
          class="bg-white/90 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 px-4 py-4 md:px-6 md:py-6 shadow-sm"
        >
          <div class="flex items-center gap-2 mb-4 text-zinc-900 dark:text-zinc-100">
            <FileText :size="16" class="md:hidden" />
            <FileText :size="20" class="hidden md:block" />
            <h2 class="text-lg md:text-xl font-bold">简评</h2>
          </div>
          <div
            class="prose dark:prose-invert max-w-none bg-zinc-50 dark:bg-zinc-900/40 p-4 md:p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/70"
          >
            <p
              class="whitespace-pre-wrap text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm md:text-base"
            >
              {{ restaurant.review || '暂无详细评价...' }}
            </p>
          </div>
        </section>

        <!-- Info Section -->

        <section
          class="bg-white/90 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 px-4 py-4 md:px-6 md:py-6 shadow-sm"
        >
          <div class="flex items-center gap-2 mb-4 text-zinc-900 dark:text-zinc-100">
            <MapPin :size="16" class="md:hidden" />
            <MapPin :size="20" class="hidden md:block" />
            <h2 class="text-lg md:text-xl font-bold">地址</h2>
          </div>

          <div
            class="bg-zinc-50 dark:bg-zinc-900/40 p-4 md:p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800/70"
          >
            <p
              class="text-zinc-900 dark:text-zinc-100 font-medium mb-4 text-sm md:text-base leading-relaxed"
            >
              {{ displayAddress }}
            </p>

            <a
              v-if="mapUrl"
              :href="mapUrl"
              target="_blank"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#fff3e8] dark:bg-[#4a2402] text-[#ff6a00] dark:text-[#ff9a4d] text-xs font-medium rounded-lg hover:bg-[#ffe7d1] dark:hover:bg-[#5a2c03] transition-colors"
            >
              在大众点评查看 <ExternalLink :size="12" />
            </a>
          </div>
        </section>

        <TwikooComments :path="commentPath" />
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

<style scoped>
.detail-hero-image {
  animation: detail-hero-settle 520ms cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes detail-hero-settle {
  from {
    transform: scale(1.06);
  }
  to {
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .detail-hero-image {
    animation: none;
  }
}
</style>

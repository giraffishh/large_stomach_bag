<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  Building2,
  ChartColumn,
  Hash,
  MapPinned,
  Tags,
  Wallet,
} from 'lucide-vue-next'
import { useRestaurantStore } from '@/stores/restaurants'
import RatingBadge from '@/components/RatingBadge.vue'
import { formatCityLabel } from '@/utils/city'

type StatRow = {
  label: string
  value: number
  ratio: number
}

type PriceCurvePoint = {
  x: number
  y: number
  price: number
  count: number
}

const router = useRouter()
const store = useRestaurantStore()
const ratingDisplayOrder = ['夯', '人上人', 'npc', '拉完了'] as const
const targetCollectionCount = 100

const currentRestaurants = computed(() => store.restaurants)

const averagePrice = computed(() => {
  if (currentRestaurants.value.length === 0) return 0
  return Math.round(
    currentRestaurants.value.reduce((sum, restaurant) => sum + restaurant.price, 0) /
      currentRestaurants.value.length,
  )
})

const medianPrice = computed(() => {
  if (currentRestaurants.value.length === 0) return 0

  const prices = currentRestaurants.value
    .map((restaurant) => restaurant.price)
    .sort((a, b) => a - b)
  const middle = Math.floor(prices.length / 2)

  if (prices.length % 2 === 0) {
    return Math.round((prices[middle - 1]! + prices[middle]!) / 2)
  }

  return prices[middle] || 0
})

const cityBreakdown = computed<StatRow[]>(() => {
  return buildBreakdown(
    currentRestaurants.value.map((restaurant) => formatCityLabel(restaurant.city)),
    currentRestaurants.value.length,
  ).slice(0, 6)
})

const ratingBreakdown = computed<StatRow[]>(() => {
  const total = currentRestaurants.value.length
  const counter = new Map<string, number>()

  currentRestaurants.value.forEach((restaurant) => {
    counter.set(restaurant.rating, (counter.get(restaurant.rating) || 0) + 1)
  })

  return ratingDisplayOrder.map((label) => {
    const value = counter.get(label) || 0

    return {
      label,
      value,
      ratio: total === 0 ? 0 : value / total,
    }
  })
})

const topTags = computed<StatRow[]>(() => {
  return buildBreakdown(
    currentRestaurants.value.flatMap((restaurant) => restaurant.tags),
    currentRestaurants.value.length,
  ).slice(0, 15)
})

const topCity = computed(() => cityBreakdown.value[0]?.label || '暂无')
const topCityCount = computed(() => cityBreakdown.value[0]?.value || 0)
const topTag = computed(() => topTags.value[0]?.label || '暂无')
const topTagCount = computed(() => topTags.value[0]?.value || 0)

const priceCurve = computed(() => {
  if (currentRestaurants.value.length === 0) {
    return null
  }

  const prices = currentRestaurants.value
    .map((restaurant) => restaurant.price)
    .filter((price) => Number.isFinite(price))
    .sort((a, b) => a - b)

  if (prices.length === 0) {
    return null
  }

  const maxPrice = prices[prices.length - 1] || 0
  const domainMin = 0
  const domainMax = Math.max(180, Math.ceil(maxPrice / 10) * 10)
  const range = Math.max(domainMax - domainMin, 1)
  const binCount = Math.min(24, Math.max(16, Math.round(Math.sqrt(prices.length) * 2.8)))
  const step = range / binCount
  const bins = Array.from({ length: binCount }, (_, index) => ({
    start: domainMin + step * index,
    end: index === binCount - 1 ? domainMax : domainMin + step * (index + 1),
    count: 0,
  }))

  prices.forEach((price) => {
    const rawIndex = Math.floor(((price - domainMin) / range) * binCount)
    const index = Math.min(binCount - 1, Math.max(0, rawIndex))
    const bin = bins[index]

    if (bin) {
      bin.count += 1
    }
  })

  const width = 480
  const height = 196
  const paddingX = 16
  const paddingTop = 36
  const paddingBottom = 28
  const innerWidth = width - paddingX * 2
  const innerHeight = height - paddingTop - paddingBottom
  const maxCount = Math.max(...bins.map((bin) => bin.count), 1)

  const points = bins.map<PriceCurvePoint>((bin, index) => {
    const midpoint = bin.start + (bin.end - bin.start) / 2
    const progress = binCount === 1 ? 0.5 : index / (binCount - 1)
    const x = paddingX + innerWidth * progress
    const y = paddingTop + innerHeight * (1 - bin.count / maxCount)

    return {
      x,
      y,
      price: Math.round(midpoint),
      count: bin.count,
    }
  })

  const linePath = buildSmoothPath(points)
  const areaPath = `${linePath} L ${points[points.length - 1]?.x || paddingX} ${height - paddingBottom} L ${points[0]?.x || paddingX} ${height - paddingBottom} Z`
  const averageProgress = range === 0 ? 0.5 : (averagePrice.value - domainMin) / range
  const averageX = paddingX + innerWidth * Math.min(1, Math.max(0, averageProgress))
  const averageLabelWidth = 74
  const averageLabelX = Math.min(
    width - paddingX - averageLabelWidth / 2,
    Math.max(paddingX + averageLabelWidth / 2, averageX),
  )
  const priceToX = (price: number) => paddingX + innerWidth * ((price - domainMin) / range)
  const axisLabels = Array.from({ length: Math.floor(domainMax / 30) + 1 }, (_, index) => {
    const price = index * 30

    return {
      label: `¥${price}`,
      x: priceToX(price),
      align: index === 0 ? 'start' : price === domainMax ? 'end' : 'middle',
    } as const
  })

  return {
    width,
    height,
    baselineY: height - paddingBottom,
    averageX,
    averageLabelWidth,
    averageLabelX,
    points,
    linePath,
    areaPath,
    axisLabels,
  }
})

const goBack = () => {
  const back = window.history.state?.back

  if (typeof back === 'string' && back.startsWith('/')) {
    router.replace(back)
    return
  }

  router.replace('/home')
}

function buildSmoothPath(points: PriceCurvePoint[]): string {
  if (points.length === 0) {
    return ''
  }

  const firstPoint = points[0]!

  if (points.length === 1) {
    return `M ${firstPoint.x} ${firstPoint.y}`
  }

  let path = `M ${firstPoint.x} ${firstPoint.y}`

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)]!
    const current = points[index]!
    const next = points[index + 1]!
    const nextNext = points[Math.min(points.length - 1, index + 2)]!

    const controlPoint1X = current.x + (next.x - previous.x) / 6
    const controlPoint1Y = current.y + (next.y - previous.y) / 6
    const controlPoint2X = next.x - (nextNext.x - current.x) / 6
    const controlPoint2Y = next.y - (nextNext.y - current.y) / 6

    path += ` C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${next.x} ${next.y}`
  }

  return path
}

function buildBreakdown(items: string[], total: number): StatRow[] {
  const counter = new Map<string, number>()

  items.forEach((item) => {
    if (!item) return
    counter.set(item, (counter.get(item) || 0) + 1)
  })

  return Array.from(counter.entries())
    .map(([label, value]) => ({
      label,
      value,
      ratio: total === 0 ? 0 : value / total,
    }))
    .sort((a, b) => b.value - a.value)
}
</script>

<template>
  <main class="min-h-screen bg-stone-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
    <header
      class="sticky top-0 z-30 bg-stone-100/92 dark:bg-zinc-950/88 backdrop-blur-md border-b border-stone-200 dark:border-zinc-800"
    >
      <div class="max-w-5xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between gap-3">
          <button
            @click="goBack"
            class="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            aria-label="返回主页"
          >
            <ArrowLeft :size="16" />
            <span>返回</span>
          </button>

          <div class="flex items-center gap-2 rounded-xl bg-white/80 dark:bg-zinc-900/80 px-3 py-2 border border-zinc-200 dark:border-zinc-800">
            <ChartColumn :size="16" class="text-orange-500" />
            <span class="text-sm font-semibold">统计</span>
          </div>
        </div>
      </div>
    </header>

    <section class="max-w-5xl mx-auto px-4 py-4 md:py-6 space-y-4 md:space-y-5">
      <div>
        <h1 class="text-2xl md:text-3xl font-bold tracking-tight">如何拥有大胃袋...</h1>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <article class="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80 p-4">
          <div class="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span class="text-xs font-medium">餐厅数量</span>
            <Building2 :size="16" />
          </div>
          <div class="mt-3 text-2xl font-bold">{{ currentRestaurants.length }}</div>
          <div class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            目标收录 {{ currentRestaurants.length }}/{{ targetCollectionCount }}
          </div>
        </article>

        <article class="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80 p-4">
          <div class="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span class="text-xs font-medium">平均人均</span>
            <Wallet :size="16" />
          </div>
          <div class="mt-3 text-2xl font-bold">¥{{ averagePrice }}</div>
          <div class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">中位数 ¥{{ medianPrice }}</div>
        </article>

        <article class="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80 p-4">
          <div class="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span class="text-xs font-medium">最多城市</span>
            <MapPinned :size="16" />
          </div>
          <div class="mt-3 text-xl font-bold leading-tight">{{ topCity }}</div>
          <div class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">收录了{{ topCityCount }} 家</div>
        </article>

        <article class="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80 p-4">
          <div class="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span class="text-xs font-medium">热门标签</span>
            <Tags :size="16" />
          </div>
          <div class="mt-3 text-xl font-bold leading-tight">#{{ topTag }}</div>
          <div class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">出现{{ topTagCount }} 次</div>
        </article>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-[1.1fr_0.9fr] gap-4">
        <section class="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80 p-4 md:p-5">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-base md:text-lg font-bold">评分分布</h2>
            <span class="text-xs text-zinc-500 dark:text-zinc-400">全部餐厅</span>
          </div>

          <div v-if="ratingBreakdown.length > 0" class="mt-4 space-y-3">
            <div
              v-for="row in ratingBreakdown"
              :key="row.label"
              class="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 dark:bg-zinc-950/70 px-3 py-2.5 border border-stone-200 dark:border-zinc-800"
            >
              <RatingBadge :rating="row.label" class="!text-[13px] !font-bold !px-3 !py-1.5" />
              <div class="text-right">
                <div class="text-sm font-semibold">{{ row.value }} 家</div>
                <div class="text-xs text-zinc-500 dark:text-zinc-400">
                  {{ Math.round(row.ratio * 100) }}%
                </div>
              </div>
            </div>
          </div>

          <div v-else class="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
            当前没有可展示的数据。
          </div>
        </section>

        <section class="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80 p-4 md:p-5">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-base md:text-lg font-bold">城市分布</h2>
            <span class="text-xs text-zinc-500 dark:text-zinc-400">全部餐厅</span>
          </div>

          <div v-if="cityBreakdown.length > 0" class="mt-4 space-y-3">
            <div v-for="row in cityBreakdown" :key="row.label" class="space-y-1.5">
              <div class="flex items-center justify-between gap-3 text-sm">
                <span class="font-medium">{{ row.label }}</span>
                <span class="text-zinc-500 dark:text-zinc-400">{{ row.value }}</span>
              </div>
              <div class="h-2 rounded-full bg-stone-200 dark:bg-zinc-800 overflow-hidden">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-orange-400 via-amber-400 to-lime-400"
                  :style="{ width: `${Math.max(row.ratio * 100, 6)}%` }"
                />
              </div>
            </div>
          </div>

          <div v-else class="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
            当前没有可展示的数据。
          </div>
        </section>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-[0.95fr_1.05fr] gap-4">
        <section class="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80 p-4 md:p-5">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-base md:text-lg font-bold">价格带</h2>
            <span class="text-xs text-zinc-500 dark:text-zinc-400">价格横轴分布</span>
          </div>

          <div v-if="priceCurve" class="mt-4">
            <div class="rounded-2xl bg-stone-50 dark:bg-zinc-950/70 border border-stone-200 dark:border-zinc-800 p-3 overflow-x-auto custom-scrollbar">
              <svg
                class="block h-auto max-w-none"
                :viewBox="`0 0 ${priceCurve.width} ${priceCurve.height}`"
                :style="{ width: `${priceCurve.width}px` }"
                role="img"
                aria-label="餐厅价格分布曲线"
              >
                <defs>
                  <linearGradient id="price-area-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35" />
                    <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.03" />
                  </linearGradient>
                </defs>
                <line
                  :x1="priceCurve.points[0]?.x || 0"
                  :y1="priceCurve.baselineY"
                  :x2="priceCurve.points[priceCurve.points.length - 1]?.x || 0"
                  :y2="priceCurve.baselineY"
                  stroke="currentColor"
                  stroke-opacity="0.12"
                />
                <line
                  :x1="priceCurve.averageX"
                  y1="26"
                  :x2="priceCurve.averageX"
                  :y2="priceCurve.baselineY"
                  stroke="#f97316"
                  stroke-width="2"
                  stroke-dasharray="4 4"
                  stroke-linecap="round"
                  stroke-opacity="0.9"
                />
                <path :d="priceCurve.areaPath" fill="url(#price-area-gradient)" />
                <path
                  :d="priceCurve.linePath"
                  fill="none"
                  stroke="#38bdf8"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <rect
                  :x="priceCurve.averageLabelX - priceCurve.averageLabelWidth / 2"
                  y="4"
                  :width="priceCurve.averageLabelWidth"
                  height="18"
                  rx="8"
                  fill="#fff7ed"
                  fill-opacity="0.95"
                />
                <text
                  :x="priceCurve.averageLabelX"
                  y="17"
                  text-anchor="middle"
                  font-size="10"
                  fill="#c2410c"
                  font-weight="700"
                >
                  均价 ¥{{ averagePrice }}
                </text>
                <text
                  v-for="label in priceCurve.axisLabels"
                  :key="label.label"
                  :x="label.x"
                  :y="priceCurve.height - 8"
                  :text-anchor="label.align"
                  font-size="11"
                  fill="currentColor"
                  fill-opacity="0.5"
                >
                  {{ label.label }}
                </text>
              </svg>
            </div>
          </div>

          <div v-else class="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
            当前没有可展示的数据。
          </div>
        </section>

        <section class="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/80 p-4 md:p-5">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-base md:text-lg font-bold">标签热度</h2>
            <span class="text-xs text-zinc-500 dark:text-zinc-400">出现次数前 15</span>
          </div>

          <div v-if="topTags.length > 0" class="mt-4 flex flex-wrap gap-2">
            <div
              v-for="tag in topTags"
              :key="tag.label"
              class="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-950/70 px-2.5 py-1.5 text-[13px]"
            >
              <Hash :size="13" class="text-orange-500" />
              <span class="font-medium">{{ tag.label }}</span>
              <span class="text-zinc-500 dark:text-zinc-400">{{ tag.value }}</span>
            </div>
          </div>

          <div v-else class="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
            当前没有可展示的数据。
          </div>
        </section>
      </div>
    </section>
  </main>
</template>

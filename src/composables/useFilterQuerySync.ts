import { watch } from 'vue'
import { storeToRefs } from 'pinia'
import {
  useRoute,
  useRouter,
  type LocationQuery,
  type LocationQueryRaw,
  type LocationQueryValue,
} from 'vue-router'
import { useRestaurantStore } from '@/stores/restaurants'
import { normalizeCityName } from '@/utils/city'

type PriceRange = {
  min: number
  max: number
}

const FILTER_QUERY_KEYS = ['q', 'city', 'tag', 'rating', 'price'] as const

export function useFilterQuerySync() {
  const route = useRoute()
  const router = useRouter()
  const store = useRestaurantStore()
  const { priceRanges, searchQuery, selectedCities, selectedRatings, selectedTags } =
    storeToRefs(store)

  let isApplyingRouteQuery = false

  watch(
    () => route.query,
    (query) => {
      const nextSearchQuery = normalizeStringList(query.q).join(' ').trim()
      const nextCities = normalizeStringList(query.city).map(normalizeCityName).filter(Boolean)
      const nextTags = normalizeStringList(query.tag)
      const nextRatings = normalizeStringList(query.rating)
      const nextPriceRanges = normalizePriceRanges(query.price)

      if (
        searchQuery.value === nextSearchQuery &&
        areStringListsEqual(selectedCities.value, nextCities) &&
        areStringListsEqual(selectedTags.value, nextTags) &&
        areStringListsEqual(selectedRatings.value, nextRatings) &&
        arePriceRangesEqual(priceRanges.value, nextPriceRanges)
      ) {
        return
      }

      isApplyingRouteQuery = true
      searchQuery.value = nextSearchQuery
      selectedCities.value = nextCities
      selectedTags.value = nextTags
      selectedRatings.value = nextRatings
      priceRanges.value = nextPriceRanges
      isApplyingRouteQuery = false
    },
    { immediate: true },
  )

  watch(
    [searchQuery, selectedCities, selectedTags, selectedRatings, priceRanges],
    async () => {
      if (isApplyingRouteQuery) {
        return
      }

      const nextQuery: LocationQueryRaw = {
        ...omitManagedQuery(route.query),
        ...buildManagedQuery(
          searchQuery.value,
          selectedCities.value,
          selectedTags.value,
          selectedRatings.value,
          priceRanges.value,
        ),
      }

      const nextFullPath = router.resolve({ path: route.path, query: nextQuery }).fullPath
      if (nextFullPath === route.fullPath) {
        return
      }

      await router.replace({ path: route.path, query: nextQuery })
    },
    { deep: true },
  )
}

function buildManagedQuery(
  searchQuery: string,
  selectedCities: string[],
  selectedTags: string[],
  selectedRatings: string[],
  priceRanges: PriceRange[],
): LocationQueryRaw {
  const query: LocationQueryRaw = {}
  const normalizedSearchQuery = searchQuery.trim()
  const cities = dedupeStrings(selectedCities.map(normalizeCityName).filter(Boolean))
  const tags = dedupeStrings(selectedTags)
  const ratings = dedupeStrings(selectedRatings)
  const prices = dedupeStrings(priceRanges.map(serializePriceRange))

  if (normalizedSearchQuery) {
    query.q = normalizedSearchQuery
  }

  if (cities.length > 0) {
    query.city = cities
  }

  if (tags.length > 0) {
    query.tag = tags
  }

  if (ratings.length > 0) {
    query.rating = ratings
  }

  if (prices.length > 0) {
    query.price = prices
  }

  return query
}

function normalizeStringList(
  value: LocationQueryValue | LocationQueryValue[] | undefined,
): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : []

  return dedupeStrings(
    values
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean),
  )
}

function normalizePriceRanges(
  value: LocationQueryValue | LocationQueryValue[] | undefined,
): PriceRange[] {
  const values = Array.isArray(value) ? value : value ? [value] : []
  const parsed: PriceRange[] = []

  values.forEach((item) => {
    if (typeof item !== 'string') {
      return
    }

    const range = parsePriceRange(item)
    if (!range) {
      return
    }

    const hasSameRange = parsed.some(
      (existing) => existing.min === range.min && existing.max === range.max,
    )

    if (!hasSameRange) {
      parsed.push(range)
    }
  })

  return parsed
}

function parsePriceRange(value: string): PriceRange | null {
  const match = value.match(/^(\d+)-(\d+)$/)
  if (!match) {
    return null
  }

  const min = Number(match[1])
  const max = Number(match[2])

  if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
    return null
  }

  return { min, max }
}

function serializePriceRange(range: PriceRange): string {
  return `${range.min}-${range.max}`
}

function omitManagedQuery(query: LocationQuery): LocationQueryRaw {
  const nextQuery: LocationQueryRaw = {}

  Object.entries(query).forEach(([key, value]) => {
    if (FILTER_QUERY_KEYS.includes(key as (typeof FILTER_QUERY_KEYS)[number])) {
      return
    }

    nextQuery[key] = value
  })

  return nextQuery
}

function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values))
}

function areStringListsEqual(current: string[], next: string[]): boolean {
  if (current.length !== next.length) {
    return false
  }

  return current.every((value, index) => value === next[index])
}

function arePriceRangesEqual(current: PriceRange[], next: PriceRange[]): boolean {
  if (current.length !== next.length) {
    return false
  }

  return current.every(
    (range, index) => range.min === next[index]?.min && range.max === next[index]?.max,
  )
}

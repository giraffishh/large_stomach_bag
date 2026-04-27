import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRestaurantStore } from '@/stores/restaurants'
import { formatCityLabel, isSameCity, normalizeCityName } from '@/utils/city'

export type PriceRange = {
  min: number
  max: number
}

export type SelectedRestaurantFilter = {
  type: 'city' | 'rating' | 'price' | 'tag'
  value: string | PriceRange
  label: string
}

export const ratings = ['夯', '人上人', 'npc', '拉完了']

export const priceOptions = [
  { label: '0-30', value: { min: 0, max: 30 } },
  { label: '30-60', value: { min: 30, max: 60 } },
  { label: '60-90', value: { min: 60, max: 90 } },
  { label: '90-150', value: { min: 90, max: 150 } },
  { label: '150+', value: { min: 150, max: 99999 } },
]

export function useRestaurantFilters() {
  const store = useRestaurantStore()
  const { selectedCities, selectedTags, selectedRatings, priceRanges } = storeToRefs(store)

  const toggleCity = (city: string) => {
    const cityKey = normalizeCityName(city)
    const index = selectedCities.value.findIndex((selectedCity) => isSameCity(selectedCity, cityKey))

    if (index !== -1) {
      selectedCities.value.splice(index, 1)
    } else {
      selectedCities.value.push(city)
    }
  }

  const toggleTag = (tag: string) => {
    if (selectedTags.value.includes(tag)) {
      selectedTags.value = selectedTags.value.filter((t) => t !== tag)
    } else {
      selectedTags.value.push(tag)
    }
  }

  const toggleRating = (rating: string) => {
    if (selectedRatings.value.includes(rating)) {
      selectedRatings.value = selectedRatings.value.filter((r) => r !== rating)
    } else {
      selectedRatings.value.push(rating)
    }
  }

  const togglePriceRange = (range: PriceRange) => {
    const index = priceRanges.value.findIndex((r) => r.min === range.min && r.max === range.max)
    if (index !== -1) {
      priceRanges.value.splice(index, 1)
    } else {
      priceRanges.value.push(range)
    }
  }

  const setCustomPrice = (minInput: string, maxInput: string) => {
    const min = parseInt(minInput)
    const max = parseInt(maxInput)

    if (Number.isNaN(min) && Number.isNaN(max)) return

    priceRanges.value = [
      {
        min: Number.isNaN(min) ? 0 : min,
        max: Number.isNaN(max) ? 99999 : max,
      },
    ]
  }

  const clearAllFilters = () => {
    selectedCities.value = []
    selectedTags.value = []
    selectedRatings.value = []
    priceRanges.value = []
  }

  const allSelectedFilters = computed<SelectedRestaurantFilter[]>(() => {
    const filters: SelectedRestaurantFilter[] = []

    selectedCities.value.forEach((city) => {
      filters.push({ type: 'city', value: city, label: formatCityLabel(city) })
    })

    selectedRatings.value.forEach((rating) => {
      filters.push({ type: 'rating', value: rating, label: rating })
    })

    priceRanges.value.forEach((range) => {
      filters.push({
        type: 'price',
        value: range,
        label: `¥${range.min}-${range.max >= 99999 ? '∞' : range.max}`,
      })
    })

    selectedTags.value.forEach((tag) => {
      filters.push({ type: 'tag', value: tag, label: `#${tag}` })
    })

    return filters
  })

  const removeFilter = (filter: SelectedRestaurantFilter) => {
    if (filter.type === 'city') {
      toggleCity(filter.value as string)
    } else if (filter.type === 'rating') {
      toggleRating(filter.value as string)
    } else if (filter.type === 'price') {
      togglePriceRange(filter.value as PriceRange)
    } else if (filter.type === 'tag') {
      toggleTag(filter.value as string)
    }
  }

  return {
    ratings,
    priceOptions,
    allSelectedFilters,
    toggleCity,
    toggleTag,
    toggleRating,
    togglePriceRange,
    setCustomPrice,
    removeFilter,
    clearAllFilters,
  }
}

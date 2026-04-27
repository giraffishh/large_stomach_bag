// src/stores/restaurants.ts
import { defineStore } from 'pinia'
import { ref, computed, shallowRef } from 'vue'
import restaurantData from '@/data/restaurants.json'
import { isSameCity, normalizeCityName } from '@/utils/city'

export interface Restaurant {
  id: string
  name: string
  cover: string
  coverUrl: string
  tags: string[]
  rating: string
  shareLink: string
  review: string
  price: number
  lastEdited: string
  longitude: number | null
  latitude: number | null
  location: string
  city: string
  date?: string
}

export const useRestaurantStore = defineStore('restaurants', () => {
  const restaurants = shallowRef<Restaurant[]>(restaurantData as Restaurant[])
  const searchQuery = ref('')
  const selectedCities = ref<string[]>([])
  const selectedTags = ref<string[]>([])
  const selectedRatings = ref<string[]>([])
  const priceRanges = ref<{ min: number; max: number }[]>([])
  const userLocation = ref<{ lat: number; lng: number } | null>(null)
  const userCity = ref<string>('')
  const sortBy = ref<'default' | 'distance' | 'rating' | 'price_asc' | 'price_desc'>('default')
  const isMapView = ref(false)
  const mapState = ref<{ center: [number, number]; zoom: number } | null>(null)

  const setUserLocation = (lat: number, lng: number) => {
    userLocation.value = { lat, lng }
  }

  const setUserCity = (city: string) => {
    userCity.value = city
  }

  const setMapState = (center: [number, number], zoom: number) => {
    mapState.value = { center, zoom }
  }

  const distanceLabels = computed(() => {
    if (!userLocation.value) {
      return new Map<string, string>()
    }

    const labels = new Map<string, string>()

    restaurants.value.forEach((restaurant) => {
      if (!restaurant.latitude || !restaurant.longitude) {
        return
      }

      const dist = calculateDistance(
        userLocation.value!.lat,
        userLocation.value!.lng,
        restaurant.latitude,
        restaurant.longitude,
      )

      labels.set(restaurant.id, formatDistance(dist))
    })

    return labels
  })

  const getDistance = (restaurant: Restaurant): string | null => {
    return distanceLabels.value.get(restaurant.id) || null
  }

  // Extract all unique tags
  const allTags = computed(() => {
    const tags = new Set<string>()
    restaurants.value.forEach((r) => r.tags.forEach((t) => tags.add(t)))
    return Array.from(tags)
  })

  const allCities = computed(() => {
    const seen = new Set<string>()

    return restaurants.value
      .map((restaurant) => restaurant.city)
      .filter((city) => {
        const normalizedCity = normalizeCityName(city)
        if (!normalizedCity || seen.has(normalizedCity)) {
          return false
        }

        seen.add(normalizedCity)
        return true
      })
  })

  const ratingOrder: { [key: string]: number } = {
    夯: 4,
    人上人: 3,
    npc: 2,
    拉完了: 1,
  }

  const filteredRestaurants = computed(() => {
    let filtered = restaurants.value.filter((r) => {
      const q = searchQuery.value.toLowerCase()
      const matchesSearch =
        r.name.toLowerCase().includes(q) ||
        r.review.toLowerCase().includes(q) ||
        r.shareLink.toLowerCase().includes(q)

      const matchesCity =
        selectedCities.value.length === 0 ||
        selectedCities.value.some((city) => isSameCity(r.city, city))

      const matchesTags =
        selectedTags.value.length === 0 || selectedTags.value.some((tag) => r.tags.includes(tag))

      const matchesRating =
        selectedRatings.value.length === 0 || selectedRatings.value.includes(r.rating)

      const matchesPrice =
        priceRanges.value.length === 0 ||
        priceRanges.value.some((range) => r.price >= range.min && r.price <= range.max)

      return matchesSearch && matchesCity && matchesTags && matchesRating && matchesPrice
    })

    // Sorting logic
    switch (sortBy.value) {
      case 'default':
        // Sort by City Match first, then Tags/Date
        filtered = filtered.sort((a, b) => {
          // Level 1: City Match (only when no explicit city filter is active)
          if (userCity.value && selectedCities.value.length === 0) {
            const isCityA = isSameCity(a.city, userCity.value)
            const isCityB = isSameCity(b.city, userCity.value)
            if (isCityA && !isCityB) return -1
            if (!isCityA && isCityB) return 1
          }

          if (selectedTags.value.length > 0) {
            // Level 2: Tag Match
            const countA = a.tags.filter((t) => selectedTags.value.includes(t)).length
            const countB = b.tags.filter((t) => selectedTags.value.includes(t)).length
            if (countA !== countB) return countB - countA
          }

          // Level 3: Date (descending)
          const dateA = a.date ? new Date(a.date).getTime() : 0
          const dateB = b.date ? new Date(b.date).getTime() : 0
          return dateB - dateA
        })
        break
      case 'distance':
        if (userLocation.value) {
          filtered = filtered.sort((a, b) => {
            if (!a.latitude || !a.longitude) return 1
            if (!b.latitude || !b.longitude) return -1
            const distA = calculateDistance(
              userLocation.value!.lat,
              userLocation.value!.lng,
              a.latitude,
              a.longitude,
            )
            const distB = calculateDistance(
              userLocation.value!.lat,
              userLocation.value!.lng,
              b.latitude,
              b.longitude,
            )
            return distA - distB
          })
        }
        break
      case 'rating':
        filtered = filtered.sort(
          (a, b) => (ratingOrder[b.rating] || 0) - (ratingOrder[a.rating] || 0),
        )
        break
      case 'price_asc':
        filtered = filtered.sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        filtered = filtered.sort((a, b) => b.price - a.price)
        break
    }

    return filtered
  })

  return {
    restaurants,
    searchQuery,
    selectedCities,
    selectedTags,
    selectedRatings,
    priceRanges,
    userLocation,
    userCity,
    sortBy,
    isMapView,
    mapState,
    setUserLocation,
    setUserCity,
    setMapState,
    getDistance,
    allCities,
    allTags,
    filteredRestaurants,
  }
})

// Haversine formula to calculate distance in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180)
}

function formatDistance(distanceInKm: number): string {
  if (distanceInKm < 1) {
    return `${Math.round(distanceInKm * 1000)}m`
  }

  return `${distanceInKm.toFixed(1)}km`
}

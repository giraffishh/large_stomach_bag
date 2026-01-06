// src/stores/restaurants.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import restaurantData from '@/data/restaurants.json'

export interface Restaurant {
  id: string
  name: string
  cover: string
  coverUrl: string
  tags: string[]
  rating: string
  address: string
  review: string
  price: number
  lastEdited: string
}

export const useRestaurantStore = defineStore('restaurants', () => {
  const restaurants = ref<Restaurant[]>(restaurantData as Restaurant[])
  const searchQuery = ref('')
  const selectedTags = ref<string[]>([])
  const selectedRatings = ref<string[]>([])
  const priceRange = ref<{ min: number; max: number } | null>(null)

  // Extract all unique tags
  const allTags = computed(() => {
    const tags = new Set<string>()
    restaurants.value.forEach(r => r.tags.forEach(t => tags.add(t)))
    return Array.from(tags)
  })

  const filteredRestaurants = computed(() => {
    return restaurants.value.filter(r => {
      const q = searchQuery.value.toLowerCase()
      const matchesSearch = r.name.toLowerCase().includes(q) || 
                            r.review.toLowerCase().includes(q) ||
                            r.address.toLowerCase().includes(q)
      
      const matchesTags = selectedTags.value.length === 0 || 
                          selectedTags.value.every(tag => r.tags.includes(tag))
      
      const matchesRating = selectedRatings.value.length === 0 || 
                            selectedRatings.value.includes(r.rating)

      const matchesPrice = !priceRange.value || 
                           (r.price >= priceRange.value.min && r.price <= priceRange.value.max)

      return matchesSearch && matchesTags && matchesRating && matchesPrice
    })
  })

  return {
    restaurants,
    searchQuery,
    selectedTags,
    selectedRatings,
    priceRange,
    allTags,
    filteredRestaurants
  }
})

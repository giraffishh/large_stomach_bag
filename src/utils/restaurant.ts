import type { Restaurant } from '@/stores/restaurants'

type RestaurantLocationSource = Pick<Restaurant, 'location' | 'shareLink'>
type RestaurantImageSource = Pick<Restaurant, 'cover' | 'coverUrl'>

const URL_PATTERN = /https?:\/\/[^\s\])]+/

export function getDisplayAddress(restaurant: RestaurantLocationSource): string {
  if (restaurant.location) return restaurant.location

  const shareText = restaurant.shareLink || ''
  const priceMarker = '/人'
  const urlStartIndex = shareText.search(/https?:\/\//)
  const priceIndex = shareText.indexOf(priceMarker)

  if (priceIndex !== -1 && urlStartIndex !== -1 && urlStartIndex > priceIndex) {
    return shareText.slice(priceIndex + priceMarker.length, urlStartIndex).trim()
  }

  if (priceIndex !== -1) {
    return shareText.slice(priceIndex + priceMarker.length).replace(URL_PATTERN, '').trim()
  }

  if (urlStartIndex !== -1) {
    return shareText.slice(0, urlStartIndex).trim()
  }

  return shareText.trim()
}

export function extractMapUrl(text?: string): string {
  if (!text) return ''

  const match = text.match(URL_PATTERN)
  return match ? match[0] : ''
}

export function getRestaurantImageSources(
  restaurant: RestaurantImageSource | null | undefined,
  placeholder: string,
): string[] {
  return [...new Set([restaurant?.coverUrl || '', restaurant?.cover || '', placeholder].filter(Boolean))]
}

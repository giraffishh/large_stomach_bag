import { computed, ref, watch, type ComputedRef } from 'vue'

export function useImageFallback(getSources: () => string[]): {
  imageSrc: ComputedRef<string>
  imageCrossOrigin: ComputedRef<'anonymous' | undefined>
  handleImageError: () => void
} {
  const imageIndex = ref(0)
  const useCors = ref(true)
  const imageSources = computed(() => getSources().filter(Boolean))

  watch(
    imageSources,
    () => {
      imageIndex.value = 0
      useCors.value = true
    },
    { immediate: true },
  )

  const imageSrc = computed(() => imageSources.value[imageIndex.value] || '')
  const imageCrossOrigin = computed(() =>
    useCors.value && imageSrc.value.startsWith('https://cdn.giraffish.top/')
      ? 'anonymous'
      : undefined,
  )

  const handleImageError = () => {
    // A CDN may serve a valid image without CORS headers. Retry it as an image
    // before falling back; its opaque response is never persisted by Workbox.
    if (imageCrossOrigin.value) {
      useCors.value = false
      return
    }
    if (imageIndex.value < imageSources.value.length - 1) {
      imageIndex.value += 1
      useCors.value = true
    }
  }

  return {
    imageSrc,
    imageCrossOrigin,
    handleImageError,
  }
}

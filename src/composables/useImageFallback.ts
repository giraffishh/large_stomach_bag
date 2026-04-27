import { computed, ref, watch, type ComputedRef } from 'vue'

export function useImageFallback(getSources: () => string[]): {
  imageSrc: ComputedRef<string>
  handleImageError: () => void
} {
  const imageIndex = ref(0)
  const imageSources = computed(() => getSources().filter(Boolean))

  watch(
    imageSources,
    () => {
      imageIndex.value = 0
    },
    { immediate: true },
  )

  const imageSrc = computed(() => imageSources.value[imageIndex.value] || '')

  const handleImageError = () => {
    if (imageIndex.value < imageSources.value.length - 1) {
      imageIndex.value += 1
    }
  }

  return {
    imageSrc,
    handleImageError,
  }
}

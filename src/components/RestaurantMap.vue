<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef, watch, type WatchStopHandle } from 'vue'
import { useRouter } from 'vue-router'
import { useIdle, useDark } from '@vueuse/core'
import { Locate } from 'lucide-vue-next'
import { useRestaurantStore, type Restaurant } from '@/stores/restaurants'
import RestaurantCard from '@/components/RestaurantCard.vue'
import { useAMap } from '@/composables/useAMap'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const map = shallowRef<any>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cluster = shallowRef<any>(null)
const mapContainer = ref<HTMLElement | null>(null)
const timer = ref<ReturnType<typeof setInterval> | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const userPosition = ref<any>(null)
const selectedRestaurant = ref<Restaurant | null>(null)
const isCardInteractable = ref(false)
const hideMarkerLabels = ref(false)
const isMapLoading = ref(true)
const mapLoadError = ref('')
const stopHandles: WatchStopHandle[] = []

const router = useRouter()
const restaurantStore = useRestaurantStore()
const { initAMap } = useAMap()

const isDark = useDark()
const lightStyle = 'amap://styles/7bea9294d71af33c16de9b52c2a16db6'
const darkStyle = 'amap://styles/blue'
const markerLabelMinZoom = 11
const initialMapLoadTimeoutMs = 20000

// Detect user inactivity (5 minutes = 300000 ms)
const { idle } = useIdle(5 * 60 * 1000)

// Swipe to dismiss logic
const touchStartY = ref(0)
const cardTranslateY = ref(0)
const isDragging = ref(false)
let isDisposed = false
let hasInitialMapSettled = false

const handleTouchStart = (e: TouchEvent) => {
  if (e.touches.length > 0) {
    touchStartY.value = e.touches[0]!.clientY
    isDragging.value = true
  }
}

const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging.value || e.touches.length === 0) return
  const currentY = e.touches[0]!.clientY
  const deltaY = currentY - touchStartY.value

  // Allow both upward and downward dragging
  if (e.cancelable) e.preventDefault()
  cardTranslateY.value = deltaY
}

const handleTouchEnd = () => {
  isDragging.value = false

  if (cardTranslateY.value > 40) {
    // Swipe down to dismiss (higher sensitivity)
    selectedRestaurant.value = null
  } else if (cardTranslateY.value < -120 && selectedRestaurant.value) {
    // Swipe up to view details (lower sensitivity)
    router.push({ name: 'detail', params: { id: selectedRestaurant.value.id } })
  }

  // Reset position (animation will handle the snap back)
  cardTranslateY.value = 0
}

const handleMobileCardClick = (e: Event) => {
  if (!isCardInteractable.value) {
    e.stopPropagation()
    e.preventDefault()
  }
}

// Animation frame ID for cancellation
let animationFrameId: number | null = null

const registerStopHandle = (stopHandle: WatchStopHandle) => {
  stopHandles.push(stopHandle)
}

const hasActiveMap = () => {
  return !isDisposed && !!map.value && !!mapContainer.value
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getLngLatFromPosition = (position: any): { lng: number; lat: number } | null => {
  const lng = Number(
    position?.lng ?? (typeof position?.getLng === 'function' ? position.getLng() : position?.[0]),
  )
  const lat = Number(
    position?.lat ?? (typeof position?.getLat === 'function' ? position.getLat() : position?.[1]),
  )

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null
  }

  return { lng, lat }
}

const getMapLoadErrorMessage = (error: unknown) => {
  return error instanceof Error && error.message.includes('timed out')
    ? '地图加载超时，请稍后重试。'
    : '地图加载失败，请检查网络或高德地图配置。'
}

const failMapLoading = (error: unknown) => {
  if (isDisposed) {
    return
  }

  console.error(error)

  isMapLoading.value = false
  mapLoadError.value = getMapLoadErrorMessage(error)
}

// AMapLoader only means the JS API is available. The map itself is ready after
// the Map "complete" event, which fires when the initial tiles are loaded.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const waitForInitialMapLoad = (mapInstance: any): Promise<void> => {
  return new Promise((resolve, reject) => {
    let isSettled = false

    const cleanup = () => {
      window.clearTimeout(timeoutId)
      mapInstance.off?.('complete', handleComplete)
    }

    const settle = (callback: () => void) => {
      if (isSettled) {
        return
      }

      isSettled = true
      cleanup()
      callback()
    }

    const handleComplete = () => {
      settle(resolve)
    }

    const timeoutId = window.setTimeout(() => {
      settle(() => reject(new Error('AMap initial tile loading timed out')))
    }, initialMapLoadTimeoutMs)

    mapInstance.on('complete', handleComplete)
  })
}

const updateMarkerLabelVisibility = () => {
  if (!hasActiveMap()) return
  hideMarkerLabels.value = map.value.getZoom() < markerLabelMinZoom
}

// Smooth Pan & Zoom Animation Helper for 2D Map
const smoothFlyTo = (
  targetLng: number,
  targetLat: number,
  targetZoom?: number,
  duration: number = 400,
) => {
  if (!hasActiveMap()) return

  // Cancel any existing animation
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  const startCenter = map.value.getCenter()
  const startLng = startCenter.lng
  const startLat = startCenter.lat
  const startZoom = map.value.getZoom()

  // Only zoom in, never zoom out automatically
  const endZoom = targetZoom !== undefined ? Math.max(startZoom, targetZoom) : startZoom

  const startTime = performance.now()

  const animate = (currentTime: number) => {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)

    // Easing function: easeOutCubic
    const ease = 1 - Math.pow(1 - progress, 3)

    const currentLng = startLng + (targetLng - startLng) * ease
    const currentLat = startLat + (targetLat - startLat) * ease
    const currentZoom = startZoom + (endZoom - startZoom) * ease

    map.value.setCenter([currentLng, currentLat])
    map.value.setZoom(currentZoom)

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animate)
    } else {
      animationFrameId = null
    }
  }

  animationFrameId = requestAnimationFrame(animate)
}

// Function to manually center map on user
const centerOnUser = () => {
  if (userPosition.value && hasActiveMap()) {
    // Handle AMap.LngLat object (has lng/lat props) or Array
    const lng = userPosition.value.lng ?? userPosition.value[0]
    const lat = userPosition.value.lat ?? userPosition.value[1]

    if (lng !== undefined && lat !== undefined) {
      smoothFlyTo(lng, lat, 15)
    }
  }
}

// Helper to get rating colors for text (Darker for Light Mode, Lighter for Dark Mode)
const getRatingColor = (rating: string) => {
  switch (rating) {
    case '夯':
      return { light: '#b45309', dark: '#fcd34d' } // amber-700 / amber-300
    case '人上人':
      return { light: '#7e22ce', dark: '#d8b4fe' } // purple-700 / purple-300
    case 'npc':
      return { light: '#1d4ed8', dark: '#93c5fd' } // blue-700 / blue-300
    case '拉完了':
      return { light: '#15803d', dark: '#86efac' } // green-700 / green-300
    default:
      return { light: '#52525b', dark: '#d4d4d8' } // zinc-600 / zinc-300
  }
}

onMounted(() => {
  isDisposed = false
  hasInitialMapSettled = false
  isMapLoading.value = true
  mapLoadError.value = ''

  // Use shared initAMap function
  initAMap().then(async (AMap) => {
      if (isDisposed || !mapContainer.value) {
        return
      }

      const indoorMapLayer = new AMap.IndoorMap()
      const baseLayer = AMap.createDefaultLayer()

      map.value = new AMap.Map(mapContainer.value, {
        viewMode: '2D', // Revert to 2D for Indoor Map support
        zoom: restaurantStore.mapState ? restaurantStore.mapState.zoom : 12,
        center: restaurantStore.mapState ? restaurantStore.mapState.center : undefined,
        mapStyle: isDark.value ? darkStyle : lightStyle, // Dynamic initial style
        showIndoorMap: true, // Enable indoor map
        layers: [indoorMapLayer, baseLayer],
      })
      const initialMapLoadPromise = waitForInitialMapLoad(map.value)

      // Save map state on move/zoom
      const saveState = () => {
        if (hasActiveMap()) {
          const center = map.value.getCenter()
          const zoom = map.value.getZoom()
          restaurantStore.setMapState([center.lng, center.lat], zoom)
        }
      }
      map.value.on('moveend', saveState)
      map.value.on('zoomend', saveState)
      map.value.on('zoomend', updateMarkerLabelVisibility)
      updateMarkerLabelVisibility()

      // Watch for dark mode changes
      registerStopHandle(
        watch(isDark, (val) => {
          if (hasActiveMap()) {
            map.value.setMapStyle(val ? darkStyle : lightStyle)
          }
        }),
      )

      // Flag to prevent map click when clicking a marker
      let ignoreMapClick = false

      // Click on map background closes the card
      map.value.on('click', () => {
        if (ignoreMapClick) return
        selectedRestaurant.value = null
      })

      // 1. Add traffic layer
      const trafficLayer = new AMap.TileLayer.Traffic({
        zIndex: 10,
        visible: true,
        opacity: 0.7, // Reduce opacity to make traffic lines less prominent
      })
      map.value.add(trafficLayer)

      // Helper to format points
      const getClusterPoints = (list: Restaurant[]) => {
        return list
          .filter((r) => r.latitude && r.longitude)
          .map((r) => ({
            lnglat: [r.longitude, r.latitude],
            ...r,
          }))
      }

      // Initialize or replace Cluster. AMap MarkerCluster#setData can break with
      // custom marker renderers, so we recreate the cluster when filters change.
      const renderCluster = (list: Restaurant[]) => {
        if (!hasActiveMap()) {
          return
        }

        const points = getClusterPoints(list)

        if (
          selectedRestaurant.value &&
          !list.some((restaurant) => restaurant.id === selectedRestaurant.value?.id)
        ) {
          selectedRestaurant.value = null
        }

        // Custom render function for single markers (Restaurant)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderMarker = (context: any) => {
          const r = context.data[0] // Data passed as array
          const colors = getRatingColor(r.rating)

          // Rounded Star SVG (24px)
          const starSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#FACC15" stroke="#FFFFFF" stroke-width="1.0" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow-md">
              <path d="M11.23 2.44l-2.16 4.77-5.15.73c-.91.13-1.27 1.25-.61 1.88l3.73 3.58-.88 5.13c-.16.91.8 1.6 1.61 1.17L12 17.27l4.63 2.43c.81.43 1.77-.26 1.61-1.17l-.88-5.13 3.73-3.58c.66-.63.3-1.75-.61-1.88l-5.15-.73-2.16-4.77c-.39-.82-1.55-.82-1.94 0z"/>
            </svg>
          `

          const content = `
            <div class="custom-marker-wrapper group">
              <div class="marker-star transform transition-transform group-hover:scale-110">
                ${starSvg}
              </div>
              <div class="marker-info">
                <div class="restaurant-name"
                     style="--text-color-light: ${colors.light}; --text-color-dark: ${colors.dark};">
                  ${r.name}
                </div>
              </div>
            </div>
          `

          context.marker.setContent(content)
          context.marker.setOffset(new AMap.Pixel(-12, -24))
          context.marker.setzIndex(100)

          // Bind Click Event - Update State and Pan to Center
          context.marker.on('click', () => {
            if (isDisposed) {
              return
            }

            // Prevent map click from triggering
            ignoreMapClick = true
            setTimeout(() => {
              ignoreMapClick = false
            }, 300) // Increased timeout to prevent mobile race conditions

            // Pan and Zoom immediately for responsiveness
            if (hasActiveMap()) {
              smoothFlyTo(r.longitude!, r.latitude!, 14)
            }

            // Temporarily disable card interaction to prevent ghost clicks
            isCardInteractable.value = false
            selectedRestaurant.value = r
            setTimeout(() => {
              if (!isDisposed) {
                isCardInteractable.value = true
              }
            }, 400)
          })
        }

        // Custom render function for cluster markers (Aggregated)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const renderClusterMarker = (context: any) => {
          const count = context.count
          // Slightly smaller Star (32px) for Cluster
          const starSvg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="#FACC15" stroke="#FFFFFF" stroke-width="1.0" stroke-linecap="round" stroke-linejoin="round" class="drop-shadow-lg">
              <path d="M11.23 2.44l-2.16 4.77-5.15.73c-.91.13-1.27 1.25-.61 1.88l3.73 3.58-.88 5.13c-.16.91.8 1.6 1.61 1.17L12 17.27l4.63 2.43c.81.43 1.77-.26 1.61-1.17l-.88-5.13 3.73-3.58c.66-.63.3-1.75-.61-1.88l-5.15-.73-2.16-4.77c-.39-.82-1.55-.82-1.94 0z"/>
            </svg>
          `

          const content = `
            <div class="cluster-marker-container">
              <div class="cluster-star">${starSvg}</div>
              <div class="cluster-count">${count}</div>
            </div>
          `

          context.marker.setContent(content)
          context.marker.setOffset(new AMap.Pixel(-16, -32)) // Updated offset for 32x32
          context.marker.setzIndex(200)

          // Bind Click Event - Pan to Cluster Center
          context.marker.on('click', () => {
            const pos = context.marker.getPosition()
            if (pos && hasActiveMap()) {
              smoothFlyTo(pos.lng, pos.lat)
            }
          })
        }

        if (!AMap.MarkerCluster) {
          console.error('AMap.MarkerCluster is not loaded.')
          return
        }

        if (cluster.value) {
          cluster.value.setMap(null)
        }

        cluster.value = new AMap.MarkerCluster(map.value, points, {
          gridSize: 20, // Reduced from 60 to make clustering less aggressive
          renderMarker: renderMarker,
          renderClusterMarker: renderClusterMarker,
        })
      }

      renderCluster(restaurantStore.filteredRestaurants)

      registerStopHandle(
        watch(
          () => restaurantStore.filteredRestaurants,
          (newVal) => {
            renderCluster(newVal)
          },
        ),
      )

      // 2. Geolocation Logic
      // If we don't have a saved map state, but we have user location from Store (via HomeView), center there
      if (!restaurantStore.mapState && restaurantStore.userLocation) {
        map.value.setCenter([restaurantStore.userLocation.lng, restaurantStore.userLocation.lat])
        userPosition.value = {
            lat: restaurantStore.userLocation.lat,
            lng: restaurantStore.userLocation.lng
        }
      }

      // Prepare Precise Geolocation
      const geolocation = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
        // position: 'RB', // Disable default button position
        showButton: false, // HIDE default button
        offset: [10, 20],
        zoomToAccuracy: false, // DISABLE automatic zoom to accuracy circle which also centers map
        showCircle: true,
        showMarker: true,
        panToLocation: false, // DISABLE automatic centering during updates
      })

      map.value.addControl(geolocation)

      // Manually center map only on the VERY FIRST successful location
      let isFirstLocation = true

      // Automatically start precise positioning
      const startPositioning = () => {
        // If idle, do not perform update
        if (idle.value) return

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        geolocation.getCurrentPosition((status: string, result: any) => {
          if (status === 'complete') {
            userPosition.value = result.position // Update stored position

            // Only center on the very first load (keep user-selected zoom)
            if (isFirstLocation) {
              // If we have a saved state, don't auto-center, just update isFirstLocation
              if (!restaurantStore.mapState) {
                const nextCenter = getLngLatFromPosition(result.position)
                const currentCenter = hasActiveMap() ? getLngLatFromPosition(map.value.getCenter()) : null
                const shouldRecenter =
                  nextCenter &&
                  (!currentCenter ||
                    Math.abs(currentCenter.lng - nextCenter.lng) > 0.000001 ||
                    Math.abs(currentCenter.lat - nextCenter.lat) > 0.000001)
                const shouldShowRecenterLoading = hasInitialMapSettled && shouldRecenter
                const recenterLoadPromise = shouldShowRecenterLoading
                  ? waitForInitialMapLoad(map.value)
                  : null

                if (shouldShowRecenterLoading) {
                  isMapLoading.value = true
                  mapLoadError.value = ''
                }

                map.value.setCenter(result.position)
                recenterLoadPromise
                  ?.then(() => {
                    if (!isDisposed) {
                      isMapLoading.value = false
                    }
                  })
                  .catch(failMapLoading)
              }
              isFirstLocation = false
            }
          } else {
            console.warn('Precise geolocation failed or denied', result)
          }
        })
      }
      // Initial call
      startPositioning()

      // Refresh every 30 seconds
      timer.value = setInterval(startPositioning, 30000)

      // Watch idle state to manage timer resource
      registerStopHandle(
        watch(idle, (isIdle) => {
          if (isIdle) {
            if (timer.value) {
              clearInterval(timer.value)
              timer.value = null
            }
          } else {
            // Resume immediately
            startPositioning()
            // Restart timer if not running
            if (!timer.value) {
              timer.value = setInterval(startPositioning, 30000)
            }
          }
        }),
      )

      await initialMapLoadPromise

      if (!isDisposed) {
        hasInitialMapSettled = true
        isMapLoading.value = false
      }
    })
    .catch(failMapLoading)
})

onUnmounted(() => {
  isDisposed = true

  stopHandles.splice(0).forEach((stop) => stop())

  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  if (timer.value) {
    clearInterval(timer.value)
    timer.value = null
  }
  if (cluster.value) {
    cluster.value.setMap(null)
    cluster.value = null
  }
  if (map.value) {
    map.value.destroy()
    map.value = null
  }
  selectedRestaurant.value = null
})
</script>

<template>
  <div class="flex flex-col gap-4 w-full">
    <!-- Map Container -->
    <div
      class="relative w-full h-[calc(100vh-135px)] md:h-[600px] md:rounded-xl overflow-hidden md:shadow-sm md:border border-zinc-200 dark:border-zinc-700"
    >
      <div
        ref="mapContainer"
        class="w-full h-full"
        :class="{ 'marker-labels-hidden': hideMarkerLabels }"
      ></div>

      <div
        v-if="isMapLoading"
        class="absolute inset-0 z-40 flex items-center justify-center bg-stone-100/90 dark:bg-zinc-950/90 backdrop-blur-sm"
      >
        <div
          class="w-[min(18rem,calc(100vw-3rem))] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 p-4 shadow-sm"
        >
          <div class="h-3 w-24 rounded-full bg-zinc-200 dark:bg-zinc-700 animate-pulse"></div>
          <div
            class="mt-3 h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 animate-pulse"
          ></div>
          <p class="mt-4 text-sm font-medium text-zinc-700 dark:text-zinc-200">
            正在加载地图...
          </p>
        </div>
      </div>

      <div
        v-else-if="mapLoadError"
        class="absolute inset-0 z-40 flex items-center justify-center bg-stone-100/92 dark:bg-zinc-950/92 px-4 text-center"
      >
        <div
          class="max-w-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 p-4 shadow-sm"
        >
          <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">地图暂时不可用</p>
          <p class="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {{ mapLoadError }}
          </p>
        </div>
      </div>

      <!-- Custom Geolocation Button -->
      <button
        @click="centerOnUser"
        :disabled="isMapLoading || Boolean(mapLoadError)"
        class="mobile-locate-button fixed right-4 md:absolute md:bottom-8 md:right-8 p-2 md:p-3 bg-white dark:bg-zinc-800 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all duration-300 ease-out z-50"
        title="回到我的位置"
        aria-label="回到我的位置"
        :class="{
          '-translate-y-32 md:translate-y-0': selectedRestaurant,
          'cursor-not-allowed opacity-60': isMapLoading || mapLoadError,
        }"
      >
        <Locate class="w-5 h-5 md:w-6 md:h-6" />
      </button>

      <!-- Mobile Restaurant Card Overlay -->
      <Transition name="slide-up">
        <div
          v-if="selectedRestaurant"
          class="mobile-card-overlay md:hidden fixed left-4 right-4 z-[60]"
          :style="{
            transform: `translateY(${cardTranslateY}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          }"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
          @click.capture="handleMobileCardClick"
        >
          <!-- Drag Handle Area -->

          <div class="flex justify-center pb-2" @click.stop>
            <div
              class="w-10 h-1 bg-zinc-300/80 dark:bg-zinc-600/80 rounded-full backdrop-blur-sm shadow-sm"
            ></div>
          </div>

          <RestaurantCard
            :restaurant="selectedRestaurant"
            :auto-height="true"
            class="shadow-2xl border-zinc-200 dark:border-zinc-700"
          />
        </div>
      </Transition>
    </div>

    <!-- Desktop Restaurant Card (Below Map) -->
    <Transition name="slide-up">
      <div v-if="selectedRestaurant" class="hidden md:block w-full">
        <RestaurantCard
          :restaurant="selectedRestaurant"
          class="shadow-sm border border-zinc-200 dark:border-zinc-700 hover:shadow-md"
        />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.mobile-locate-button,
.mobile-card-overlay {
  bottom: 1rem;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition:
    transform 0.3s ease-out,
    opacity 0.3s ease-out;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
/* Adjust indoor floor control position and size */
/* Target the correct class name for AMap v2.0 indoor control */
:deep(.amap-indoormap-floorbar-control) {
  /* Reset left position and ensure it stays on the right */
  left: auto !important;
  right: 20px !important;
  bottom: auto !important;

  /* Vertical Center on the right side */
  top: 50% !important;
  transform: translateY(-50%);

  /* Add transparency */
  opacity: 0.85;
  transition: opacity 0.3s;
  z-index: 1000;
}

:deep(.amap-indoormap-floorbar-control:hover) {
  opacity: 1;
}

@media (max-width: 768px) {
  .mobile-locate-button {
    bottom: max(2rem, env(safe-area-inset-bottom, 0px));
  }

  .mobile-card-overlay {
    bottom: max(2rem, env(safe-area-inset-bottom, 0px));
  }

  :deep(.amap-indoormap-floorbar-control) {
    /* Mobile adjustments: Scale down and maintain right-side positioning */
    transform-origin: right top;
    transform: scale(0.8);

    top: 50% !important;
    /* Approximate half-height adjustment for vertical centering */
    margin-top: -60px !important;

    right: 12px !important;
    left: auto !important;
    bottom: auto !important;

    opacity: 0.8;
  }
}
/* Optional: Adjust individual button size for touch targets inside the scaled container */
:deep(.amap-indoormap-floorbar-control .floor-btn) {
  font-weight: bold;
}

/* Hide AMap Logo and Copyright */
:deep(.amap-logo),
:deep(.amap-copyright) {
  display: none !important;
}

/* New Custom Marker Styles */
:deep(.custom-marker-wrapper) {
  position: relative;
  display: flex;
  align-items: center; /* Vertically align star and text */
  cursor: pointer;
  /* Ensure the text doesn't wrap awkwardly */
  white-space: nowrap;
}

:deep(.marker-star) {
  /* Star is 32x32, we treat it as the anchor point */
  z-index: 10;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.2));
}

:deep(.marker-info) {
  display: flex;
  align-items: center;
  margin-left: 4px;
  /* Removed background and border for a cleaner look */
}

.marker-labels-hidden :deep(.marker-info) {
  display: none;
}

:deep(.restaurant-name) {
  font-size: 13px;
  font-weight: 800;
  color: var(--text-color-light);
  /* Simulate Hard White Stroke */
  text-shadow:
    -1.5px -1.5px 0 #fff,
    1.5px -1.5px 0 #fff,
    -1.5px 1.5px 0 #fff,
    1.5px 1.5px 0 #fff,
    0px 2px 5px rgba(0, 0, 0, 0.2); /* Soft drop shadow for lift */

  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Dark Mode Overrides */
.dark :deep(.restaurant-name) {
  color: var(--text-color-dark);
  /* Simulate Hard Dark Stroke */
  text-shadow:
    -1.5px -1.5px 0 #18181b,
    1.5px -1.5px 0 #18181b,
    -1.5px 1.5px 0 #18181b,
    1.5px 1.5px 0 #18181b,
    0px 2px 5px rgba(0, 0, 0, 0.5);
}

/* Cluster Styles */
:deep(.cluster-marker-container) {
  position: relative;
  width: 32px;
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
}

:deep(.cluster-count) {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -40%); /* Adjust visual center */
  font-size: 11px;
  font-weight: 800;
  color: #854d0e; /* amber-800 */
  pointer-events: none;
}
</style>

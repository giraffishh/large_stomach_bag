<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { useIdle, useDark } from '@vueuse/core'
import { Locate } from 'lucide-vue-next'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const map = shallowRef<any>(null)
const mapContainer = ref<HTMLElement | null>(null)
const timer = ref<ReturnType<typeof setInterval> | null>(null)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const userPosition = ref<any>(null)

const isDark = useDark()
const lightStyle = 'amap://styles/7bea9294d71af33c16de9b52c2a16db6'
const darkStyle = 'amap://styles/blue'

// Detect user inactivity (5 minutes = 300000 ms)
const { idle } = useIdle(5 * 60 * 1000)

// Function to manually center map on user
const centerOnUser = () => {
  if (userPosition.value && map.value) {
    // Use panTo for smooth animation instead of setZoomAndCenter
    map.value.setZoom(15)
    map.value.panTo(userPosition.value)
  }
}

onMounted(() => {
  // IMPORTANT: Replace these with your actual AMap keys
  // Security configuration must be done before loading the API
  window._AMapSecurityConfig = {
    securityJsCode: 'a7f9391274c33dfcd39a523b9a42cabe',
  }

  AMapLoader.load({
    key: '59e2827ddb4005767461570e23528377',
    version: '2.0',
    plugins: [
      'AMap.ControlBar',
      'AMap.Geolocation',
      'AMap.CitySearch',
      'AMap.TileLayer.Traffic',
      'AMap.IndoorMap',
    ],
  })
    .then((AMap) => {
      const indoorMapLayer = new AMap.IndoorMap()
      const baseLayer = AMap.createDefaultLayer()

      map.value = new AMap.Map(mapContainer.value, {
        viewMode: '2D',
        zoom: 12,
        mapStyle: isDark.value ? darkStyle : lightStyle, // Dynamic initial style
        showIndoorMap: false, // Hide built-in indoor layer when using custom style
        layers: [indoorMapLayer, baseLayer],
      })

      // Watch for dark mode changes
      watch(isDark, (val) => {
        if (map.value) {
          map.value.setMapStyle(val ? darkStyle : lightStyle)
        }
      })

      // 1. Add traffic layer
      const trafficLayer = new AMap.TileLayer.Traffic({
        zIndex: 10,
        visible: true,
        opacity: 0.7, // Reduce opacity to make traffic lines less prominent
      })
      map.value.add(trafficLayer)

      // 2. Geolocation Logic
      // First, get coarse location via IP (CitySearch)
      const citySearch = new AMap.CitySearch()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      citySearch.getLocalCity((status: string, result: any) => {
        if (status === 'complete' && result.info === 'OK') {
          if (result.bounds) {
            map.value.setBounds(result.bounds)
          }
        }
      })

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
            console.log('Precise geolocation successful', result)
            userPosition.value = result.position // Update stored position

            // Only center on the very first load (keep user-selected zoom)
            if (isFirstLocation) {
              map.value.setCenter(result.position)
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
      watch(idle, (isIdle) => {
        if (isIdle) {
          console.log('User is idle. Pausing location updates.')
          if (timer.value) {
            clearInterval(timer.value)
            timer.value = null
          }
        } else {
          console.log('User is active. Resuming location updates.')
          // Resume immediately
          startPositioning()
          // Restart timer if not running
          if (!timer.value) {
            timer.value = setInterval(startPositioning, 30000)
          }
        }
      })
    })
    .catch((e) => {
      console.error(e)
    })
})

onUnmounted(() => {
  if (timer.value) {
    clearInterval(timer.value)
  }
  if (map.value) {
    map.value.destroy()
  }
})
</script>

<template>
  <div
    class="relative w-full h-[600px] rounded-xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-700"
  >
    <div ref="mapContainer" class="w-full h-full"></div>

    <!-- Custom Geolocation Button -->
    <button
      @click="centerOnUser"
      class="absolute bottom-4 right-4 md:bottom-8 md:right-8 p-2 md:p-3 bg-white dark:bg-zinc-800 rounded-lg shadow-md border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors z-50"
      title="回到我的位置"
    >
      <Locate class="w-5 h-5 md:w-6 md:h-6" />
    </button>
  </div>
</template>

<style scoped>
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

/* Hide AMap Logo and Copyright - Note: This might violate AMap terms of service in some contexts */
:deep(.amap-logo),
:deep(.amap-copyright) {
  display: none !important;
}
</style>

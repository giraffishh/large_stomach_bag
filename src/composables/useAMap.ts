import { ref } from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { useRestaurantStore } from '@/stores/restaurants'

// Singleton promise to ensure AMap is loaded only once
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let aMapPromise: Promise<any> | null = null

export function useAMap() {
  const isLoaded = ref(false)
  const store = useRestaurantStore()

  // Initialize AMap and return the AMap namespace object
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const initAMap = (): Promise<any> => {
    if (aMapPromise) return aMapPromise

    // Configure AMap Security (Must be set before loading)
    window._AMapSecurityConfig = {
      securityJsCode: 'a7f9391274c33dfcd39a523b9a42cabe',
    }

    aMapPromise = AMapLoader.load({
      key: '59e2827ddb4005767461570e23528377',
      version: '2.0',
      plugins: [
        'AMap.ControlBar',
        'AMap.Geolocation',
        'AMap.CitySearch',
        'AMap.TileLayer.Traffic',
        'AMap.IndoorMap',
        'AMap.MarkerCluster', // Ensure this plugin is loaded for Map component
      ],
    })
      .then((AMap) => {
        isLoaded.value = true
        return AMap
      })
      .catch((e) => {
        console.error('AMap Loader Error:', e)
        throw e
      })

    return aMapPromise
  }

  // Initialize Location Services (City Search + Geolocation)
  const initLocation = async () => {
    try {
      const AMap = await initAMap()

      // 1. IP City Search (Coarse) - Fast
      const citySearch = new AMap.CitySearch()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      citySearch.getLocalCity((status: string, result: any) => {
        if (status === 'complete' && result.info === 'OK') {
          if (result.city) {
            console.log('📍 [useAMap] CitySearch (IP) detected city:', result.city)
            // Only set if we haven't set a precise location yet
            if (!store.userLocation) {
              store.setUserCity(result.city)
            } else if (!store.userCity) {
               // Fallback if location exists but city doesn't
               store.setUserCity(result.city)
            }
          }
        }
      })

      // 2. Precise Geolocation - Slower but accurate
      const geolocation = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
        buttonPosition: 'RB',
        zoomToAccuracy: false, // We handle zoom manually in Map component
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      geolocation.getCurrentPosition((status: string, result: any) => {
        if (status === 'complete') {
          // Update Store with precise location
          store.setUserLocation(result.position.lat, result.position.lng)

          if (result.addressComponent) {
            const city = result.addressComponent.city || result.addressComponent.province
            if (city) {
              console.log('🎯 [useAMap] Geolocation (Precise) detected user city:', city)
              store.setUserCity(city)
            }
          }
        } else {
          console.warn('[useAMap] Geolocation failed/timeout', result)
        }
      })
    } catch (e) {
      console.error('[useAMap] Failed to init location:', e)
    }
  }

  return {
    isLoaded,
    initAMap,
    initLocation,
  }
}

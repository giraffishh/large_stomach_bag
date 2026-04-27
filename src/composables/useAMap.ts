import { ref } from 'vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { useRestaurantStore } from '@/stores/restaurants'

const amapKey = import.meta.env.VITE_AMAP_JS_KEY
const amapSecurityCode = import.meta.env.VITE_AMAP_SECURITY_CODE

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

    if (!amapKey) {
      return Promise.reject(new Error('Missing VITE_AMAP_JS_KEY'))
    }

    if (amapSecurityCode) {
      window._AMapSecurityConfig = {
        securityJsCode: amapSecurityCode,
      }
    }

    aMapPromise = AMapLoader.load({
      key: amapKey,
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

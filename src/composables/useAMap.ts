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
        'AMap.Geocoder',
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
        extensions: 'all',
        timeout: 10000,
        buttonPosition: 'RB',
        zoomToAccuracy: false, // We handle zoom manually in Map component
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      geolocation.getCurrentPosition((status: string, result: any) => {
        if (status === 'complete') {
          const position = getPositionCoordinates(result?.position)
          if (!position) {
            console.warn('[useAMap] Geolocation succeeded without coordinates', result)
            return
          }

          // Update Store with precise location
          store.setUserLocation(position.lat, position.lng)

          const city = resolveGeolocationCity(result)
          if (city) {
            store.setUserCity(city)
            return
          }

          resolveCityFromCoordinates(AMap, position.lng, position.lat).then((resolvedCity) => {
            if (resolvedCity) {
              store.setUserCity(resolvedCity)
            }
          })
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

function resolveGeolocationCity(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any,
): string {
  const directCity = pickFirstCity(result?.addressComponent?.city)
  if (directCity) {
    return directCity
  }

  const cityFromAddress =
    extractCityFromText(result?.formattedAddress) || extractCityFromText(result?.address)
  if (cityFromAddress) {
    return cityFromAddress
  }

  const province =
    typeof result?.addressComponent?.province === 'string'
      ? result.addressComponent.province.trim()
      : ''

  if (isMunicipality(province)) {
    return province
  }

  return ''
}

function getPositionCoordinates(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  position: any,
): { lng: number; lat: number } | null {
  const lng = Number(
    position?.lng ??
      position?.[0] ??
      (typeof position?.getLng === 'function' ? position.getLng() : NaN),
  )
  const lat = Number(
    position?.lat ??
      position?.[1] ??
      (typeof position?.getLat === 'function' ? position.getLat() : NaN),
  )

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null
  }

  return { lng, lat }
}

function resolveCityFromCoordinates(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AMap: any,
  lng: number,
  lat: number,
): Promise<string> {
  if (!AMap?.Geocoder) {
    return Promise.resolve('')
  }

  return new Promise((resolve) => {
    const geocoder = new AMap.Geocoder({ extensions: 'all' })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    geocoder.getAddress([lng, lat], (status: string, result: any) => {
      if (status !== 'complete' || !result?.regeocode) {
        resolve('')
        return
      }

      resolve(resolveGeolocationCity(result.regeocode))
    })
  })
}

function pickFirstCity(city: string | string[] | undefined): string {
  if (Array.isArray(city)) {
    return city.find((item) => typeof item === 'string' && item.trim())?.trim() || ''
  }

  return typeof city === 'string' ? city.trim() : ''
}

function extractCityFromText(text: string | undefined): string {
  if (!text) {
    return ''
  }

  const normalizedText = text.replace(/\s+/g, '')
  const cityMatch = normalizedText.match(/[^省市区县旗]+市/)
  if (cityMatch?.[0]) {
    return cityMatch[0]
  }

  const municipalityMatch = normalizedText.match(
    /(北京市|上海市|天津市|重庆市|香港特别行政区|澳门特别行政区)/,
  )
  return municipalityMatch?.[1] || ''
}

function isMunicipality(value: string): boolean {
  return ['北京市', '上海市', '天津市', '重庆市', '香港特别行政区', '澳门特别行政区'].includes(
    value,
  )
}

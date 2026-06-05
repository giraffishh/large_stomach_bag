/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AMAP_JS_KEY: string
  readonly VITE_AMAP_SECURITY_CODE: string
  readonly VITE_TWIKOO_ENV_ID?: string
  readonly VITE_TWIKOO_SCRIPT_SRC?: string
  readonly VITE_CANDIDATE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  _AMapSecurityConfig?: {
    securityJsCode: string
  }
  twikoo?: {
    init: (options: {
      envId: string
      el: string
      path?: string
      lang?: string
    }) => void | Promise<void>
  }
}

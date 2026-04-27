import './assets/main.css'
import { createApp } from 'vue'
import { watch } from 'vue'
import { createPinia } from 'pinia'
import { useDark } from '@vueuse/core'

import App from './App.vue'
import router from './router'
import { syncThemeChrome } from './utils/themeChrome'

const isDark = useDark()
syncThemeChrome(isDark.value)
watch(isDark, syncThemeChrome)

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

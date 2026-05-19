<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{
  path: string
}>()

const DEFAULT_TWIKOO_ENV_ID =
  'https://twikoo-giraffish.netlify.app/.netlify/functions/twikoo'
const TWIKOO_CONTAINER_ID = 'twikoo-thread'
const TWIKOO_SCRIPT_ID = 'twikoo-script'
const DEFAULT_TWIKOO_SCRIPT_SRC = '/vendor/twikoo.min.js'

let twikooScriptPromise: Promise<void> | null = null

const envId = computed(() => import.meta.env.VITE_TWIKOO_ENV_ID || DEFAULT_TWIKOO_ENV_ID)
const scriptSrc = computed(
  () => import.meta.env.VITE_TWIKOO_SCRIPT_SRC || DEFAULT_TWIKOO_SCRIPT_SRC,
)
const isLoading = ref(true)
const loadError = ref('')
const renderAttempt = ref(0)

function clearContainer() {
  const element = document.getElementById(TWIKOO_CONTAINER_ID)
  element?.replaceChildren()
}

function ensureTwikooLoaded() {
  if (window.twikoo) {
    return Promise.resolve()
  }

  if (twikooScriptPromise) {
    return twikooScriptPromise
  }

  twikooScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(TWIKOO_SCRIPT_ID) as HTMLScriptElement | null

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true') {
        resolve()
        return
      }

      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener(
        'error',
        () => {
          twikooScriptPromise = null
          reject(new Error('Failed to load Twikoo script.'))
        },
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.id = TWIKOO_SCRIPT_ID
    script.src = scriptSrc.value
    script.async = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => {
      twikooScriptPromise = null
      script.remove()
      reject(new Error('Failed to load Twikoo script.'))
    }
    document.head.appendChild(script)
  })

  return twikooScriptPromise
}

async function renderComments() {
  if (!props.path) {
    return
  }

  const attempt = ++renderAttempt.value
  isLoading.value = true
  loadError.value = ''

  clearContainer()
  await nextTick()

  try {
    await ensureTwikooLoaded()

    if (!window.twikoo || attempt !== renderAttempt.value) {
      return
    }

    await window.twikoo.init({
      envId: envId.value,
      el: `#${TWIKOO_CONTAINER_ID}`,
      path: props.path,
      lang: 'zh-CN',
    })

    if (attempt === renderAttempt.value) {
      isLoading.value = false
    }
  } catch (error) {
    console.error(error)

    if (attempt !== renderAttempt.value) {
      return
    }

    isLoading.value = false
    loadError.value = '评论区加载失败，请稍后重试。'
  }
}

watch(
  () => props.path,
  () => {
    void renderComments()
  },
)

onMounted(() => {
  void renderComments()
})

onBeforeUnmount(() => {
  renderAttempt.value += 1
  clearContainer()
})
</script>

<template>
  <section
    class="bg-white/90 dark:bg-zinc-950/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 px-4 py-4 md:px-6 md:py-6 shadow-sm"
  >
    <div class="flex items-center justify-between gap-3 mb-4">
      <h2 class="text-lg md:text-xl font-bold text-zinc-900 dark:text-zinc-100">评论区</h2>

      <button
        v-if="loadError"
        type="button"
        class="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:opacity-80 transition-opacity"
        @click="renderComments"
      >
        重新加载
      </button>
    </div>

    <p v-if="isLoading" class="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
      正在加载评论区...
    </p>

    <p v-if="loadError" class="mb-3 text-sm text-rose-600 dark:text-rose-400">
      {{ loadError }}
    </p>

    <div :id="TWIKOO_CONTAINER_ID"></div>
  </section>
</template>

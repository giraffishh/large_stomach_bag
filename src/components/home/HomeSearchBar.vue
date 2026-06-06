<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import {
  ChartColumn,
  ClipboardList,
  LayoutList,
  Map,
  Menu,
  Moon,
  Search,
  Sun,
} from 'lucide-vue-next'
import { useDark } from '@vueuse/core'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { useRestaurantStore } from '@/stores/restaurants'
import { syncThemeChrome } from '@/utils/themeChrome'

const store = useRestaurantStore()
const { searchQuery, isMapView } = storeToRefs(store)
const router = useRouter()

const isDark = useDark()
const showActionsMenu = ref(false)
const actionsButtonRef = ref<HTMLElement | null>(null)
const actionsMenuPosition = ref({ top: 0, right: 0 })

const actionsMenuStyle = computed(() => ({
  top: `${actionsMenuPosition.value.top}px`,
  right: `${actionsMenuPosition.value.right}px`,
}))

type ViewTransitionHandle = {
  finished: Promise<void>
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => ViewTransitionHandle
}

const updateActionsMenuPosition = () => {
  const button = actionsButtonRef.value
  if (!button) return

  const rect = button.getBoundingClientRect()
  actionsMenuPosition.value = {
    top: rect.bottom + 8,
    right: window.innerWidth - rect.right,
  }
}

const openActionsMenu = async () => {
  updateActionsMenuPosition()
  showActionsMenu.value = true
  await nextTick()
  updateActionsMenuPosition()
  window.addEventListener('resize', updateActionsMenuPosition)
}

const closeActionsMenu = () => {
  showActionsMenu.value = false
  window.removeEventListener('resize', updateActionsMenuPosition)
}

const closeActionsMenuBeforeNavigation = async () => {
  closeActionsMenu()
  await nextTick()
}

const toggleMapView = () => {
  isMapView.value = !isMapView.value
  closeActionsMenu()
}

const goToStats = async () => {
  await closeActionsMenuBeforeNavigation()
  await router.push('/stats')
}

const goToCandidates = async () => {
  await closeActionsMenuBeforeNavigation()
  await router.push('/candidates')
}

const toggleActionsMenu = () => {
  if (showActionsMenu.value) {
    closeActionsMenu()
    return
  }

  void openActionsMenu()
}

const toggleDarkMode = (event: MouseEvent) => {
  showActionsMenu.value = false
  window.removeEventListener('resize', updateActionsMenuPosition)

  const target = event.currentTarget as HTMLElement | null
  const nextTheme = !isDark.value
  const documentWithTransition = document as ViewTransitionDocument
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!target || !documentWithTransition.startViewTransition || prefersReducedMotion) {
    isDark.value = nextTheme
    syncThemeChrome(nextTheme)
    return
  }

  const rect = target.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  )
  const root = document.documentElement

  root.style.setProperty('--theme-reveal-x', `${x}px`)
  root.style.setProperty('--theme-reveal-y', `${y}px`)
  root.style.setProperty('--theme-reveal-radius', `${endRadius}px`)
  root.classList.add('theme-transitioning')

  const transition = documentWithTransition.startViewTransition(() => {
    isDark.value = nextTheme
    syncThemeChrome(nextTheme)
  })

  transition.finished.finally(() => {
    root.classList.remove('theme-transitioning')
  })
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateActionsMenuPosition)
})

onBeforeRouteLeave(() => {
  closeActionsMenu()
})
</script>

<template>
  <div class="flex items-center gap-2.5 mb-2">
    <div class="relative group grow">
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search
          class="h-5 w-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors"
        />
      </div>
      <input
        v-model="searchQuery"
        type="text"
        class="block w-full pl-9 pr-3 py-2 md:pl-10 md:pr-3 border border-zinc-200 dark:border-zinc-700 rounded-xl leading-5 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs md:text-sm"
        placeholder="搜索餐厅、评价、地址..."
      />
    </div>
    <div class="relative shrink-0">
      <button
        ref="actionsButtonRef"
        @click="toggleActionsMenu"
        class="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-600 transition-colors hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 md:px-3.5 shrink-0"
        title="打开更多菜单"
        aria-label="打开更多菜单"
        :aria-expanded="showActionsMenu"
      >
        <span class="text-[13px] font-bold leading-none">更多</span>
        <Menu
          :size="18"
          class="actions-menu-trigger-icon md:h-5 md:w-5"
          :class="{ 'is-open': showActionsMenu }"
        />
      </button>

      <Teleport to="body">
        <Transition name="actions-backdrop">
          <div
            v-if="showActionsMenu"
            class="actions-backdrop-panel fixed inset-x-0 top-0 z-50 bg-zinc-950/12 backdrop-blur-[1px] dark:bg-black/24"
            aria-hidden="true"
            @pointerdown.stop
            @mousedown.stop
            @touchstart.stop
            @click.prevent.stop="closeActionsMenu"
          ></div>
        </Transition>

        <Transition name="actions-menu">
          <div
            v-if="showActionsMenu"
            class="fixed z-[60] flex flex-col items-end gap-3"
            :style="actionsMenuStyle"
            @pointerdown.stop
            @mousedown.stop
            @touchstart.stop
            @click.stop
          >
            <button
              @click="toggleMapView"
              class="action-menu-item"
              :title="isMapView ? '切换到列表视图' : '切换到地图视图'"
              :aria-label="isMapView ? '切换到列表视图' : '切换到地图视图'"
            >
              <span class="action-menu-label">
                {{ isMapView ? '列表模式' : '地图模式' }}
              </span>
              <span class="action-menu-icon">
                <component :is="isMapView ? LayoutList : Map" :size="18" class="md:w-5 md:h-5" />
              </span>
            </button>
            <button
              @click="goToCandidates"
              class="action-menu-item"
              title="候选名单"
              aria-label="候选名单"
            >
              <span class="action-menu-label">候选名单</span>
              <span class="action-menu-icon">
                <ClipboardList :size="18" class="md:w-5 md:h-5" />
              </span>
            </button>
            <button
              @click="goToStats"
              class="action-menu-item"
              title="查看统计"
              aria-label="查看统计"
            >
              <span class="action-menu-label">数据统计</span>
              <span class="action-menu-icon">
                <ChartColumn :size="18" class="md:w-5 md:h-5" />
              </span>
            </button>
            <button
              @click="toggleDarkMode"
              class="action-menu-item group/theme"
              :aria-label="isDark ? '切换到亮色模式' : '切换到暗色模式'"
              :aria-pressed="isDark"
            >
              <span class="action-menu-label">
                {{ isDark ? '亮色模式' : '暗色模式' }}
              </span>
              <span class="action-menu-icon overflow-hidden">
                <component
                  :is="isDark ? Moon : Sun"
                  :key="isDark ? 'moon' : 'sun'"
                  :size="18"
                  class="theme-toggle-icon md:w-5 md:h-5"
                />
              </span>
            </button>
          </div>
        </Transition>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
.action-menu-item {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  cursor: pointer;
  border: 1px solid rgb(228 228 231);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.94);
  padding: 0.4rem 0.45rem 0.4rem 0.9rem;
  color: rgb(63 63 70);
  box-shadow:
    0 10px 24px rgba(39, 39, 42, 0.1),
    0 2px 6px rgba(39, 39, 42, 0.06);
  backdrop-filter: blur(10px);
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease,
    box-shadow 220ms ease,
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.action-menu-label {
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.dark .action-menu-item {
  border-color: rgb(63 63 70);
  background: rgba(39, 39, 42, 0.94);
  color: rgb(212 212 216);
  box-shadow:
    0 12px 28px rgba(0, 0, 0, 0.34),
    0 2px 8px rgba(0, 0, 0, 0.22);
}

.action-menu-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  background: rgb(244 244 245);
  color: rgb(82 82 91);
  transition:
    background-color 180ms ease,
    color 180ms ease,
    transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.action-menu-item:hover {
  background: rgba(244, 244, 245, 0.98);
  box-shadow:
    0 14px 30px rgba(39, 39, 42, 0.14),
    0 4px 10px rgba(39, 39, 42, 0.08);
  transform: translateY(-1px);
}

.action-menu-item:hover .action-menu-icon {
  background: rgb(228 228 231);
}

.action-menu-item:active {
  transform: scale(0.94);
}

.action-menu-item:focus-visible {
  outline: 2px solid rgb(249 115 22);
  outline-offset: 2px;
  border-radius: 0.875rem;
}

.dark .action-menu-icon {
  background: rgb(63 63 70);
  color: rgb(161 161 170);
}

.dark .action-menu-item:hover {
  background: rgba(63, 63, 70, 0.98);
}

.dark .action-menu-item:hover .action-menu-icon {
  background: rgb(82 82 91);
}

@media (min-width: 768px) {
  .action-menu-item {
    padding: 0.45rem 0.5rem 0.45rem 1rem;
  }

  .action-menu-icon {
    width: 2.5rem;
    height: 2.5rem;
  }
}

.actions-backdrop-panel {
  bottom: calc(env(safe-area-inset-bottom, 0px) * -1);
  min-height: 100vh;
  min-height: 100dvh;
}

.actions-menu-trigger-icon {
  transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
}

.actions-menu-trigger-icon.is-open {
  transform: rotate(90deg);
}

.actions-menu-enter-active,
.actions-menu-leave-active {
  transition:
    opacity 180ms ease,
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: top right;
}

.actions-menu-enter-from,
.actions-menu-leave-to {
  opacity: 0;
  transform: translate3d(0, -8px, 0) scale(0.96);
}

.actions-backdrop-enter-active,
.actions-backdrop-leave-active {
  transition:
    opacity 180ms ease,
    backdrop-filter 180ms ease;
}

.actions-backdrop-enter-from,
.actions-backdrop-leave-to {
  opacity: 0;
  backdrop-filter: blur(0);
}

.theme-toggle-icon {
  transition:
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 180ms ease;
}

.group\/theme:active .theme-toggle-icon {
  transform: rotate(24deg) scale(0.86);
}

@media (prefers-reduced-motion: reduce) {
  .action-menu-button,
  .action-menu-icon,
  .action-menu-item,
  .actions-menu-trigger-icon,
  .actions-menu-enter-active,
  .actions-menu-leave-active,
  .actions-backdrop-enter-active,
  .actions-backdrop-leave-active,
  .actions-menu-enter-active .action-menu-item,
  .actions-menu-leave-active .action-menu-item,
  .theme-toggle-icon {
    transition: none;
    animation: none;
  }

  .actions-menu-trigger-icon.is-open,
  .actions-menu-enter-from,
  .actions-menu-leave-to,
  .actions-menu-enter-from .action-menu-item,
  .actions-menu-leave-to .action-menu-item,
  .action-menu-item:hover,
  .action-menu-item:hover .action-menu-icon,
  .action-menu-item:active,
  .group\/theme:active .theme-toggle-icon {
    transform: none;
  }
}
</style>


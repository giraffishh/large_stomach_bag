<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { ExternalLink, X } from 'lucide-vue-next'
import RatingBadge from '@/components/RatingBadge.vue'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const ratingLevels = [
  { label: '夯', description: '有点惊艳，会再带别人来吃' },
  { label: '人上人', description: '不错，大概率会二刷' },
  { label: 'npc', description: '一般，能吃，没有二刷的欲望' },
  { label: '拉完了', description: '拉完了' },
]

const links = [
  {
    label: '项目 GitHub',
    href: 'https://github.com/giraffishh/large_stomach_bag',
  },
  {
    label: '作者博客',
    href: 'https://blog.giraffish.top',
  },
  {
    label: '作者 GitHub',
    href: 'https://github.com/giraffishh',
  },
]

const close = () => {
  emit('close')
}

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    close()
  }
}

const removeKeydownListener = () => {
  window.removeEventListener('keydown', handleKeydown)
}

watch(
  () => props.show,
  (show) => {
    removeKeydownListener()

    if (show) {
      window.addEventListener('keydown', handleKeydown)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  removeKeydownListener()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="about-modal">
      <div
        v-if="show"
        class="about-modal-root fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/28 px-3 py-6 backdrop-blur-[2px] dark:bg-black/44 md:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-modal-title"
        @click.self="close"
      >
        <section
          class="about-modal-panel max-h-[calc(100dvh-3rem)] w-full max-w-[27rem] overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div class="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-zinc-100 bg-white/96 px-5 pb-3 pt-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/96">
            <div>
              <h2
                id="about-modal-title"
                class="about-modal-title text-zinc-950 dark:text-zinc-50"
              >
                关于
              </h2>
            </div>
            <button
              v-pressable
              type="button"
              class="ui-pressable ui-pressable-strong rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              aria-label="关闭关于"
              @click="close"
            >
              <X :size="18" />
            </button>
          </div>

          <div class="space-y-5 px-5 pb-5 pt-4">
            <section class="about-section">
              <h3 class="about-section-title">关于从夯到拉</h3>
              <div class="about-rating-list">
                <div
                  v-for="level in ratingLevels"
                  :key="level.label"
                  class="about-rating-row"
                >
                  <RatingBadge :rating="level.label" class="about-rating-badge" />
                  <span class="about-rating-text">{{ level.description }}</span>
                </div>
              </div>
            </section>

            <section class="about-section">
              <h3 class="about-section-title">关于我</h3>
              <p class="about-paragraph">
                一直想吃胖但是没有任何办法，我也渴望拥有大胃袋，于是大胃袋计划诞生了...
              </p>
            </section>

            <section class="about-section">
              <h3 class="about-section-title">鸣谢</h3>
              <p class="about-paragraph">
                感谢所有陪我探店的人，感谢所有贡献的经验&amp;推荐，感谢G.MiaGa对大胃袋计划的支持，感谢gpt&amp;gemini的项目实现
              </p>
            </section>

            <section class="about-section">
              <h3 class="about-section-title">链接</h3>
              <div class="about-link-list">
                <a
                  v-for="link in links"
                  :key="link.href"
                  class="about-link"
                  :href="link.href"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span class="about-link-content">
                    <span>{{ link.label }}</span>
                  </span>
                  <ExternalLink :size="15" class="about-link-icon" />
                </a>
                <div class="about-link about-link-note" aria-label="感谢星标支持">
                  <span class="about-link-content">
                    <span>感谢⭐支持</span>
                  </span>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.about-modal-enter-active,
.about-modal-leave-active {
  transition: opacity 180ms ease;
}

.about-modal-enter-active .about-modal-panel,
.about-modal-leave-active .about-modal-panel {
  transition:
    opacity 180ms ease,
    transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.about-modal-enter-from,
.about-modal-leave-to {
  opacity: 0;
}

.about-modal-enter-from .about-modal-panel,
.about-modal-leave-to .about-modal-panel {
  opacity: 0;
  transform: translate3d(0, 8px, 0) scale(0.98);
}

.about-modal-panel {
  scrollbar-width: thin;
  scrollbar-color: rgb(212 212 216) transparent;
}

.dark .about-modal-panel {
  scrollbar-color: rgb(63 63 70) transparent;
}

.about-section {
  padding-top: 0.125rem;
}

.about-modal-title {
  font-size: 1.5rem;
  font-weight: 950;
  line-height: 1.08;
  letter-spacing: 0;
}

.about-section-title {
  font-size: 1.0625rem;
  font-weight: 900;
  line-height: 1.2;
  color: rgb(24 24 27);
}

.dark .about-section-title {
  color: rgb(244 244 245);
}

.about-rating-list {
  margin-top: 0.65rem;
  overflow: hidden;
  border: 1px solid rgb(244 244 245);
  border-radius: 0.875rem;
  background: rgb(250 250 249);
}

.dark .about-rating-list {
  border-color: rgb(39 39 42);
  background: rgba(24, 24, 27, 0.72);
}

.about-rating-row {
  display: grid;
  grid-template-columns: 5.75rem 1fr;
  gap: 0.75rem;
  align-items: center;
  padding: 0.72rem 0.8rem;
}

.about-rating-row + .about-rating-row {
  border-top: 1px solid rgb(244 244 245);
}

.dark .about-rating-row + .about-rating-row {
  border-top-color: rgb(39 39 42);
}

.about-rating-badge {
  justify-self: start;
  transform: scale(1.08);
  transform-origin: left center;
}

.about-rating-badge:deep(svg) {
  width: 1rem;
  height: 1rem;
}

.about-rating-text {
  min-width: 0;
  font-size: 0.8125rem;
  font-weight: 650;
  line-height: 1.5;
  color: rgb(63 63 70);
}

.dark .about-rating-text {
  color: rgb(212 212 216);
}

.about-paragraph {
  margin-top: 0.55rem;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.75;
  color: rgb(82 82 91);
}

.dark .about-paragraph {
  color: rgb(212 212 216);
}

.about-link-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin-top: 0.65rem;
}

.about-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 3.1rem;
  border: 1px solid rgb(244 244 245);
  border-radius: 0.875rem;
  padding: 0.72rem 0.55rem;
  background: rgb(250 250 249);
  color: rgb(63 63 70);
  text-decoration: none;
  text-align: center;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease;
}

.about-link:hover {
  border-color: rgb(254 215 170);
  background: rgb(255 247 237);
  color: rgb(234 88 12);
}

.about-link-note,
.about-link-note:hover {
  border-color: rgb(244 244 245);
  background: rgb(250 250 249);
  color: rgb(63 63 70);
}

.about-link-content span:first-child {
  font-size: 0.8125rem;
  font-weight: 900;
  line-height: 1.28;
  white-space: nowrap;
}

.about-link-icon {
  flex-shrink: 0;
  color: rgb(161 161 170);
}

.dark .about-link {
  border-color: rgb(39 39 42);
  background: rgba(24, 24, 27, 0.72);
  color: rgb(228 228 231);
}

.dark .about-link:hover {
  border-color: rgba(251, 146, 60, 0.45);
  background: rgba(39, 39, 42, 0.7);
  color: rgb(251 146 60);
}

.dark .about-link-note,
.dark .about-link-note:hover {
  border-color: rgb(39 39 42);
  background: rgba(24, 24, 27, 0.72);
  color: rgb(228 228 231);
}

@media (prefers-reduced-motion: reduce) {
  .about-modal-enter-active,
  .about-modal-leave-active,
  .about-modal-enter-active .about-modal-panel,
  .about-modal-leave-active .about-modal-panel {
    transition: none;
    animation: none;
  }

  .about-modal-enter-from .about-modal-panel,
  .about-modal-leave-to .about-modal-panel {
    transform: none;
  }
}

@media (max-width: 374px) {
  .about-rating-row {
    grid-template-columns: 5.35rem 1fr;
    gap: 0.6rem;
    padding-inline: 0.7rem;
  }

  .about-link {
    min-height: 2.95rem;
    padding-inline: 0.45rem;
  }

  .about-link-content span:first-child {
    font-size: 0.75rem;
  }
}
</style>

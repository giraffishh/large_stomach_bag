<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ClipboardList,
  LoaderCircle,
  MapPin,
  Plus,
  RefreshCw,
  X,
} from 'lucide-vue-next'
import { createCandidate, fetchCandidates, upvoteCandidate } from '@/services/candidates'
import type { Candidate, CandidateInput } from '@/types/candidate'

const CANDIDATE_UPVOTES_KEY = 'candidateUpvotes'

const router = useRouter()
const candidates = ref<Candidate[]>([])
const isLoading = ref(false)
const loadError = ref('')
const saveError = ref('')
const isSaving = ref(false)
const upvotingId = ref('')
const showForm = ref(false)
const upvotedIds = ref<Set<string>>(loadUpvotedIds())

const form = reactive({
  name: '',
  location: '',
  price: '',
  tags: '',
  reason: '',
  submitter: '',
})

const sortedCandidates = computed(() => {
  return [...candidates.value].sort((a, b) => {
    if (a.upvotes !== b.upvotes) {
      return b.upvotes - a.upvotes
    }

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
})

const openCandidateCount = computed(() => {
  return candidates.value.filter((candidate) => candidate.status === 'open').length
})

const totalUpvotes = computed(() => {
  return candidates.value.reduce((sum, candidate) => sum + candidate.upvotes, 0)
})

onMounted(() => {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  void loadCandidates()
})

async function loadCandidates() {
  isLoading.value = true
  loadError.value = ''

  try {
    candidates.value = await fetchCandidates()
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '候选名单加载失败。'
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  router.replace('/home')
}

const openCreateForm = () => {
  resetForm()
  saveError.value = ''
  showForm.value = true
}

const closeForm = () => {
  if (isSaving.value) {
    return
  }

  showForm.value = false
}

async function submitForm() {
  saveError.value = ''
  const payload = buildCandidatePayload()

  if (!payload.name) {
    saveError.value = '请先填写店名。'
    return
  }

  if (!payload.reason) {
    saveError.value = '请填写推荐理由。'
    return
  }

  isSaving.value = true

  try {
    const savedCandidate = await createCandidate(payload)
    candidates.value = [savedCandidate, ...candidates.value]
    showForm.value = false
    await router.push(`/candidates/${savedCandidate.id}`)
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : '保存候选失败。'
  } finally {
    isSaving.value = false
  }
}

async function handleUpvote(candidate: Candidate) {
  if (upvotedIds.value.has(candidate.id) || upvotingId.value) {
    return
  }

  upvotingId.value = candidate.id
  const previousCandidates = candidates.value
  const optimisticCandidate = {
    ...candidate,
    upvotes: candidate.upvotes + 1,
    updatedAt: new Date().toISOString(),
  }

  upsertCandidate(optimisticCandidate)

  try {
    const updatedCandidate = await upvoteCandidate(candidate.id)
    upsertCandidate(updatedCandidate)
    upvotedIds.value = new Set([...upvotedIds.value, candidate.id])
    saveUpvotedIds(upvotedIds.value)
  } catch (error) {
    candidates.value = previousCandidates
    loadError.value = error instanceof Error ? error.message : '顶帖失败，请稍后重试。'
  } finally {
    upvotingId.value = ''
  }
}

const buildCandidatePayload = (): CandidateInput => {
  return {
    name: form.name.trim(),
    city: '',
    address: form.location.trim(),
    price: parsePrice(form.price),
    tags: form.tags
      .split(/[，,、·]/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8),
    reason: form.reason.trim(),
    submitter: form.submitter.trim(),
  }
}

const parsePrice = (value: string) => {
  const normalizedValue = value.trim()

  if (!normalizedValue) {
    return null
  }

  const matchedPrice = normalizedValue.match(/\d+/)
  if (!matchedPrice) {
    return null
  }

  return Math.max(0, Number.parseInt(matchedPrice[0], 10) || 0)
}

const resetForm = () => {
  form.name = ''
  form.location = ''
  form.price = ''
  form.tags = ''
  form.reason = ''
  form.submitter = ''
}

const upsertCandidate = (candidate: Candidate) => {
  const candidateIndex = candidates.value.findIndex((item) => item.id === candidate.id)

  if (candidateIndex === -1) {
    candidates.value = [candidate, ...candidates.value]
    return
  }

  candidates.value = candidates.value.map((item) =>
    item.id === candidate.id ? candidate : item,
  )
}

const getCandidateLocation = (candidate: Candidate) => {
  return [candidate.city, candidate.address].filter(Boolean).join(' · ')
}

function loadUpvotedIds(): Set<string> {
  try {
    const storedIds = window.localStorage.getItem(CANDIDATE_UPVOTES_KEY)
    if (!storedIds) {
      return new Set()
    }

    const ids = JSON.parse(storedIds) as string[]
    return new Set(Array.isArray(ids) ? ids : [])
  } catch {
    return new Set()
  }
}

function saveUpvotedIds(ids: Set<string>) {
  window.localStorage.setItem(CANDIDATE_UPVOTES_KEY, JSON.stringify([...ids]))
}
</script>

<template>
  <main class="min-h-screen bg-stone-100 pb-20 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
    <header
      class="sticky top-0 z-30 border-b border-stone-200 bg-stone-100/92 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/88"
    >
      <div class="mx-auto max-w-5xl px-4 py-4">
        <div class="flex items-center justify-between gap-3">
          <button
            @click="goBack"
            class="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:focus-visible:ring-offset-zinc-950"
            aria-label="返回上一页"
          >
            <ArrowLeft :size="16" />
            <span>返回</span>
          </button>

          <div
            class="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/80"
          >
            <ClipboardList :size="16" class="text-orange-500" />
            <span class="text-sm font-semibold">候选名单</span>
          </div>
        </div>
      </div>
    </header>

    <section class="mx-auto max-w-5xl space-y-4 px-4 pt-4 md:pt-6">
      <div
        class="rounded-2xl border border-zinc-200 bg-white/90 p-4 dark:border-zinc-800 dark:bg-zinc-900/80 md:p-5"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h1 class="text-xl font-bold tracking-tight md:text-2xl">大家想让你吃哪家</h1>
            <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              候选名单独立于已吃过餐厅，按推荐数量实时排序。
            </p>
          </div>

          <button
            @click="openCreateForm"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:focus-visible:ring-offset-zinc-900"
          >
            <Plus :size="15" />
            <span>添加</span>
          </button>
        </div>

        <div class="mt-4 grid grid-cols-3 gap-2">
          <div class="rounded-xl bg-stone-50 px-3 py-2 dark:bg-zinc-950/60">
            <div class="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">候选餐厅</div>
            <div class="mt-1 text-lg font-bold">{{ candidates.length }}</div>
          </div>
          <div class="rounded-xl bg-stone-50 px-3 py-2 dark:bg-zinc-950/60">
            <div class="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">开放候选</div>
            <div class="mt-1 text-lg font-bold">{{ openCandidateCount }}</div>
          </div>
          <div class="rounded-xl bg-stone-50 px-3 py-2 dark:bg-zinc-950/60">
            <div class="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">总顶帖</div>
            <div class="mt-1 text-lg font-bold">{{ totalUpvotes }}</div>
          </div>
        </div>
      </div>

      <div
        v-if="loadError"
        class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300"
      >
        <div class="flex items-center justify-between gap-3">
          <span>{{ loadError }}</span>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold transition-colors hover:bg-rose-100 dark:hover:bg-rose-900/40"
            @click="loadCandidates"
          >
            <RefreshCw :size="14" />
            <span>重试</span>
          </button>
        </div>
      </div>

      <div
        v-if="isLoading"
        class="flex items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white/90 py-16 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400"
      >
        <LoaderCircle :size="18" class="animate-spin" />
        <span>正在加载候选名单...</span>
      </div>

      <div
        v-else-if="sortedCandidates.length === 0"
        class="rounded-2xl border border-zinc-200 bg-white/90 px-4 py-14 text-center dark:border-zinc-800 dark:bg-zinc-900/80"
      >
        <ClipboardList :size="28" class="mx-auto text-zinc-400" />
        <h2 class="mt-3 text-base font-bold">还没有候选餐厅</h2>
        <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">先让大家推荐第一家。</p>
        <button
          type="button"
          class="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-black dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          @click="openCreateForm"
        >
          <Plus :size="15" />
          <span>添加候选</span>
        </button>
      </div>

      <TransitionGroup
        v-else
        name="candidate-list"
        tag="div"
        class="candidate-list grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <article
          v-for="(candidate, index) in sortedCandidates"
          :key="candidate.id"
          class="group overflow-hidden rounded-xl border border-stone-200/70 bg-white transition-colors duration-200 hover:border-orange-200 hover:bg-orange-50/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-500/40 dark:hover:bg-zinc-900"
        >
          <RouterLink
            :to="`/candidates/${candidate.id}`"
            class="block cursor-pointer p-4 pb-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-inset"
            :aria-label="`查看${candidate.name}详情`"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-center gap-2">
                <span
                  class="inline-flex h-7 min-w-7 items-center justify-center rounded-lg bg-zinc-100 px-2 text-xs font-extrabold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  {{ index + 1 }}
                </span>
                <span
                  v-if="candidate.status !== 'open'"
                  class="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-700 dark:bg-orange-500/15 dark:text-orange-300"
                >
                  {{ candidate.status === 'picked' ? '已选中' : '已吃过' }}
                </span>
              </div>

              <div class="shrink-0 text-right">
                <div class="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">推荐</div>
                <div class="text-2xl font-black leading-none text-zinc-900 dark:text-zinc-50">
                  {{ candidate.upvotes }}
                </div>
              </div>
            </div>

            <h2 class="mt-4 line-clamp-2 min-h-10 text-base font-bold leading-tight">
              {{ candidate.name }}
            </h2>

            <div
              class="mt-2 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400"
            >
              <MapPin :size="14" />
              <span class="line-clamp-1">{{ getCandidateLocation(candidate) || '暂无位置' }}</span>
            </div>

            <div class="mt-4 flex min-h-8 flex-wrap items-center gap-1.5">
              <span
                v-if="candidate.price !== null"
                class="rounded-lg bg-zinc-100 px-2.5 py-1.5 text-sm font-extrabold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100"
              >
                ¥{{ candidate.price }}/人
              </span>
              <span
                v-for="tag in candidate.tags.slice(0, 2)"
                :key="tag"
                class="rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              >
                #{{ tag }}
              </span>
              <span
                v-if="candidate.tags.length > 2"
                class="rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              >
                +{{ candidate.tags.length - 2 }}
              </span>
            </div>
          </RouterLink>

          <div
            class="flex items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3 dark:border-zinc-800"
          >
            <RouterLink
              :to="`/candidates/${candidate.id}`"
              class="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-zinc-400 dark:hover:text-zinc-100"
              :aria-label="`查看${candidate.name}详情`"
            >
              <span>查看详情</span>
              <ArrowRight :size="14" />
            </RouterLink>

            <button
              @click="handleUpvote(candidate)"
              class="inline-flex min-h-11 min-w-[5.25rem] items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-3 text-sm font-bold text-white transition-colors hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
              :disabled="upvotedIds.has(candidate.id) || upvotingId === candidate.id"
              :aria-label="`推荐${candidate.name}`"
            >
              <LoaderCircle v-if="upvotingId === candidate.id" :size="14" class="animate-spin" />
              <ArrowUp v-else :size="14" />
              <span>{{ upvotedIds.has(candidate.id) ? '已顶' : '顶帖' }}</span>
            </button>
          </div>
        </article>
      </TransitionGroup>
    </section>

    <Teleport to="body">
      <Transition name="candidate-modal">
        <div
          v-if="showForm"
          class="fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/24 px-3 pb-3 pt-16 backdrop-blur-[1px] dark:bg-black/40 md:items-center md:p-4"
          @click.self="closeForm"
        >
          <form
            class="candidate-form-panel max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 md:p-5"
            novalidate
            @submit.prevent="submitForm"
          >
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-lg font-bold">添加候选</h2>
              <button
                type="button"
                class="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="关闭"
                @click="closeForm"
              >
                <X :size="18" />
              </button>
            </div>

            <div class="mt-4 grid grid-cols-1 gap-3">
              <label class="candidate-field">
                <span>店名 <strong>[必填]</strong></span>
                <input
                  v-model="form.name"
                  maxlength="80"
                  required
                  placeholder="请尽量填写完整店名"
                />
              </label>

              <label class="candidate-field">
                <span>城市/地址 <em>[选填]</em></span>
                <input v-model="form.location" maxlength="160" placeholder="大致位置即可" />
              </label>

              <div class="grid grid-cols-2 gap-3">
                <label class="candidate-field">
                  <span>人均 <em>[选填]</em></span>
                  <input
                    v-model="form.price"
                    type="text"
                    inputmode="numeric"
                    placeholder="60"
                  />
                </label>
                <label class="candidate-field">
                  <span>标签 <em>[选填]</em></span>
                  <input v-model="form.tags" maxlength="120" placeholder="火锅·烤肉·漂亮饭" />
                </label>
              </div>

              <label class="candidate-field">
                <span>推荐理由 <strong>[必填]</strong></span>
                <textarea
                  v-model="form.reason"
                  maxlength="500"
                  rows="4"
                  required
                  placeholder="为什么推荐去吃......"
                ></textarea>
              </label>

              <label class="candidate-field">
                <span>推荐人 <em>[选填]</em></span>
                <input v-model="form.submitter" maxlength="40" placeholder="可选昵称" />
              </label>
            </div>

            <p v-if="saveError" class="mt-3 text-sm text-rose-600 dark:text-rose-400">
              {{ saveError }}
            </p>

            <div class="mt-5 flex justify-end gap-2">
              <button
                type="button"
                class="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                @click="closeForm"
              >
                取消
              </button>
              <button
                type="submit"
                class="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-zinc-300 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
                :disabled="isSaving"
              >
                <LoaderCircle v-if="isSaving" :size="15" class="animate-spin" />
                <span>{{ isSaving ? '保存中' : '保存' }}</span>
              </button>
            </div>
          </form>
        </div>
      </Transition>
    </Teleport>
  </main>
</template>

<style scoped>
.candidate-list {
  position: relative;
}

.candidate-list-move,
.candidate-list-enter-active,
.candidate-list-leave-active {
  transition:
    transform 520ms cubic-bezier(0.22, 1, 0.36, 1),
    opacity 220ms ease;
}

.candidate-list-enter-from,
.candidate-list-leave-to,
.candidate-modal-enter-from,
.candidate-modal-leave-to {
  opacity: 0;
}

.candidate-list-enter-from,
.candidate-list-leave-to {
  transform: translateY(10px) scale(0.98);
}

.candidate-list-leave-active {
  position: absolute;
  left: 0;
  right: 0;
  width: 100%;
}

.candidate-modal-enter-active,
.candidate-modal-leave-active {
  transition: opacity 180ms ease;
}

.candidate-modal-enter-from .candidate-form-panel,
.candidate-modal-leave-to .candidate-form-panel {
  transform: translateY(12px) scale(0.98);
}

.candidate-form-panel {
  transition: transform 220ms cubic-bezier(0.22, 1, 0.36, 1);
}

.candidate-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgb(82 82 91);
}

.candidate-field strong {
  color: rgb(24 24 27);
  font-style: normal;
  font-weight: 800;
}

.candidate-field em {
  color: rgb(113 113 122);
  font-style: normal;
  font-weight: 700;
}

.dark .candidate-field {
  color: rgb(161 161 170);
}

.dark .candidate-field strong {
  color: rgb(244 244 245);
}

.dark .candidate-field em {
  color: rgb(161 161 170);
}

.candidate-field input,
.candidate-field textarea {
  width: 100%;
  border-radius: 0.75rem;
  border: 1px solid rgb(228 228 231);
  background: rgb(250 250 250);
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgb(24 24 27);
  outline: none;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
}

.candidate-field textarea {
  resize: vertical;
}

.candidate-field input:focus,
.candidate-field textarea:focus {
  border-color: rgb(249 115 22);
  background: rgb(255 255 255);
  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.16);
}

.dark .candidate-field input,
.dark .candidate-field textarea {
  border-color: rgb(63 63 70);
  background: rgb(39 39 42);
  color: rgb(244 244 245);
}

.dark .candidate-field input:focus,
.dark .candidate-field textarea:focus {
  border-color: rgb(251 146 60);
  background: rgb(24 24 27);
}

@media (prefers-reduced-motion: reduce) {
  .candidate-list-move,
  .candidate-list-enter-active,
  .candidate-list-leave-active,
  .candidate-modal-enter-active,
  .candidate-modal-leave-active,
  .candidate-form-panel,
  button {
    transition: none;
  }
}
</style>

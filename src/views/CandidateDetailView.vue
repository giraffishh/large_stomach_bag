<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ArrowLeft,
  ArrowUp,
  CalendarClock,
  LoaderCircle,
  MapPin,
  Pencil,
  RefreshCw,
  Tag,
  Trash2,
  UserRound,
  X,
} from 'lucide-vue-next'
import {
  deleteCandidate,
  fetchCandidates,
  updateCandidate,
  upvoteCandidate,
} from '@/services/candidates'
import CandidateComments from '@/components/CandidateComments.vue'
import type { Candidate, CandidateInput } from '@/types/candidate'
import { loadCandidateUpvotedIds, saveCandidateUpvotedIds } from '@/utils/candidateUpvotes'

const route = useRoute()
const router = useRouter()
const candidate = ref<Candidate | null>(null)
const isLoading = ref(false)
const loadError = ref('')
const saveError = ref('')
const isSaving = ref(false)
const isEditing = ref(false)
const upvotingId = ref('')
const isDeleting = ref(false)
const deleteConfirmArmed = ref(false)
let deleteConfirmTimer: ReturnType<typeof setTimeout> | null = null
const upvotedIds = ref<Set<string>>(loadCandidateUpvotedIds())

const form = reactive({
  name: '',
  location: '',
  price: '',
  tags: '',
  reason: '',
  submitter: '',
})

const candidateId = computed(() => {
  return typeof route.params.id === 'string' ? route.params.id : ''
})

const locationLabel = computed(() => {
  if (!candidate.value) {
    return ''
  }

  return [candidate.value.city, candidate.value.address].filter(Boolean).join(' · ')
})

const isUpvoted = computed(() => {
  return candidate.value ? upvotedIds.value.has(candidate.value.id) : false
})

onMounted(() => {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  void loadCandidate()
})

onBeforeUnmount(() => {
  clearDeleteConfirmTimer()
})

async function loadCandidate() {
  if (!candidateId.value) {
    loadError.value = '候选不存在。'
    return
  }

  isLoading.value = true
  loadError.value = ''

  try {
    const candidates = await fetchCandidates()
    const matchedCandidate = candidates.find((item) => item.id === candidateId.value)

    if (!matchedCandidate) {
      loadError.value = '这个候选可能已经被删除。'
      candidate.value = null
      return
    }

    candidate.value = matchedCandidate
    fillForm(matchedCandidate)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '候选详情加载失败。'
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  router.replace('/candidates')
}

const startEditing = () => {
  if (!candidate.value) {
    return
  }

  resetDeleteConfirm()
  fillForm(candidate.value)
  saveError.value = ''
  isEditing.value = true
}

const cancelEditing = () => {
  if (isSaving.value) {
    return
  }

  resetDeleteConfirm()
  if (candidate.value) {
    fillForm(candidate.value)
  }

  saveError.value = ''
  isEditing.value = false
}

async function submitForm() {
  if (!candidate.value) {
    return
  }

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
    const updatedCandidate = await updateCandidate(candidate.value.id, payload)
    candidate.value = updatedCandidate
    fillForm(updatedCandidate)
    resetDeleteConfirm()
    isEditing.value = false
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : '保存候选失败。'
  } finally {
    isSaving.value = false
  }
}

async function handleUpvote() {
  if (!candidate.value || isUpvoted.value || upvotingId.value || isDeleting.value) {
    return
  }

  const previousCandidate = candidate.value
  upvotingId.value = candidate.value.id
  candidate.value = {
    ...candidate.value,
    upvotes: candidate.value.upvotes + 1,
    updatedAt: new Date().toISOString(),
  }

  try {
    const updatedCandidate = await upvoteCandidate(previousCandidate.id)
    candidate.value = updatedCandidate
    upvotedIds.value = new Set([...upvotedIds.value, previousCandidate.id])
    saveCandidateUpvotedIds(upvotedIds.value)
  } catch (error) {
    candidate.value = previousCandidate
    loadError.value = error instanceof Error ? error.message : '顶帖失败，请稍后重试。'
  } finally {
    upvotingId.value = ''
  }
}

async function handleDelete() {
  if (!candidate.value || isDeleting.value || isSaving.value) {
    return
  }

  if (!deleteConfirmArmed.value) {
    armDeleteConfirm()
    return
  }

  isDeleting.value = true
  loadError.value = ''

  try {
    await deleteCandidate(candidate.value.id)
    await router.replace('/candidates')
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '删除候选失败，请稍后重试。'
  } finally {
    isDeleting.value = false
    resetDeleteConfirm()
  }
}

const fillForm = (target: Candidate) => {
  form.name = target.name
  form.location = [target.city, target.address].filter(Boolean).join(' · ')
  form.price = target.price === null ? '' : String(target.price)
  form.tags = target.tags.join('，')
  form.reason = target.reason
  form.submitter = target.submitter
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

const formatDate = (value: string) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function armDeleteConfirm() {
  deleteConfirmArmed.value = true
  clearDeleteConfirmTimer()
  deleteConfirmTimer = setTimeout(() => {
    deleteConfirmArmed.value = false
    deleteConfirmTimer = null
  }, 3500)
}

function resetDeleteConfirm() {
  deleteConfirmArmed.value = false
  clearDeleteConfirmTimer()
}

function clearDeleteConfirmTimer() {
  if (!deleteConfirmTimer) {
    return
  }

  clearTimeout(deleteConfirmTimer)
  deleteConfirmTimer = null
}
</script>

<template>
  <main class="min-h-screen bg-stone-100 pb-20 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
    <header
      class="sticky top-0 z-30 border-b border-stone-200 bg-stone-100/92 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/88"
    >
      <div class="mx-auto max-w-4xl px-4 pt-3 pb-2 md:pt-3 md:pb-3">
        <div class="flex items-center justify-between gap-3">
          <button
            @click="goBack"
            class="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:focus-visible:ring-offset-zinc-950"
            aria-label="返回候选名单"
          >
            <ArrowLeft :size="16" />
            <span>返回</span>
          </button>

          <button
            v-if="candidate && !isEditing"
            type="button"
            class="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 dark:focus-visible:ring-offset-zinc-950"
            @click="startEditing"
          >
            <Pencil :size="16" :stroke-width="2.75" />
            <span>编辑</span>
          </button>
        </div>
      </div>
    </header>

    <section class="mx-auto max-w-4xl space-y-4 px-4 pt-3 md:pt-3">
      <div
        v-if="loadError"
        class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300"
      >
        <div class="flex items-center justify-between gap-3">
          <span>{{ loadError }}</span>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-semibold transition-colors hover:bg-rose-100 dark:hover:bg-rose-900/40"
            @click="loadCandidate"
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
        <span>正在加载候选详情...</span>
      </div>

      <div
        v-else-if="candidate"
        class="space-y-4"
      >
        <form
          v-if="isEditing"
          class="rounded-2xl border border-zinc-200 bg-white/90 p-4 dark:border-zinc-800 dark:bg-zinc-900/80 md:p-5"
          novalidate
          @submit.prevent="submitForm"
        >
          <div class="flex items-center justify-between gap-3">
            <h1 class="text-xl font-bold tracking-tight md:text-2xl">编辑候选</h1>
            <button
              type="button"
              class="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="取消编辑"
              @click="cancelEditing"
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
                placeholder="完整店名"
              />
            </label>

            <label class="candidate-field">
              <span>城市/地址 <em>[选填]</em></span>
              <input v-model="form.location" maxlength="160" placeholder="大致位置" />
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
                <input v-model="form.tags" maxlength="120" placeholder="火锅 · 烤肉 · 漂亮饭" />
              </label>
            </div>

            <label class="candidate-field">
              <span>推荐理由 <strong>[必填]</strong></span>
              <textarea
                v-model="form.reason"
                maxlength="500"
                rows="5"
                required
                placeholder="出品 · 环境 · 服务 · 价格..."
              ></textarea>
            </label>

            <label class="candidate-field">
              <span>推荐人 <em>[选填]</em></span>
              <input v-model="form.submitter" maxlength="40" placeholder="昵称 / 联系方式" />
            </label>
          </div>

          <p v-if="saveError" class="mt-3 text-sm text-rose-600 dark:text-rose-400">
            {{ saveError }}
          </p>

          <div class="mt-5 flex justify-between gap-2">
            <button
              type="button"
              class="inline-flex min-h-10 cursor-pointer items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
              :class="
                deleteConfirmArmed
                  ? 'border-rose-500 bg-rose-600 text-white hover:bg-rose-700 dark:border-rose-400 dark:bg-rose-500 dark:text-white dark:hover:bg-rose-400'
                  : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-900/50'
              "
              :disabled="isDeleting"
              @click="handleDelete"
            >
              <LoaderCircle v-if="isDeleting" :size="15" class="animate-spin" />
              <Trash2 v-else :size="15" />
              <span>{{ isDeleting ? '删除中' : deleteConfirmArmed ? '确认删除' : '删除' }}</span>
            </button>

            <div class="flex gap-2">
              <button
                type="button"
                class="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                @click="cancelEditing"
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
          </div>
        </form>

        <template v-else>
          <div
            class="rounded-2xl border border-zinc-200 bg-white/90 p-4 dark:border-zinc-800 dark:bg-zinc-900/80 md:p-5"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <h1 class="text-2xl font-bold leading-tight tracking-tight md:text-3xl">
                  {{ candidate.name }}
                </h1>
                <div
                  class="mt-3 flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400"
                >
                  <MapPin :size="15" />
                  <span>{{ locationLabel || '暂无位置' }}</span>
                </div>
              </div>

              <div
                class="shrink-0 rounded-2xl bg-stone-50 px-4 py-3 text-right dark:bg-zinc-950/60"
              >
                <div class="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">推荐指数</div>
                <div class="mt-1 text-3xl font-bold">{{ candidate.upvotes }}</div>
              </div>
            </div>

            <div class="mt-5 flex flex-wrap items-center gap-2">
              <span
                v-if="candidate.price !== null"
                class="rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
              >
                ¥{{ candidate.price }}/人
              </span>
              <span
                v-for="tag in candidate.tags"
                :key="tag"
                class="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              >
                <Tag :size="12" />
                <span>{{ tag }}</span>
              </span>
              <span
                v-if="candidate.submitter"
                class="inline-flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
              >
                <UserRound :size="12" />
                <span>{{ candidate.submitter }} 推荐</span>
              </span>
            </div>

            <div class="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800">
              <h2 class="text-sm font-bold text-zinc-500 dark:text-zinc-400">推荐理由</h2>
              <p class="mt-2 whitespace-pre-wrap text-base leading-7 text-zinc-800 dark:text-zinc-200">
                {{ candidate.reason }}
              </p>
            </div>

            <div
              class="mt-6 flex flex-col gap-3 border-t border-zinc-100 pt-5 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                <CalendarClock :size="14" />
                <span>更新于 {{ formatDate(candidate.updatedAt) }}</span>
              </div>

              <button
                type="button"
                class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-black active:scale-95 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
                :disabled="isUpvoted || upvotingId === candidate.id"
                @click="handleUpvote"
              >
                <LoaderCircle v-if="upvotingId === candidate.id" :size="15" class="animate-spin" />
                <ArrowUp v-else :size="15" />
                <span>{{ isUpvoted ? '已推荐' : '推荐一下' }}</span>
              </button>
            </div>
          </div>

          <CandidateComments :candidate-id="candidate.id" />
        </template>
      </div>
    </section>
  </main>
</template>

<style scoped>
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
  button,
  input,
  textarea {
    transition: none;
  }
}
</style>


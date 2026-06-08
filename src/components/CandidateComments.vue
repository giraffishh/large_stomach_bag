<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { LoaderCircle, MessageCircle, RefreshCw, Send, Trash2 } from 'lucide-vue-next'
import {
  createCandidateComment,
  deleteCandidateComment,
  fetchCandidateComments,
} from '@/services/candidates'
import type { CandidateComment } from '@/types/candidate'

const props = defineProps<{
  candidateId: string
}>()

const comments = ref<CandidateComment[]>([])
const isLoading = ref(false)
const isSubmitting = ref(false)
const deletingId = ref('')
const loadError = ref('')
const formError = ref('')

const form = reactive({
  author: '',
  content: '',
})

onMounted(() => {
  void loadComments()
})

async function loadComments() {
  if (!props.candidateId) {
    return
  }

  isLoading.value = true
  loadError.value = ''

  try {
    comments.value = await fetchCandidateComments(props.candidateId)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '评论加载失败。'
  } finally {
    isLoading.value = false
  }
}

async function submitComment() {
  const content = form.content.trim()

  formError.value = ''

  if (content.length < 2) {
    formError.value = '评论至少需要 2 个字。'
    return
  }

  isSubmitting.value = true

  try {
    const savedComment = await createCandidateComment(props.candidateId, {
      author: form.author.trim(),
      content,
    })
    comments.value = [savedComment, ...comments.value]
    form.content = ''
  } catch (error) {
    formError.value = error instanceof Error ? error.message : '评论发送失败。'
  } finally {
    isSubmitting.value = false
  }
}

async function deleteComment(comment: CandidateComment) {
  if (deletingId.value) {
    return
  }

  deletingId.value = comment.id
  loadError.value = ''

  try {
    await deleteCandidateComment(props.candidateId, comment.id)
    comments.value = comments.value.filter((item) => item.id !== comment.id)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '评论删除失败。'
  } finally {
    deletingId.value = ''
  }
}

function formatDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
</script>

<template>
  <section
    class="rounded-2xl border border-zinc-200 bg-white/90 p-4 dark:border-zinc-800 dark:bg-zinc-900/80 md:p-5"
  >
    <div class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <MessageCircle :size="18" />
        <h2 class="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          评论区
        </h2>
        <span class="text-xs font-semibold text-zinc-400">{{ comments.length }}</span>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-500 transition-colors hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        :disabled="isLoading"
        @click="loadComments"
      >
        <RefreshCw :size="13" :class="{ 'animate-spin': isLoading }" />
        <span>刷新</span>
      </button>
    </div>

    <form class="mt-4 grid gap-3" novalidate @submit.prevent="submitComment">
      <input
        v-model="form.author"
        maxlength="40"
        class="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-orange-400 dark:focus:bg-zinc-950"
        placeholder="昵称 [选填]"
      />
      <textarea
        v-model="form.content"
        maxlength="500"
        rows="4"
        required
        class="resize-y rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium leading-6 text-zinc-900 outline-none transition focus:border-orange-500 focus:bg-white focus:ring-2 focus:ring-orange-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-orange-400 dark:focus:bg-zinc-950"
        placeholder="补充看法、约饭建议、避雷信息..."
      ></textarea>

      <div class="flex items-center justify-between gap-3">
        <p class="text-xs text-zinc-400">{{ form.content.length }}/500</p>
        <button
          type="submit"
          class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
          :disabled="isSubmitting"
        >
          <LoaderCircle v-if="isSubmitting" :size="15" class="animate-spin" />
          <Send v-else :size="15" />
          <span>{{ isSubmitting ? '发送中' : '发送' }}</span>
        </button>
      </div>

      <p v-if="formError" class="text-sm text-rose-600 dark:text-rose-400">
        {{ formError }}
      </p>
    </form>

    <div v-if="loadError" class="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-300">
      {{ loadError }}
    </div>

    <div
      v-if="isLoading && comments.length === 0"
      class="mt-5 flex items-center justify-center gap-2 rounded-xl border border-zinc-100 py-8 text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
    >
      <LoaderCircle :size="16" class="animate-spin" />
      <span>正在加载评论...</span>
    </div>

    <div
      v-else-if="comments.length === 0"
      class="mt-5 rounded-xl border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400"
    >
      暂时还没有评论。
    </div>

    <div v-else class="mt-5 space-y-3">
      <article
        v-for="comment in comments"
        :key="comment.id"
        class="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 dark:border-zinc-800 dark:bg-zinc-950/40"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {{ comment.author || '匿名' }}
            </div>
            <div class="mt-0.5 text-xs text-zinc-400">
              {{ formatDate(comment.createdAt) }}
            </div>
          </div>

          <button
            type="button"
            class="shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
            :disabled="deletingId === comment.id"
            aria-label="删除评论"
            @click="deleteComment(comment)"
          >
            <LoaderCircle v-if="deletingId === comment.id" :size="15" class="animate-spin" />
            <Trash2 v-else :size="15" />
          </button>
        </div>

        <p class="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">
          {{ comment.content }}
        </p>
      </article>
    </div>
  </section>
</template>

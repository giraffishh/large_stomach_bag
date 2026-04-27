<script setup lang="ts">
import { X } from 'lucide-vue-next'
import { useRestaurantFilters } from '@/composables/useRestaurantFilters'

const { allSelectedFilters, removeFilter } = useRestaurantFilters()
</script>

<template>
  <div class="flex items-center gap-2 overflow-x-auto no-scrollbar ml-2 mask-linear-fade grow">
    <div
      v-for="(filter, idx) in allSelectedFilters.slice(0, 2)"
      :key="idx"
      class="flex items-center gap-1 px-2 py-1 rounded-md text-xs whitespace-nowrap border shrink-0 bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300"
    >
      <span>{{ filter.label }}</span>
      <button @click="removeFilter(filter)" class="hover:text-red-500">
        <X :size="12" />
      </button>
    </div>
    <div
      v-if="allSelectedFilters.length > 2"
      class="px-2 py-1 rounded-md bg-zinc-100/50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 text-xs text-zinc-400 whitespace-nowrap"
    >
      ...
    </div>
  </div>
</template>

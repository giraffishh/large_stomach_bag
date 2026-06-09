<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { Search } from 'lucide-vue-next'
import { useRestaurantStore } from '@/stores/restaurants'

const store = useRestaurantStore()
const { searchQuery } = storeToRefs(store)
</script>

<template>
  <div class="relative group grow">
    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <Search class="h-5 w-5 text-zinc-400 group-focus-within:text-indigo-500 transition-colors" />
    </div>
    <input
      v-model="searchQuery"
      type="text"
      class="block w-full pl-9 pr-3 py-2 md:pl-10 md:pr-3 border border-zinc-200 dark:border-zinc-700 rounded-xl leading-5 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs md:text-sm"
      placeholder="搜索餐厅、评价、地址..."
    />
  </div>
</template>

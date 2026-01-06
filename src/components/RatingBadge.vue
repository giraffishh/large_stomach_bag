<script setup lang="ts">
import { computed } from 'vue'
import { BadgeCheck, BadgeAlert, BadgeX, Gem } from 'lucide-vue-next'

const props = defineProps<{
  rating: string
}>()

const config = computed(() => {
  switch (props.rating) {
    case '夯':
      return { icon: Gem, color: 'text-yellow-500', bg: 'bg-yellow-500/10', text: '夯' }
    case '人上人':
      return { icon: BadgeCheck, color: 'text-purple-500', bg: 'bg-purple-500/10', text: '人上人' }
    case 'npc':
      return { icon: BadgeAlert, color: 'text-blue-500', bg: 'bg-blue-500/10', text: 'NPC' }
    case '拉完了':
      return { icon: BadgeX, color: 'text-green-500', bg: 'bg-green-500/10', text: '拉完了' }
    default:
      return { icon: BadgeAlert, color: 'text-gray-400', bg: 'bg-gray-400/10', text: props.rating }
  }
})
</script>

<template>
  <div
    class="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium w-fit"
    :class="[config.color, config.bg]"
  >
    <component :is="config.icon" :size="20" />
    <span>{{ config.text }}</span>
  </div>
</template>

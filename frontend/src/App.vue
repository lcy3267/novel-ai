<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>

  <!-- Global Toast -->
  <div class="toast-wrap">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="toast"
      :class="{ 'toast-error': t.type === 'error' }"
    >{{ t.msg }}</div>
  </div>
</template>

<script setup>
import { ref, provide } from 'vue'

const toasts = ref([])
let tid = 0

function showToast(msg, type = 'default', duration = 2400) {
  const id = ++tid
  toasts.value.push({ id, msg, type })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, duration)
}

provide('toast', showToast)
</script>

<script setup>
/**
 * AlertBanner — displays success or error alert messages.
 * Props:
 *   type    — 'error' | 'success'
 *   message — the message string
 */
defineProps({
  type:    { type: String, default: 'error' },   // 'error' | 'success'
  message: { type: String, default: '' },
})

const config = {
  error:   { bg: 'bg-error-container',       text: 'text-on-error-container', icon: 'error' },
  success: { bg: 'bg-primary-fixed',         text: 'text-on-primary-fixed',   icon: 'check_circle' },
}
</script>

<template>
  <div
    v-if="message"
    role="alert"
    :class="[config[type].bg, config[type].text, 'p-sm rounded-lg font-sans text-body-md flex items-center gap-xs']"
  >
    <span class="material-symbols-outlined text-[20px]">{{ config[type].icon }}</span>
    {{ message }}
  </div>
</template>

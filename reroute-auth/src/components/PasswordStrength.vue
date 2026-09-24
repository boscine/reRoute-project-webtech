<script setup>
/**
 * PasswordStrength — displays a visual strength meter for a password.
 * Strength levels: empty → weak → fair → good → strong
 * Props:
 *   password — the password string to evaluate
 */
import { computed } from 'vue'

const props = defineProps({
  password: { type: String, default: '' },
})

const score = computed(() => {
  const p = props.password
  if (!p) return 0
  let s = 1
  if (p.length >= 8) s++
  if (/[A-Z]/.test(p) && /[0-9]/.test(p)) s++
  if (/[^A-Za-z0-9]/.test(p)) s++
  return Math.min(s, 4)
})

const labels  = ['', 'Weak', 'Fair', 'Good', 'Strong']
const colours = [
  '',
  'bg-red-500',
  'bg-yellow-400',
  'bg-blue-400',
  'bg-green-500',
]
const textColours = [
  '',
  'text-red-600',
  'text-yellow-600',
  'text-blue-600',
  'text-green-600',
]
</script>

<template>
  <div v-if="password.length > 0" class="mt-1 space-y-1">
    <!-- Bar segments -->
    <div class="flex gap-1">
      <div
        v-for="n in 4"
        :key="n"
        class="h-1 flex-1 rounded-full transition-all duration-300"
        :class="n <= score ? colours[score] : 'bg-surface-container-high'"
      />
    </div>
    <!-- Label -->
    <p class="text-label-sm font-sans" :class="textColours[score]">
      {{ labels[score] }} password
    </p>
  </div>
</template>

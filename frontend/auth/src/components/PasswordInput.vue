<script setup>
/**
 * PasswordInput — extends AppInput with a show/hide toggle button.
 * Uses a slot in AppInput's right side to render the eye icon.
 */
import { ref, computed } from 'vue'
import AppInput from './AppInput.vue'

const props = defineProps({
  modelValue:  { type: String,  default: '' },
  id:          { type: String,  required: true },
  label:       { type: String,  default: 'Password' },
  placeholder: { type: String,  default: '••••••••' },
  error:       { type: String,  default: '' },
  disabled:    { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])

const visible = ref(false)
const inputType = computed(() => visible.value ? 'text' : 'password')
const icon = computed(() => visible.value ? 'visibility_off' : 'visibility')
</script>

<template>
  <AppInput
    :id="id"
    :label="label"
    :type="inputType"
    :modelValue="modelValue"
    :placeholder="placeholder"
    :error="error"
    :disabled="disabled"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <template #right>
      <button
        type="button"
        @click="visible = !visible"
        class="text-on-surface-variant hover:text-on-surface transition-colors focus:outline-none"
        :aria-label="visible ? 'Hide password' : 'Show password'"
      >
        <span class="material-symbols-outlined" style="font-size:20px">{{ icon }}</span>
      </button>
    </template>
  </AppInput>
</template>

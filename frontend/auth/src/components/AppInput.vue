<script setup>
/**
 * AppInput — reusable form input with label, error display, and optional icon slot.
 * Props:
 *   modelValue  — v-model binding
 *   id          — input id (links label)
 *   label       — label text
 *   type        — input type (default: 'text')
 *   placeholder — placeholder text
 *   error       — validation error message
 *   disabled    — disabled state
 */
defineProps({
  modelValue:  { type: String,  default: '' },
  id:          { type: String,  required: true },
  label:       { type: String,  required: true },
  type:        { type: String,  default: 'text' },
  placeholder: { type: String,  default: '' },
  error:       { type: String,  default: '' },
  disabled:    { type: Boolean, default: false },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="flex flex-col gap-base">
    <label :for="id" class="form-label">{{ label }}</label>
    <div class="relative">
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :class="['input-base', error ? 'input-error' : '']"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <!-- Right-side slot (e.g. show/hide toggle) -->
      <div v-if="$slots.right" class="absolute right-3 top-1/2 -translate-y-1/2">
        <slot name="right" />
      </div>
    </div>
    <p v-if="error" class="field-error">{{ error }}</p>
  </div>
</template>

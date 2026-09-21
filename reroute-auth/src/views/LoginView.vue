<script setup>
/**
 * LoginView — Admin login page.
 * Features:
 *   - Email + password validation
 *   - Password show/hide toggle (via PasswordInput)
 *   - Loading state with spinner
 *   - Global error banner
 *   - Link to register page
 */
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import AppInput from '../components/AppInput.vue'
import PasswordInput from '../components/PasswordInput.vue'
import AlertBanner from '../components/AlertBanner.vue'

const router = useRouter()

const form = reactive({ email: '', password: '' })
const errors = reactive({ email: '', password: '' })
const globalError = ref('')
const isLoading = ref(false)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validate() {
  errors.email = ''
  errors.password = ''
  globalError.value = ''
  let ok = true

  if (!form.email.trim()) {
    errors.email = 'Email address is required.'
    ok = false
  } else if (!EMAIL_RE.test(form.email)) {
    errors.email = 'Please enter a valid email format.'
    ok = false
  }

  if (!form.password) {
    errors.password = 'Password is required.'
    ok = false
  }

  return ok
}

async function handleLogin() {
  if (!validate()) return

  isLoading.value = true
  try {
    const host = window.location.hostname || 'localhost'
    const res = await fetch(`http://${host}:3000/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email: form.email, password: form.password })
    })

    const data = await res.json()

    if (!res.ok) {
      globalError.value = data.error || 'The email or password you entered is incorrect.'
    } else {
      // Redirect to React dashboard on success
      window.location.href = `http://${host}:5174/`
    }
  } catch {
    globalError.value = 'Failed to reach campus auth server. Ensure backend is running on port 3000.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main class="bg-background text-on-surface antialiased min-h-screen flex items-center justify-center p-margin-mobile md:p-margin-desktop">
    <div class="w-full max-w-[440px]">

      <!-- Authentication Card -->
      <div class="auth-card">

        <!-- Branding -->
        <div class="flex flex-col items-center mb-10">
          <div class="h-12 w-12 bg-primary-container rounded-lg flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-on-primary" style="font-size:28px">router</span>
          </div>
          <h1 class="font-sans text-headline-md text-on-surface text-center mb-2">Admin Login</h1>
          <p class="font-sans text-label-md text-on-surface-variant text-center uppercase tracking-wider">ReRoute Campus Network</p>
        </div>

        <!-- Error Banner -->
        <AlertBanner type="error" :message="globalError" class="mb-4" />

        <!-- Login Form -->
        <form @submit.prevent="handleLogin" novalidate class="space-y-5">

          <AppInput
            id="email"
            label="Email"
            type="email"
            v-model="form.email"
            placeholder="admin@campus.edu"
            :error="errors.email"
            :disabled="isLoading"
          />

          <div class="space-y-1">
            <div class="flex items-center justify-between mb-base">
              <label class="form-label !mb-0" for="password">Password</label>
              <a href="#" class="font-sans text-label-md text-secondary hover:underline">Forgot?</a>
            </div>
            <PasswordInput
              id="password"
              label=""
              v-model="form.password"
              :error="errors.password"
              :disabled="isLoading"
            />
          </div>

          <!-- Submit -->
          <button type="submit" :disabled="isLoading" class="btn-primary mt-2">
            <span v-if="isLoading" class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            <span>{{ isLoading ? 'Signing in...' : 'Sign in' }}</span>
          </button>

        </form>
      </div>

      <!-- Footer -->
      <div class="mt-6 text-center">
        <p class="font-sans text-body-md text-on-surface-variant">
          Need admin access?
          <RouterLink to="/register" class="text-secondary font-semibold hover:underline focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 rounded">
            Register for an account
          </RouterLink>
        </p>
      </div>

    </div>
  </main>
</template>

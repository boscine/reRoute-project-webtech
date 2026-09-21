<script setup>
/**
 * RegisterView — Admin registration page.
 * Features:
 *   - Full Name, Email, Password, Confirm Password, Admin Invite Code
 *   - Password strength meter
 *   - Password show/hide toggles on both password fields
 *   - Field-level + global validation
 *   - Loading spinner
 *   - Success and error banners
 */
import { ref, reactive } from 'vue'
import AppInput from '../components/AppInput.vue'
import PasswordInput from '../components/PasswordInput.vue'
import PasswordStrength from '../components/PasswordStrength.vue'
import AlertBanner from '../components/AlertBanner.vue'

const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  inviteCode: '',
})

const errors = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  inviteCode: '',
})

const globalError   = ref('')
const successMsg    = ref('')
const isLoading     = ref(false)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clearErrors() {
  Object.keys(errors).forEach(k => (errors[k] = ''))
  globalError.value = ''
  successMsg.value  = ''
}

function validate() {
  clearErrors()
  let ok = true

  if (!form.name.trim()) {
    errors.name = 'Full name is required.'
    ok = false
  }

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
  } else if (form.password.length < 8) {
    errors.password = 'Password must be at least 8 characters.'
    ok = false
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.'
    ok = false
  } else if (form.password !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
    ok = false
  }

  if (!form.inviteCode.trim()) {
    errors.inviteCode = 'Admin invite code is required.'
    ok = false
  }

  return ok
}

async function handleSubmit() {
  if (!validate()) return

  isLoading.value = true
  try {
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
        inviteCode: form.inviteCode
      })
    })

    const data = await res.json()

    if (!res.ok) {
      if (data.error?.toLowerCase().includes('invite code')) {
        errors.inviteCode = data.error
      } else if (data.error?.toLowerCase().includes('email')) {
        errors.email = data.error
      } else {
        globalError.value = data.error || 'Registration failed. Please verify your details.'
      }
    } else {
      successMsg.value = 'Account created successfully! Redirecting to login...'
      setTimeout(() => {
        window.location.href = '/login'
      }, 1500)
    }
  } catch (err) {
    globalError.value = 'Failed to connect to auth server. Ensure backend is running.'
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
        <div class="flex flex-col items-center mb-8">
          <div class="h-12 w-12 bg-primary-container rounded-lg flex items-center justify-center mb-4">
            <span class="material-symbols-outlined text-on-primary" style="font-size:28px">manage_accounts</span>
          </div>
          <h1 class="font-sans text-headline-md text-on-surface text-center mb-1">Admin Registration</h1>
          <p class="font-sans text-label-md text-on-surface-variant text-center uppercase tracking-wider">ReRoute Campus Network</p>
        </div>

        <!-- Banners -->
        <AlertBanner type="error"   :message="globalError" class="mb-4" />
        <AlertBanner type="success" :message="successMsg"  class="mb-4" />

        <!-- Registration Form -->
        <form @submit.prevent="handleSubmit" novalidate class="space-y-4">

          <AppInput
            id="name"
            label="Full Name"
            type="text"
            v-model="form.name"
            placeholder="Jane Doe"
            :error="errors.name"
            :disabled="isLoading"
          />

          <AppInput
            id="email"
            label="Email Address"
            type="email"
            v-model="form.email"
            placeholder="jane@university.edu"
            :error="errors.email"
            :disabled="isLoading"
          />

          <div>
            <PasswordInput
              id="password"
              label="Password"
              v-model="form.password"
              :error="errors.password"
              :disabled="isLoading"
            />
            <!-- Strength meter sits directly below the password field -->
            <PasswordStrength :password="form.password" />
          </div>

          <PasswordInput
            id="confirmPassword"
            label="Confirm Password"
            v-model="form.confirmPassword"
            :error="errors.confirmPassword"
            :disabled="isLoading"
          />

          <AppInput
            id="inviteCode"
            label="Admin Invite Code"
            type="text"
            v-model="form.inviteCode"
            placeholder="CR-XXXX-XXXX"
            :error="errors.inviteCode"
            :disabled="isLoading"
          />

          <!-- Submit -->
          <button type="submit" :disabled="isLoading" class="btn-primary mt-2">
            <span v-if="isLoading" class="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
            <span>{{ isLoading ? 'Creating Account...' : 'Create Account' }}</span>
          </button>

        </form>
      </div>

      <!-- Footer -->
      <div class="mt-6 text-center">
        <p class="font-sans text-body-md text-on-surface-variant">
          Already have an account?
          <RouterLink to="/login" class="text-secondary font-semibold hover:underline focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 rounded">
            Sign in
          </RouterLink>
        </p>
      </div>

    </div>
  </main>
</template>

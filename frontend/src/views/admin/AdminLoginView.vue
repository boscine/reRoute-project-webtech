<template>
  <div class="login-container">
    <div class="login-box">
      <h2>ReRoute Admin</h2>
      <p class="subtitle">Sign in to manage campus locations and QR codes</p>

      <div v-if="error" class="error-banner">{{ error }}</div>

      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" v-model="email" placeholder="admin@reroute.campus" required />
        </div>

        <div class="form-group">
          <label>Password</label>
          <input type="password" v-model="password" placeholder="••••••••" required />
        </div>

        <button type="submit" :disabled="loading" class="btn-primary">
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>
      </form>

      <div class="back-link">
        <router-link to="/">← Back to Student View</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '../../services/api';

const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    const res = await api.post('/admin/login', {
      email: email.value,
      password: password.value,
    });
    localStorage.setItem('reroute_token', res.data.token);
    localStorage.setItem('reroute_user', JSON.stringify(res.data.user));
    router.push('/admin/dashboard');
  } catch (err) {
    error.value = err.response?.data?.error || 'Invalid credentials or connection error.';
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  padding: 1rem;
}

.login-box {
  background: #fff;
  padding: 2.5rem;
  border-radius: 12px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e2e8f0;
}

h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1.5rem;
}

.subtitle {
  color: #64748b;
  font-size: 0.9rem;
  margin-top: 0.25rem;
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: #334155;
  margin-bottom: 0.35rem;
}

input {
  width: 100%;
  padding: 0.65rem 0.85rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.95rem;
}

.btn-primary {
  width: 100%;
  background: #2563eb;
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 600;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.error-banner {
  background: #fee2e2;
  color: #b91c1c;
  padding: 0.65rem;
  border-radius: 6px;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.back-link {
  text-align: center;
  margin-top: 1.5rem;
}

.back-link a {
  color: #64748b;
  text-decoration: none;
  font-size: 0.85rem;
}

.back-link a:hover {
  text-decoration: underline;
}
</style>

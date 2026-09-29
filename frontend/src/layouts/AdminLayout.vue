<template>
  <div class="admin-shell">
    <aside class="sidebar">
      <div class="brand">
        <h2>Re<span>Route</span> Admin</h2>
      </div>

      <nav class="nav-menu">
        <router-link to="/admin/dashboard" class="nav-item">Dashboard</router-link>
        <div class="nav-label">CRUD Management</div>
        <router-link to="/admin/buildings" class="nav-item">Buildings</router-link>
        <router-link to="/admin/floors" class="nav-item">Floors</router-link>
        <router-link to="/admin/locations" class="nav-item">Locations</router-link>
        <router-link to="/admin/qr-codes" class="nav-item">QR Codes</router-link>
        <router-link to="/admin/scan-logs" class="nav-item">Scan Logs</router-link>
        <div class="nav-label">System</div>
        <router-link to="/admin/users" class="nav-item">Admin Users</router-link>
        <router-link to="/admin/reports" class="nav-item">Reports & Analytics</router-link>
        <router-link to="/admin/activity-logs" class="nav-item">Activity Logs</router-link>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">{{ user?.email }}</div>
        <button @click="logout" class="btn-logout">Log Out</button>
      </div>
    </aside>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const user = ref(null);

onMounted(() => {
  const stored = localStorage.getItem('reroute_user');
  if (stored) {
    user.value = JSON.parse(stored);
  }
});

function logout() {
  localStorage.removeItem('reroute_token');
  localStorage.removeItem('reroute_user');
  router.push('/admin/login');
}
</script>

<style scoped>
.admin-shell {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  width: 250px;
  background: #0f172a;
  color: #f8fafc;
  display: flex;
  flex-direction: column;
}

.brand {
  padding: 1.5rem;
  border-bottom: 1px solid #1e293b;
}

.brand h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.brand span {
  color: #3b82f6;
}

.nav-menu {
  flex: 1;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
}

.nav-label {
  padding: 0.75rem 1.5rem 0.25rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  font-weight: 700;
}

.nav-item {
  padding: 0.65rem 1.5rem;
  color: #cbd5e1;
  text-decoration: none;
  font-size: 0.9rem;
  transition: all 0.15s;
}

.nav-item:hover, .nav-item.router-link-active {
  background: #1e293b;
  color: #ffffff;
  border-left: 3px solid #3b82f6;
}

.sidebar-footer {
  padding: 1.25rem;
  border-top: 1px solid #1e293b;
}

.user-info {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-bottom: 0.5rem;
  word-break: break-all;
}

.btn-logout {
  width: 100%;
  background: transparent;
  border: 1px solid #334155;
  color: #cbd5e1;
  padding: 0.4rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.btn-logout:hover {
  background: #1e293b;
  color: #ef4444;
}

.main-content {
  flex: 1;
  background: #f8fafc;
  padding: 2rem;
  overflow-y: auto;
}
</style>

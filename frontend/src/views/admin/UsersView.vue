<template>
  <div class="crud-page">
    <div class="header-row">
      <div>
        <h2>User Management</h2>
        <p class="subtitle">Manage admin accounts (no public student registration).</p>
      </div>
      <button @click="showModal = true" class="btn-primary">+ Add Admin User</button>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Email</th>
          <th>Role</th>
          <th>Status</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="u in users" :key="u.id">
          <td>{{ u.id }}</td>
          <td><strong>{{ u.email }}</strong></td>
          <td>{{ u.role }}</td>
          <td>
            <span :class="['badge', u.isActive ? 'badge-success' : 'badge-danger']">
              {{ u.isActive ? 'Active' : 'Deactivated' }}
            </span>
          </td>
          <td>{{ new Date(u.createdAt).toLocaleDateString() }}</td>
          <td>
            <button @click="toggleActive(u)" class="btn-sm">
              {{ u.isActive ? 'Deactivate' : 'Activate' }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <h3>Create Admin Account</h3>
        <label>Email</label>
        <input v-model="form.email" type="email" placeholder="staff@reroute.campus" />
        <label>Password</label>
        <input v-model="form.password" type="password" placeholder="••••••••" />
        <label>Role</label>
        <select v-model="form.role">
          <option value="ADMIN">ADMIN</option>
          <option value="SUPERADMIN">SUPERADMIN</option>
        </select>
        <div class="modal-actions">
          <button @click="createUser" class="btn-primary">Create</button>
          <button @click="showModal = false" class="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../../services/api';

const users = ref([]);
const showModal = ref(false);
const form = ref({ email: '', password: '', role: 'ADMIN' });

async function loadUsers() {
  const res = await api.get('/admin/users');
  users.value = res.data;
}

async function createUser() {
  if (!form.value.email || !form.value.password) return;
  await api.post('/admin/users', form.value);
  showModal.value = false;
  form.value = { email: '', password: '', role: 'ADMIN' };
  loadUsers();
}

async function toggleActive(u) {
  if (confirm(`Are you sure you want to ${u.isActive ? 'deactivate' : 'activate'} ${u.email}?`)) {
    await api.patch(`/admin/users/${u.id}/toggle-active`);
    loadUsers();
  }
}

onMounted(loadUsers);
</script>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}
.subtitle {
  color: #64748b;
  margin: 0.25rem 0 0 0;
  font-size: 0.9rem;
}
.table {
  width: 100%;
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  border-collapse: collapse;
}
.table th, .table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}
.badge {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}
.badge-success { background: #dcfce7; color: #15803d; }
.badge-danger { background: #fee2e2; color: #b91c1c; }
.btn-primary {
  background: #2563eb;
  color: white;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
}
.btn-secondary {
  background: #e2e8f0;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
}
.btn-sm {
  padding: 0.25rem 0.6rem;
  border: 1px solid #cbd5e1;
  background: white;
  border-radius: 4px;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  width: 380px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.modal input, .modal select {
  padding: 0.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}
.modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1rem;
}
</style>

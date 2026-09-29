<template>
  <div class="crud-page">
    <div class="header-row">
      <h2>Buildings Management</h2>
      <button @click="openCreateModal" class="btn-primary">+ Add Building</button>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Building Name</th>
          <th>Floors Count</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="b in buildings" :key="b.id">
          <td>{{ b.id }}</td>
          <td><strong>{{ b.name }}</strong></td>
          <td>{{ b._count?.floors ?? 0 }}</td>
          <td>
            <button @click="editBuilding(b)" class="btn-sm">Edit</button>
            <button @click="deleteBuilding(b.id)" class="btn-sm btn-danger">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <h3>{{ editingId ? 'Edit Building' : 'New Building' }}</h3>
        <input v-model="formName" placeholder="Building Name (e.g. Science Complex)" />
        <div class="modal-actions">
          <button @click="saveBuilding" class="btn-primary">Save</button>
          <button @click="showModal = false" class="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../../services/api';

const buildings = ref([]);
const showModal = ref(false);
const editingId = ref(null);
const formName = ref('');

async function fetchBuildings() {
  const res = await api.get('/admin/buildings');
  buildings.value = res.data;
}

function openCreateModal() {
  editingId.value = null;
  formName.value = '';
  showModal.value = true;
}

function editBuilding(b) {
  editingId.value = b.id;
  formName.value = b.name;
  showModal.value = true;
}

async function saveBuilding() {
  if (!formName.value) return;
  if (editingId.value) {
    await api.put(`/admin/buildings/${editingId.value}`, { name: formName.value });
  } else {
    await api.post('/admin/buildings', { name: formName.value });
  }
  showModal.value = false;
  fetchBuildings();
}

async function deleteBuilding(id) {
  if (confirm('Delete this building? All connected floors and locations will be removed.')) {
    await api.delete(`/admin/buildings/${id}`);
    fetchBuildings();
  }
}

onMounted(fetchBuildings);
</script>

<style scoped>
.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
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
  margin-right: 0.4rem;
}

.btn-danger {
  color: #dc2626;
  border-color: #fecaca;
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
  width: 350px;
}

.modal input {
  width: 100%;
  padding: 0.6rem;
  margin: 1rem 0;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
</style>

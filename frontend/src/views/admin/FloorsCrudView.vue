<template>
  <div class="crud-page">
    <div class="header-row">
      <h2>Floors Management</h2>
      <button @click="openCreateModal" class="btn-primary">+ Add Floor</button>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Building</th>
          <th>Label</th>
          <th>Order</th>
          <th>Locations</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="f in floors" :key="f.id">
          <td>{{ f.id }}</td>
          <td>{{ f.building?.name }}</td>
          <td><strong>{{ f.label }}</strong></td>
          <td>{{ f.order }}</td>
          <td>{{ f._count?.locations ?? 0 }}</td>
          <td>
            <button @click="editFloor(f)" class="btn-sm">Edit</button>
            <button @click="deleteFloor(f.id)" class="btn-sm btn-danger">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <h3>{{ editingId ? 'Edit Floor' : 'New Floor' }}</h3>
        
        <label>Building</label>
        <select v-model="form.buildingId">
          <option v-for="b in buildings" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select>

        <label>Floor Label</label>
        <input v-model="form.label" placeholder="e.g. Ground Floor, Level 2" />

        <label>Order (1 = bottom/ground)</label>
        <input type="number" v-model.number="form.order" />

        <div class="modal-actions">
          <button @click="saveFloor" class="btn-primary">Save</button>
          <button @click="showModal = false" class="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../../services/api';

const floors = ref([]);
const buildings = ref([]);
const showModal = ref(false);
const editingId = ref(null);
const form = ref({ buildingId: null, label: '', order: 1 });

async function loadData() {
  const [fRes, bRes] = await Promise.all([
    api.get('/admin/floors'),
    api.get('/admin/buildings'),
  ]);
  floors.value = fRes.data;
  buildings.value = bRes.data;
}

function openCreateModal() {
  editingId.value = null;
  form.value = { buildingId: buildings.value[0]?.id || null, label: '', order: 1 };
  showModal.value = true;
}

function editFloor(f) {
  editingId.value = f.id;
  form.value = { buildingId: f.buildingId, label: f.label, order: f.order };
  showModal.value = true;
}

async function saveFloor() {
  if (!form.value.label || !form.value.buildingId) return;
  if (editingId.value) {
    await api.put(`/admin/floors/${editingId.value}`, form.value);
  } else {
    await api.post('/admin/floors', form.value);
  }
  showModal.value = false;
  loadData();
}

async function deleteFloor(id) {
  if (confirm('Delete this floor?')) {
    await api.delete(`/admin/floors/${id}`);
    loadData();
  }
}

onMounted(loadData);
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

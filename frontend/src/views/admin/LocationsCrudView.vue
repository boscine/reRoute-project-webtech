<template>
  <div class="crud-page">
    <div class="header-row">
      <h2>Locations (QR Targets)</h2>
      <button @click="openCreateModal" class="btn-primary">+ Add Location</button>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>QR Slug</th>
          <th>Building & Floor</th>
          <th>Scans Recorded</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="l in locations" :key="l.id">
          <td>{{ l.id }}</td>
          <td><code>{{ l.qrSlug }}</code></td>
          <td>{{ l.floor?.building?.name }} — {{ l.floor?.label }}</td>
          <td>{{ l._count?.scanLogs ?? 0 }}</td>
          <td>
            <button @click="editLocation(l)" class="btn-sm">Edit</button>
            <button @click="deleteLocation(l.id)" class="btn-sm btn-danger">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <h3>{{ editingId ? 'Edit Location' : 'New Location' }}</h3>

        <label>Assigned Floor</label>
        <select v-model="form.floorId">
          <option v-for="f in floors" :key="f.id" :value="f.id">
            {{ f.building?.name }} — {{ f.label }}
          </option>
        </select>

        <label>QR Slug (Unique identifier in ?loc=)</label>
        <input v-model="form.qrSlug" placeholder="e.g. sci-hall-f1" />

        <div class="modal-actions">
          <button @click="saveLocation" class="btn-primary">Save</button>
          <button @click="showModal = false" class="btn-secondary">Cancel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../../services/api';

const locations = ref([]);
const floors = ref([]);
const showModal = ref(false);
const editingId = ref(null);
const form = ref({ floorId: null, qrSlug: '' });

async function loadData() {
  const [lRes, fRes] = await Promise.all([
    api.get('/admin/locations'),
    api.get('/admin/floors'),
  ]);
  locations.value = lRes.data;
  floors.value = fRes.data;
}

function openCreateModal() {
  editingId.value = null;
  form.value = { floorId: floors.value[0]?.id || null, qrSlug: '' };
  showModal.value = true;
}

function editLocation(l) {
  editingId.value = l.id;
  form.value = { floorId: l.floorId, qrSlug: l.qrSlug };
  showModal.value = true;
}

async function saveLocation() {
  if (!form.value.qrSlug || !form.value.floorId) return;
  if (editingId.value) {
    await api.put(`/admin/locations/${editingId.value}`, form.value);
  } else {
    await api.post('/admin/locations', form.value);
  }
  showModal.value = false;
  loadData();
}

async function deleteLocation(id) {
  if (confirm('Delete this location?')) {
    await api.delete(`/admin/locations/${id}`);
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

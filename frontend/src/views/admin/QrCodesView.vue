<template>
  <div class="crud-page">
    <h2>QR Codes Management</h2>
    <p class="subtitle">Generate, preview, download high-res QR codes and reassign targets.</p>

    <div class="qr-grid">
      <div v-for="loc in locations" :key="loc.id" class="qr-card">
        <div class="qr-header">
          <strong>{{ loc.floor?.building?.name }}</strong>
          <span class="floor-badge">{{ loc.floor?.label }}</span>
        </div>
        <div class="qr-preview-box">
          <img v-if="qrImages[loc.qrSlug]" :src="qrImages[loc.qrSlug]" alt="QR Code" class="qr-img" />
          <div v-else class="qr-placeholder">Loading QR...</div>
        </div>
        <div class="qr-details">
          <code>?loc={{ loc.qrSlug }}</code>
        </div>
        <div class="qr-actions">
          <button @click="downloadQr(loc.qrSlug)" class="btn-sm btn-primary">Download Image</button>
          <button @click="openReassignModal(loc)" class="btn-sm">Reassign</button>
        </div>
      </div>
    </div>

    <!-- Reassign Modal -->
    <div v-if="showModal" class="modal-overlay">
      <div class="modal">
        <h3>Reassign Target Floor for '{{ targetLocation?.qrSlug }}'</h3>
        <label>Select New Floor</label>
        <select v-model="selectedFloorId">
          <option v-for="f in floors" :key="f.id" :value="f.id">
            {{ f.building?.name }} — {{ f.label }}
          </option>
        </select>
        <div class="modal-actions">
          <button @click="saveReassignment" class="btn-primary">Save Target</button>
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
const qrImages = ref({});
const showModal = ref(false);
const targetLocation = ref(null);
const selectedFloorId = ref(null);

async function loadData() {
  const [lRes, fRes] = await Promise.all([
    api.get('/admin/locations'),
    api.get('/admin/floors'),
  ]);
  locations.value = lRes.data;
  floors.value = fRes.data;

  // Load QR preview images
  for (const loc of locations.value) {
    try {
      const res = await api.get(`/admin/qr/image/${loc.qrSlug}`);
      qrImages.value[loc.qrSlug] = res.data.dataUrl;
    } catch (e) {
      console.error(e);
    }
  }
}

function downloadQr(slug) {
  const dataUrl = qrImages.value[slug];
  if (!dataUrl) return;
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `reroute-qr-${slug}.png`;
  link.click();
}

function openReassignModal(loc) {
  targetLocation.value = loc;
  selectedFloorId.value = loc.floorId;
  showModal.value = true;
}

async function saveReassignment() {
  if (!targetLocation.value || !selectedFloorId.value) return;
  await api.put(`/admin/locations/${targetLocation.value.id}`, {
    floorId: selectedFloorId.value,
  });
  showModal.value = false;
  loadData();
}

onMounted(loadData);
</script>

<style scoped>
.subtitle {
  color: #64748b;
  margin-top: -0.5rem;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.qr-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.25rem;
}

.qr-card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.qr-header {
  margin-bottom: 0.75rem;
  width: 100%;
}

.floor-badge {
  display: block;
  font-size: 0.8rem;
  color: #64748b;
}

.qr-preview-box {
  width: 160px;
  height: 160px;
  background: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  margin-bottom: 0.75rem;
}

.qr-img {
  width: 100%;
  height: 100%;
}

.qr-details {
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}

.qr-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-primary {
  background: #2563eb;
  color: white;
  padding: 0.4rem 0.75rem;
  border: none;
  border-radius: 4px;
}

.btn-secondary {
  background: #e2e8f0;
  padding: 0.4rem 0.75rem;
  border: none;
  border-radius: 4px;
}

.btn-sm {
  font-size: 0.8rem;
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
}

.modal select {
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

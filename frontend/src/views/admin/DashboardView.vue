<template>
  <div class="dashboard-page">
    <h1 class="page-title">Admin Dashboard</h1>

    <div class="stats-grid">
      <div class="stat-card">
        <span class="label">Buildings</span>
        <span class="value">{{ stats.buildings }}</span>
      </div>
      <div class="stat-card">
        <span class="label">Floors</span>
        <span class="value">{{ stats.floors }}</span>
      </div>
      <div class="stat-card">
        <span class="label">Locations</span>
        <span class="value">{{ stats.locations }}</span>
      </div>
      <div class="stat-card">
        <span class="label">Total Scans</span>
        <span class="value">{{ stats.totalScans }}</span>
      </div>
    </div>

    <div class="section-box">
      <h2>Recent Scan Activity</h2>
      <table class="table" v-if="recentScans.length">
        <thead>
          <tr>
            <th>Time</th>
            <th>QR Slug</th>
            <th>Resolved Building & Floor</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="scan in recentScans" :key="scan.id">
            <td>{{ formatDate(scan.createdAt) }}</td>
            <td><code>{{ scan.qrSlugRaw }}</code></td>
            <td>
              <span v-if="scan.location">
                {{ scan.location.floor.building.name }} — {{ scan.location.floor.label }}
              </span>
              <span v-else class="text-muted">Unresolved</span>
            </td>
            <td>
              <span :class="['badge', scan.resolved ? 'badge-success' : 'badge-danger']">
                {{ scan.resolved ? 'Resolved' : 'Failed' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state">No recent scans logged.</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../../services/api';

const stats = ref({ buildings: 0, floors: 0, locations: 0, totalScans: 0 });
const recentScans = ref([]);

async function fetchDashboard() {
  try {
    const res = await api.get('/admin/dashboard');
    stats.value = res.data.counts;
    recentScans.value = res.data.recentScans;
  } catch (err) {
    console.error(err);
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleString();
}

onMounted(fetchDashboard);
</script>

<style scoped>
.page-title {
  margin-top: 0;
  font-size: 1.75rem;
  color: #0f172a;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
}

.stat-card .label {
  font-size: 0.85rem;
  color: #64748b;
  text-transform: uppercase;
  font-weight: 600;
}

.stat-card .value {
  font-size: 2rem;
  font-weight: 700;
  color: #2563eb;
  margin-top: 0.5rem;
}

.section-box {
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 1.5rem;
}

.table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.table th, .table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.9rem;
}

.table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 600;
}

.badge {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-success {
  background: #dcfce7;
  color: #15803d;
}

.badge-danger {
  background: #fee2e2;
  color: #b91c1c;
}

.empty-state {
  padding: 2rem;
  text-align: center;
  color: #94a3b8;
}
</style>

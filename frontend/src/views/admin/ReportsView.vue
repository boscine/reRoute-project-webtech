<template>
  <div class="crud-page">
    <h2>Reports & Analytics</h2>
    <p class="subtitle">Scan distribution, popular locations, and traffic insights.</p>

    <div class="grid-2">
      <div class="card">
        <h3>Most-Scanned Locations</h3>
        <table class="table" v-if="topLocations.length">
          <thead>
            <tr>
              <th>Building</th>
              <th>Floor</th>
              <th>QR Slug</th>
              <th>Total Scans</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in topLocations" :key="item.locationId">
              <td><strong>{{ item.building }}</strong></td>
              <td>{{ item.floor }}</td>
              <td><code>{{ item.qrSlug }}</code></td>
              <td><span class="count-badge">{{ item.scanCount }}</span></td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty">No location scan stats available.</div>
      </div>

      <div class="card">
        <h3>Resolution Success Rate</h3>
        <div class="chart-summary">
          <div class="rate-circle">
            <span class="pct">{{ successRate }}%</span>
            <span class="pct-label">Resolved Scans</span>
          </div>
          <div class="summary-details">
            <p><strong>Total Scans Recorded:</strong> {{ timelineData.length }}</p>
            <p><strong>Resolved:</strong> {{ resolvedCount }}</p>
            <p><strong>Unresolved (Failed):</strong> {{ timelineData.length - resolvedCount }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../../services/api';

const topLocations = ref([]);
const timelineData = ref([]);

const resolvedCount = computed(() => timelineData.value.filter((x) => x.resolved).length);
const successRate = computed(() => {
  if (!timelineData.value.length) return 0;
  return Math.round((resolvedCount.value / timelineData.value.length) * 100);
});

async function loadReports() {
  const res = await api.get('/admin/reports');
  topLocations.value = res.data.topLocations;
  timelineData.value = res.data.timelineData;
}

onMounted(loadReports);
</script>

<style scoped>
.subtitle {
  color: #64748b;
  margin-top: -0.5rem;
  margin-bottom: 1.5rem;
}
.grid-2 {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: 1.5rem;
}
.card {
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 1.5rem;
}
.card h3 {
  margin-top: 0;
  margin-bottom: 1rem;
}
.table {
  width: 100%;
  border-collapse: collapse;
}
.table th, .table td {
  padding: 0.6rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.9rem;
}
.count-badge {
  background: #eff6ff;
  color: #2563eb;
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  font-weight: 700;
}
.chart-summary {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-top: 1.5rem;
}
.rate-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: #f1f5f9;
  border: 6px solid #2563eb;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.pct {
  font-size: 1.5rem;
  font-weight: 800;
  color: #1e293b;
}
.pct-label {
  font-size: 0.65rem;
  text-transform: uppercase;
  color: #64748b;
}
.summary-details p {
  margin: 0.4rem 0;
  font-size: 0.9rem;
}
.empty {
  color: #94a3b8;
  padding: 1rem 0;
}
</style>

<template>
  <div class="crud-page">
    <h2>Scan Logs (Audit Trail)</h2>
    <p class="subtitle">Complete chronological record of all student QR scans and lookups.</p>

    <table class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Timestamp</th>
          <th>Requested Param</th>
          <th>Resolved Target</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in logs" :key="log.id">
          <td>{{ log.id }}</td>
          <td>{{ new Date(log.createdAt).toLocaleString() }}</td>
          <td><code>{{ log.qrSlugRaw }}</code></td>
          <td>
            <span v-if="log.location">
              {{ log.location.floor?.building?.name }} — {{ log.location.floor?.label }}
            </span>
            <span v-else class="text-muted">Unresolved / Not found</span>
          </td>
          <td>
            <span :class="['badge', log.resolved ? 'badge-success' : 'badge-danger']">
              {{ log.resolved ? 'Resolved' : 'Failed' }}
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="pagination">
      <button :disabled="page <= 1" @click="changePage(page - 1)" class="btn-sm">Previous</button>
      <span>Page {{ page }} of {{ totalPages || 1 }}</span>
      <button :disabled="page >= totalPages" @click="changePage(page + 1)" class="btn-sm">Next</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../../services/api';

const logs = ref([]);
const page = ref(1);
const total = ref(0);
const limit = 25;
const totalPages = ref(1);

async function fetchLogs() {
  const res = await api.get(`/admin/scan-logs?page=${page.value}&limit=${limit}`);
  logs.value = res.data.data;
  total.value = res.data.total;
  totalPages.value = Math.ceil(total.value / limit);
}

function changePage(newPage) {
  page.value = newPage;
  fetchLogs();
}

onMounted(fetchLogs);
</script>

<style scoped>
.subtitle {
  color: #64748b;
  margin-top: -0.5rem;
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

.badge {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-success { background: #dcfce7; color: #15803d; }
.badge-danger { background: #fee2e2; color: #b91c1c; }
.text-muted { color: #94a3b8; }

.pagination {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  justify-content: flex-end;
}

.btn-sm {
  padding: 0.35rem 0.75rem;
  border: 1px solid #cbd5e1;
  background: white;
  border-radius: 4px;
}
</style>

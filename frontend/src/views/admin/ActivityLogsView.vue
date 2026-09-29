<template>
  <div class="crud-page">
    <h2>Activity Logs (Admin Audit Trail)</h2>
    <p class="subtitle">Detailed security log of staff/admin modifications across the platform.</p>

    <table class="table">
      <thead>
        <tr>
          <th>Timestamp</th>
          <th>Admin User</th>
          <th>Action</th>
          <th>Target</th>
          <th>Target ID</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in logs" :key="log.id">
          <td>{{ new Date(log.createdAt).toLocaleString() }}</td>
          <td><strong>{{ log.adminUser?.email || 'System' }}</strong></td>
          <td><span class="action-tag">{{ log.action }}</span></td>
          <td>{{ log.targetType }}</td>
          <td>{{ log.targetId || '-' }}</td>
          <td><code class="details-code">{{ log.details || '-' }}</code></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../../services/api';

const logs = ref([]);

async function loadLogs() {
  const res = await api.get('/admin/activity-logs');
  logs.value = res.data;
}

onMounted(loadLogs);
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
  font-size: 0.85rem;
}
.action-tag {
  background: #f1f5f9;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-weight: 600;
  color: #334155;
}
.details-code {
  font-size: 0.75rem;
  color: #475569;
  max-width: 250px;
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>

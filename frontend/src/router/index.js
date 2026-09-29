import { createRouter, createWebHistory } from 'vue-router';
import StudentLocatorView from '../views/student/StudentLocatorView.vue';
import AdminLoginView from '../views/admin/AdminLoginView.vue';
import AdminLayout from '../layouts/AdminLayout.vue';
import DashboardView from '../views/admin/DashboardView.vue';
import BuildingsCrudView from '../views/admin/BuildingsCrudView.vue';
import FloorsCrudView from '../views/admin/FloorsCrudView.vue';
import LocationsCrudView from '../views/admin/LocationsCrudView.vue';
import QrCodesView from '../views/admin/QrCodesView.vue';
import ScanLogsView from '../views/admin/ScanLogsView.vue';
import UsersView from '../views/admin/UsersView.vue';
import ReportsView from '../views/admin/ReportsView.vue';
import ActivityLogsView from '../views/admin/ActivityLogsView.vue';

const routes = [
  // Public Student Route
  {
    path: '/',
    name: 'StudentLocator',
    component: StudentLocatorView,
  },
  // Admin Login
  {
    path: '/admin/login',
    name: 'AdminLogin',
    component: AdminLoginView,
    meta: { guestOnly: true },
  },
  // Admin Protected Area
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', name: 'AdminDashboard', component: DashboardView },
      { path: 'buildings', name: 'AdminBuildings', component: BuildingsCrudView },
      { path: 'floors', name: 'AdminFloors', component: FloorsCrudView },
      { path: 'locations', name: 'AdminLocations', component: LocationsCrudView },
      { path: 'qr-codes', name: 'AdminQrCodes', component: QrCodesView },
      { path: 'scan-logs', name: 'AdminScanLogs', component: ScanLogsView },
      { path: 'users', name: 'AdminUsers', component: UsersView },
      { path: 'reports', name: 'AdminReports', component: ReportsView },
      { path: 'activity-logs', name: 'AdminActivityLogs', component: ActivityLogsView },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('reroute_token');
  if (to.meta.requiresAuth && !token) {
    return next({ name: 'AdminLogin' });
  }
  if (to.meta.guestOnly && token) {
    return next({ name: 'AdminDashboard' });
  }
  next();
});

export default router;

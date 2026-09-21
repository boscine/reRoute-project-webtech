import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import './style.css'
import App from './App.vue'
import LoginView from './views/LoginView.vue'
import RegisterView from './views/RegisterView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/',         redirect: '/login' },
    { path: '/login',    component: LoginView,    name: 'login' },
    { path: '/register', component: RegisterView, name: 'register' },
  ],
})

createApp(App).use(router).mount('#app')

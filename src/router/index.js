import { createRouter, createWebHistory } from 'vue-router'
import Generate from '@/views/Generate.vue'
import History from '@/views/History.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: Generate },
    { path: '/history', component: History },
  ],
})

export default router

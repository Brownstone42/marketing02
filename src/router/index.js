import { createRouter, createWebHistory } from 'vue-router'
import Generate from '@/views/Generate.vue'
import History from '@/views/History.vue'
import MarketingStudio from '@/views/MarketingStudio.vue'
import Combine from '@/views/Combine.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: Generate },
    { path: '/history', component: History },
    { path: '/studio', component: MarketingStudio },
    { path: '/combine', component: Combine },
  ],
})

export default router

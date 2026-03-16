import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth.js'

const routes = [
  { path: '/',         name: 'home',     component: () => import('@/views/HomeView.vue') },
  { path: '/login',    name: 'login',    component: () => import('@/views/LoginView.vue') },
  { path: '/register', name: 'register', component: () => import('@/views/RegisterView.vue') },
  {
    path: '/novels',
    name: 'novels',
    component: () => import('@/views/NovelListView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/studio/:id?',
    name: 'studio',
    component: () => import('@/views/StudioView.vue'),
    meta: { requiresAuth: true },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.user && auth.token) await auth.fetchMe()

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if ((to.name === 'login' || to.name === 'register') && auth.isLoggedIn) {
    return { name: 'novels' }
  }
})

export default router

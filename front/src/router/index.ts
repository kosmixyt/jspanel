import { createRouter, createWebHistory, type NavigationGuardNext, type RouteLocationNormalized, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '../stores'
import LoginView from '../views/LoginView.vue'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Domains',
    component: () => import('../views/DomainsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/mailboxes',
    name: 'Mailboxes',
    component: () => import('../views/MailboxesView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/ssl',
    name: 'SSL',
    component: () => import('../views/SslView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('../views/AboutView.vue'),
    meta: { requiresAuth: false }
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

// Navigation guard for authentication
router.beforeEach(
  async (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext
  ) => {
    const authStore = useAuthStore()

    // Check session only once
    if (!authStore.user && authStore.loading === false && to.meta.requiresAuth) {
      try {
        await authStore.checkSession()
      } catch (err) {
        console.error('Session check error:', err)
      }
    }

    // Prevent infinite redirect loop to login
    if (to.meta.requiresAuth && !authStore.isAuthenticated) {
      if (to.path !== '/login') {
        next('/login')
      } else {
        next()
      }
    } else {
      next()
    }
  }
)

export default router
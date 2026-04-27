import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'

let isBrowserHistoryNavigation = false

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    isBrowserHistoryNavigation = true
  })
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'cover',
      // 封面页懒加载，用户只在首次访问时进入
      component: () => import('../views/CoverView.vue'),
    },
    {
      path: '/home',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { transition: 'slide-up' },
    },
    {
      path: '/restaurant/:id',
      name: 'detail',
      component: () => import('../views/DetailView.vue'),
    },
  ],
})

// 全局前置守卫：确保新会话（关闭网页重开）必须先看封面
router.beforeEach((to, from, next) => {
  to.meta.resolvedTransition = resolveRouteTransition(to, from, isBrowserHistoryNavigation)
  isBrowserHistoryNavigation = false

  const hasVisited = sessionStorage.getItem('hasVisitedCover')

  // 如果去往非封面页，且未访问过封面
  if (to.path !== '/' && !hasVisited) {
    // 重定向到封面，并保留原目标路径
    next({
      path: '/',
      query: { redirect: to.fullPath },
    })
  } else {
    next()
  }
})

function resolveRouteTransition(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  isHistoryNavigation: boolean,
): string {
  if (isHistoryNavigation) {
    return 'none'
  }

  if (from.name === 'cover' && to.name === 'home') {
    return 'cover-to-home'
  }

  if (from.name === 'home' && to.name === 'detail') {
    return 'detail-forward'
  }

  if (from.name === 'detail' && to.name === 'home') {
    return 'detail-back'
  }

  return typeof to.meta.transition === 'string' ? to.meta.transition : 'fade'
}

export default router

import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

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
      component: HomeView,
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
  const hasVisited = sessionStorage.getItem('hasVisitedCover')

  // 如果去往非封面页，且未访问过封面
  if (to.path !== '/' && !hasVisited) {
    // 重定向到封面，并保留原目标路径
    next({
      path: '/',
      query: { redirect: to.fullPath }
    })
  } else {
    next()
  }
})

export default router

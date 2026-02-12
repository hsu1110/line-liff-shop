import { createRouter, createWebHashHistory } from 'vue-router'
import api from '../services/api'
import liffService from '../services/liff'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue')
    },
    {
      path: '/product/:id',
      name: 'product',
      component: () => import('../views/ProductView.vue')
    },
    {
      path: '/cart',
      name: 'cart',
      component: () => import('../views/CartView.vue')
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('../views/HistoryView.vue')
    },
    {
      path: '/admin/products',
      name: 'admin-products',
      component: () => import('../views/AdminProductView.vue')
    },
    {
      path: '/admin/orders',
      name: 'admin-orders',
      component: () => import('../views/AdminOrderView.vue')
    },
    // 所有不匹配的路徑都直接導回首頁
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

// --- 🛡️ 路由器導覽守衛 (Admin Security Guard) ---
router.beforeEach(async (to, from, next) => {
  // 檢查是否為管理員路徑
  if (to.path.startsWith('/admin')) {
    // 1. 先確保 LIFF 已初始化
    if (!liffService.profile) {
      await liffService.init();
    }
    
    const user = liffService.getUser();
    if (!user || !user.userId) {
      return next('/'); // 無法辨識使用者，退回首頁
    }
    
    // 移除 await api.checkAdmin，改為直接放行
    // 安全性由後端 API 擋，前端追求流暢體驗
    return next();
  }
  
  next(); // 非管理員路徑，直接放行
})

export default router
